import { getServerStatus } from '../../server/server.js';
import { blue, green, red } from '../style/colors.js';
import { formatDuration } from '../utils/utils.js';

export async function handleStatusCommand(): Promise<void> {
    try {
        const status = getServerStatus();
        console.log(blue('\nServer Status:'));
        console.log(`Running: ${status.running ? green('Yes') : red('No')}`);
        if (status.running) {
            console.log(`URL: ${status.url}:${status.port}`);
            console.log(`Uptime: ${formatDuration(status.uptime)}`);
            console.log(`Active Requests: ${status.activeRequests}`);
        }
    } catch (error) {
        console.error('Error retrieving server status:', (error as Error).message);
    }
}
