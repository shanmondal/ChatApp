import express from 'express';
import {
  getUsersForSideMenu,
  markMessagesAsSeen,
  getMessagesForSelectedUser,
  sendMessageToSelectedUser,
} from '../Controllers/messageController.js';
import { protectRoute } from '../middleware/auth.js';
const messageRouter = express.Router();

messageRouter.get('/users', protectRoute, getUsersForSideMenu);
messageRouter.get('/:id', protectRoute, getMessagesForSelectedUser);
messageRouter.put('/mark/:id', protectRoute, markMessagesAsSeen);
messageRouter.post('/send/:id', protectRoute, sendMessageToSelectedUser);

export default messageRouter;
