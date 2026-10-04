import { Router } from 'express';
import { listActivity } from '../controllers/activityController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

/**
 * The audit trail is readable by management roles only: it contains actor names
 * and operational detail that a technician does not need.
 */
router.get('/', protect, restrictTo('super_admin', 'admin', 'manager'), listActivity);

export default router;
