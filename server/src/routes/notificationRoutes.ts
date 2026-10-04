import { Router } from 'express';
import {
  deleteNotification,
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Every route is scoped to the authenticated recipient inside the controller.
router.use(protect);

router.get('/', listNotifications);
router.get('/summary', getNotificationSummary);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

export default router;
