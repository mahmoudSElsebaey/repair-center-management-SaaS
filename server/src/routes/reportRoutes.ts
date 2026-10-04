import { Router } from 'express';
import { getDashboard, getAnalytics } from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

/**
 * Reporting is management-facing. Technicians and receptionists get their
 * working screens, not organisation-wide aggregates.
 */
router.use(protect, restrictTo('super_admin', 'admin', 'manager'));

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);

export default router;
