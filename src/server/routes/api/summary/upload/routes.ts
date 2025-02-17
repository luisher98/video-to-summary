import { Request, Response } from 'express';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { logRequest } from '@/utils/logging/logger.js';
import { handleError } from '@/utils/errors/errorHandling.js';

/**
 * Generate a summary from an uploaded video file
 */
export async function generateSummary(req: Request, res: Response) {
    const startTime = Date.now();
    const { file } = req;

    if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
    }

    try {
        const summaryService = SummaryServiceFactory.createFileUploadService();
        const source: MediaSource = {
            type: 'file',
            data: {
                file: file.buffer,
                filename: file.originalname,
                size: file.size
            }
        };

        const summary = await summaryService.process(source, {
            maxWords: Number(req.query.words) || 400,
            additionalPrompt: req.query.prompt as string
        });

        logRequest({
            event: 'summary_generated',
            filename: file.originalname,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - startTime,
            words: Number(req.query.words) || 400
        });

        res.json({ data: summary.content });
    } catch (error) {
        logRequest({
            event: 'summary_error',
            filename: file.originalname,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        handleError(error, res);
    }
}

/**
 * Stream summary generation progress for an uploaded video file
 */
export async function streamSummary(req: Request, res: Response) {
    const { file } = req;

    if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
    }

    try {
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const summaryService = SummaryServiceFactory.createFileUploadService();
        
        // Set up progress tracking
        summaryService.onProgress((progress) => {
            // Only send progress updates, not the final summary
            if (progress.status !== 'done') {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });

        const source: MediaSource = {
            type: 'file',
            data: {
                file: file.buffer,
                filename: file.originalname,
                size: file.size
            }
        };

        const summary = await summaryService.process(source, {
            maxWords: Number(req.query.words) || 400,
            additionalPrompt: req.query.prompt as string
        });

        // Send final summary only once
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary.content,
            progress: 100
        })}\n\n`);
        res.end();
    } catch (error) {
        // Send error through SSE if possible
        if (!res.headersSent) {
            res.write(`data: ${JSON.stringify({
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                progress: 0
            })}\n\n`);
            res.end();
        }
    }
}

/**
 * Get the transcript of an uploaded video file
 */
export async function getTranscript(req: Request, res: Response) {
    const { file } = req;

    if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
    }

    try {
        const summaryService = SummaryServiceFactory.createFileUploadService();
        const source: MediaSource = {
            type: 'file',
            data: {
                file: file.buffer,
                filename: file.originalname,
                size: file.size
            }
        };

        const result = await summaryService.process(source, {
            returnTranscriptOnly: true
        });

        res.json({ data: result.content });
    } catch (error) {
        handleError(error, res);
    }
} 