import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  refresh,
  resetPassword,
  updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateProfile);
router.patch('/password', protect, changePassword);

export default router;
