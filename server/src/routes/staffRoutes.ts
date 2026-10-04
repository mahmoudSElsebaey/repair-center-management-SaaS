import { Router } from 'express';
import {
  createStaff,
  getStaffMember,
  listBranches,
  listStaff,
  listTechnicianWorkload,
  updateStaff,
} from '../controllers/staffController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

/** Static paths before `/:id`. */
router.get('/technicians/workload', restrictTo('super_admin', 'admin', 'manager'), listTechnicianWorkload);
router.get('/branches', restrictTo('super_admin', 'admin', 'manager'), listBranches);

router
  .route('/')
  .get(restrictTo('super_admin', 'admin', 'manager'), listStaff)
  .post(restrictTo('super_admin', 'admin'), createStaff);

router
  .route('/:id')
  .get(restrictTo('super_admin', 'admin', 'manager'), getStaffMember)
  .patch(restrictTo('super_admin', 'admin'), updateStaff);

export default router;
