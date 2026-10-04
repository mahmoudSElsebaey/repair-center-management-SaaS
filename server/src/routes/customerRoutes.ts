import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// Every route requires authentication; branch scoping happens inside the
// controllers so a super admin can work across the organisation.
router.use(protect);

router
  .route('/')
  .get(listCustomers)
  .post(createCustomer);

router
  .route('/:id')
  .get(getCustomer)
  // Archiving a customer is a management decision, not a front-desk action.
  .patch(updateCustomer)
  .delete(restrictTo('super_admin', 'admin', 'manager'), deleteCustomer);

export default router;
