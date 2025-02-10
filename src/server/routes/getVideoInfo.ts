import { Request, Response } from "express";
import videoInfo from "../../services/info/videoInfo.js";
import { logRequest } from '../../utils/logger.js';
import { handleError } from '../../utils/errorHandling.js';

/**
 * Endpoint to fetch metadata about a YouTube video.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - url: YouTube video URL
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with video metadata
 * 
 * @example
 * GET /api/info?url=https://youtube.com/watch?v=...
 * 
 * // Response:
 * {
 *   "id": "video_id",
 *   "title": "Video Title",
 *   "description": "Video description...",
 *   "thumbnailUrl": "https://...",
 *   "channel": "Channel Name",
 *   "duration": 120
 * }
 */
export default async function getVideoInfo(req: Request, res: Response) {
    const startTime = Date.now();
    const inputUrl = req.query.url as string;
  
    try {
      const info = await videoInfo(inputUrl);
        
      logRequest({
        event: 'video_info_retrieved',
        url: inputUrl,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        duration: Date.now() - startTime,
        videoId: info.id
      });

      res.json({
        success: true,
        data: info
      });
    } catch (error) {
      handleError(error, res);
    }
}