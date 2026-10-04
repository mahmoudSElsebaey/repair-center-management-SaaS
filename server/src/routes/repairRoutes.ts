import { Router } from 'express';
import {
  changeRepairStatus,
  createRepair,
  getRepair,
  getRepairSummary,
  listAssignableTechnicians,
  listRepairs,
  updateRepair,
} from '../controllers/repairController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

/**
 * Reference endpoints are declared before `/:id` so "summary" and "technicians"
 * are never parsed as an id.
 */
router.get('/summary', getRepairSummary);
router.get('/technicians', listAssignableTechnicians);

router
  .route('/')
  .get(listRepairs)
  .post(createRepair);

router
  .route('/:id')
  .get(getRepair)
  .patch(updateRepair);

/**
 * Status is a separate sub-resource on purpose: it has its own authorization
 * rules and its own validation, and keeping it out of PATCH /:id means a generic
 * edit can never move a ticket through the workflow by accident.
 */
router.patch('/:id/status', changeRepairStatus);

export default router;
