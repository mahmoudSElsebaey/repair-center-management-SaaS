import { Router } from 'express';
import {
  createDevice,
  deleteDevice,
  getDevice,
  listDevices,
  updateDevice,
} from '../controllers/deviceController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router
  .route('/')
  .get(listDevices)
  .post(createDevice);

router
  .route('/:id')
  .get(getDevice)
  .patch(updateDevice)
  .delete(restrictTo('super_admin', 'admin', 'manager'), deleteDevice);

export default router;
