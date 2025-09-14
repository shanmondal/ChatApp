import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import { connectDB } from './lib/DB.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoute.js';
import { Server } from 'socket.io';
import Message from './Models/message.js';

const app = express();
const server = http.createServer(app);

// Socket.io setup
export const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

export const userSocketMap = {};

// Socket connection handler
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  console.log('✅ user connected:', userId, 'socketId:', socket.id);

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.userId = userId;
  }

  io.emit('getOnlineUsers', Object.keys(userSocketMap));

  socket.on('typing', ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId)
      io.to(receiverSocketId).emit('typing', { from: userId });
  });

  socket.on('stopTyping', ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId)
      io.to(receiverSocketId).emit('stopTyping', { from: userId });
  });

  socket.on('markAsSeen', async ({ from }) => {
    try {
      await Message.updateMany(
        { senderId: from, receiverId: socket.userId, seen: false },
        { $set: { seen: true } },
      );

      const seenMessages = await Message.find({
        senderId: from,
        receiverId: socket.userId,
        seen: true,
      }).select('_id');

      const messageIds = seenMessages.map((m) => m._id.toString());
      const senderSocketId = userSocketMap[from];
      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesSeen', {
          by: socket.userId,
          messageIds,
        });
      }
    } catch (err) {
      console.error('markAsSeen error:', err.message);
    }
  });

  socket.on('messageDelivered', ({ messageId, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDelivered', { messageId });
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', userId);
    delete userSocketMap[userId];
    io.emit('getOnlineUsers', Object.keys(userSocketMap));
  });
});

// Middleware
app.use(express.json({ limit: '4mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use('/api/status', (req, res) => res.send('Server is live'));
app.use('/api/auth', userRouter);
app.use('/api/messages', messageRouter);

// Start server properly
async function start() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log('🚀 Server running on PORT', PORT));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

export default server;
