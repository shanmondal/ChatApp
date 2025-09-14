import express from 'express';
import {
  signup,
  login,
  isAuthenticated,
  updateProfile,
} from '../Controllers/userController.js';
import { protectRoute } from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post('/register', signup);
userRouter.post('/login', login);

userRouter.put('/update-profile', protectRoute, updateProfile);
userRouter.get('/check', protectRoute, isAuthenticated);

export default userRouter;
