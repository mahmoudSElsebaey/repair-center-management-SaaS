import { Router } from 'express';
import {
  archiveInventoryItem,
  createInventoryItem,
  getInventoryItem,
  listInventory,
  listTransactions,
  lowStockSummary,
  recordTransaction,
  updateInventoryItem,
} from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

const VIEW = restrictTo(
  'super_admin',
  'admin',
  'manager',
  'inventory_manager',
  'technician'
);

const MANAGE = restrictTo('super_admin', 'admin', 'manager', 'inventory_manager');

router.get('/low-stock', VIEW, lowStockSummary);

router.route('/').get(VIEW, listInventory).post(MANAGE, createInventoryItem);

router
  .route('/:id')
  .get(VIEW, getInventoryItem)
  .patch(MANAGE, updateInventoryItem)
  .delete(MANAGE, archiveInventoryItem);

router
  .route('/:id/transactions')
  .get(VIEW, listTransactions)
  .post(MANAGE, recordTransaction);

export default router;
