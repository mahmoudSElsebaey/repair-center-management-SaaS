import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createInvoice,
  getInvoice,
  issueInvoice,
  listInvoices,
  listPayments,
  recordPayment,
  voidInvoice,
} from '../controllers/invoiceController.js';

const router = Router();

router.use(protect);

router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/payments', listPayments);
router.get('/:id', getInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/void', voidInvoice);
router.post('/:id/payments', recordPayment);

export default router;
