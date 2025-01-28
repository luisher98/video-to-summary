import express, { NextFunction } from 'express';
import getVideoInfo from './routes/getVideoInfo.ts';
import getSummary from './routes/getSummary.ts';
import getSummarySSE from './routes/getSummarySSE.ts';
import getTranscript from './routes/getTranscript.ts';
import getTestSSE from './routes/getTestSSE.ts';
import { handleUncaughtErrors } from '../utils/errorHandling.ts';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Configuration constants
const CONFIG = {
    port: process.env.PORT || 5050,
    url: process.env.URL || 'http://localhost',
    rateLimit: {
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 10,
        message: 'Too many requests from this IP, please try again later'
    },
    queue: {
        maxConcurrentRequests: 2
    },
    exampleVideoId: 'N-ZNfuCdkUo' 
} as const;

// Types
interface QueueEntry {
    timestamp: number;
    ip: string;
}

interface ServerStatus {
    running: boolean;
    port: number;
    url: string;
    activeRequests: number;
    uptime: number;
}

// Server state
let serverInstance: ReturnType<typeof app.listen> | null = null;

// Initialize Express app
export const app = express();

// Configure rate limiting
const rateLimiter = rateLimit({
    windowMs: CONFIG.rateLimit.windowMs,
    max: CONFIG.rateLimit.maxRequests,
    message: CONFIG.rateLimit.message
});

app.use(rateLimiter);

// Request queue management
export const activeRequests = new Map<string, QueueEntry>();

/**
 * Get current server status
 */
export function getServerStatus(): ServerStatus {
    return {
        running: serverInstance !== null,
        port: Number(CONFIG.port),
        url: CONFIG.url,
        activeRequests: activeRequests.size,
        uptime: process.uptime()
    };
}

/**
 * Middleware to manage concurrent request queue
 */
const requestQueueMiddleware = async (
    req: express.Request, 
    res: express.Response, 
    next: NextFunction
): Promise<void> => {
    const requestId = uuidv4();
    
    if (activeRequests.size >= CONFIG.queue.maxConcurrentRequests) {
        res.status(503).json({
            error: 'Server is busy. Please try again later.'
        });
        return;
    }

    activeRequests.set(requestId, {
        timestamp: Date.now(),
        ip: req.ip || 'unknown'
    });

    res.once('finish', () => {
        activeRequests.delete(requestId);
    });

    next();
};

// API Routes
const apiRoutes = {
    info: '/api/info',
    summary: '/api/summary',
    summarySSE: '/api/summary-sse',
    transcript: '/api/transcript',
    testSSE: '/api/test-sse'
} as const;

// Configure routes
app.get(apiRoutes.info, getVideoInfo);
app.get(apiRoutes.summary, requestQueueMiddleware as express.RequestHandler, getSummary);
app.get(apiRoutes.summarySSE, requestQueueMiddleware as express.RequestHandler, getSummarySSE);
app.get(apiRoutes.transcript, requestQueueMiddleware as express.RequestHandler, getTranscript);
app.get(apiRoutes.testSSE, getTestSSE);

/**
 * Start the server and configure error handling
 */
export function startServer(): void {
    if (serverInstance) {
        console.log('Server is already running');
        return;
    }

    serverInstance = app.listen(CONFIG.port, () => {
        console.log(`Server running on ${CONFIG.url}:${CONFIG.port}`);
        console.log(`Example endpoint: ${CONFIG.url}:${CONFIG.port}${apiRoutes.summary}/?url=https://www.youtube.com/watch?v=${CONFIG.exampleVideoId}`);
    });

    // Add global error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit the process, just log the error
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // Don't exit the process, just log the error
    });

    handleUncaughtErrors(serverInstance);
}

/**
 * Stop the server
 */
export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!serverInstance) {
            console.log('Server is not running');
            resolve();
            return;
        }

        serverInstance.close((err) => {
            if (err) {
                reject(err);
                return;
            }
            serverInstance = null;
            activeRequests.clear();
            resolve();
        });
    });
}
