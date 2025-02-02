import { blue, green, red, yellow } from '../style/colors.js';
import { activeRequests } from '../../server/server.js';
import { formatBytes, formatDuration } from '../utils/utils.js';
import os from 'os';

/**
 * Server statistics interface
 */
interface ServerStats {
    /** Server uptime in seconds */
    uptime: number;
    /** Number of active requests */
    activeRequests: number;
    /** Memory usage statistics */
    memory: {
        total: number;
        used: number;
        free: number;
    };
    /** CPU usage percentage */
    cpuUsage: number;
}

let monitoring = false;
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

/**
 * Calculates current CPU usage percentage
 * @returns {number} CPU usage as percentage (0-100)
 * @private
 */
function getCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastCpuTime;
    
    const totalUsage = (currentCpuUsage.user + currentCpuUsage.system) / 1000; // Convert to ms
    const cpuPercentage = (totalUsage / (timeDiff * os.cpus().length)) * 100;
    
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = currentTime;
    
    return Math.min(100, Math.max(0, cpuPercentage));
}

/**
 * Retrieves current server statistics
 * @returns {ServerStats} Current server metrics
 * @private
 */
function getServerStats(): ServerStats {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
        uptime: process.uptime(),
        activeRequests: activeRequests.size,
        memory: {
            total: totalMemory,
            used: totalMemory - freeMemory,
            free: freeMemory
        },
        cpuUsage: getCpuUsage()
    };
}

/**
 * Displays server statistics in a formatted console output
 * @param {ServerStats} stats - Server statistics to display
 * @private
 */
function displayStats(stats: ServerStats): void {
    console.clear();
    console.log(blue('=== Server Monitor ==='));
    console.log(`Uptime: ${formatDuration(stats.uptime)}`);
    
    // Active Requests
    const requestColor = stats.activeRequests > 5 ? red : stats.activeRequests > 2 ? yellow : green;
    console.log(`Active Requests: ${requestColor(stats.activeRequests.toString())}`);
    
    // Memory Usage
    const memoryPercentage = (stats.memory.used / stats.memory.total) * 100;
    const memoryColor = memoryPercentage > 80 ? red : memoryPercentage > 60 ? yellow : green;
    console.log('Memory Usage:');
    console.log(`  Total: ${formatBytes(stats.memory.total)}`);
    console.log(`  Used:  ${memoryColor(formatBytes(stats.memory.used))} (${memoryColor(memoryPercentage.toFixed(1))}%)`);
    console.log(`  Free:  ${formatBytes(stats.memory.free)}`);
    
    // CPU Usage
    const cpuColor = stats.cpuUsage > 80 ? red : stats.cpuUsage > 60 ? yellow : green;
    console.log(`CPU Usage: ${cpuColor(stats.cpuUsage.toFixed(1))}%`);
    
    console.log('\nPress Ctrl+C to stop monitoring');
}

/**
 * Starts real-time server monitoring.
 * Displays CPU, memory, and request statistics.
 * 
 * @returns {Promise<void>}
 * @example
 * await handleMonitorCommand();
 * // Displays continuous updates until Ctrl+C
 */
export async function handleMonitorCommand(): Promise<void> {
    if (monitoring) {
        console.log(yellow('Monitoring is already running'));
        return;
    }
    
    monitoring = true;
    console.log(blue('Starting server monitoring...'));
    
    const monitorInterval = setInterval(() => {
        const stats = getServerStats();
        displayStats(stats);
    }, 1000);
    
    process.on('SIGINT', () => {
        clearInterval(monitorInterval);
        monitoring = false;
        console.log(blue('\nMonitoring stopped'));
        process.exit(0);
    });
} 