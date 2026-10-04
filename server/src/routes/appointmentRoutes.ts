import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  calendarAppointments,
  cancelAppointment,
  checkConflicts,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  markNoShow,
  updateAppointment,
} from '../controllers/appointmentController.js';

const router = Router();

router.use(protect);

router.get('/', listAppointments);
router.post('/', createAppointment);
router.get('/calendar', calendarAppointments);
router.get('/conflicts', checkConflicts);
router.get('/:id', getAppointment);
router.patch('/:id', updateAppointment);
router.post('/:id/confirm', confirmAppointment);
router.post('/:id/complete', completeAppointment);
router.post('/:id/cancel', cancelAppointment);
router.post('/:id/no-show', markNoShow);

export default router;
