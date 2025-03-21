import { Router } from 'express';
import { validation } from '../../middleware/middleware.js';
import { initiateUpload, processVideo } from './video.handler.js';

const router = Router();

// Apply video-specific validation
router.post('/upload/initiate', validation.upload.validateInitiateUpload, initiateUpload);
router.post('/:fileId/process', processVideo);

export default router; 