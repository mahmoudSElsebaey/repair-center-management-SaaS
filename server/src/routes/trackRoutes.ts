import { Router } from 'express';
import { getPublicTrack } from '../controllers/trackController.js';
import { publicTrackLimiter } from '../middleware/rateLimit.js';

const router = Router();

/**
 * Public — no auth. Rate-limited so a scraper cannot walk the code space cheaply.
 * Code format: RF-YYYY-##### (case-insensitive).
 */
router.get('/:code', publicTrackLimiter, getPublicTrack);

export default router;
