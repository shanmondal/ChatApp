import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import { connectDB } from './lib/DB.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoute.js';
import { Server } from 'socket.io';
import Message from './Models/message.js'; // ⭐ NEW: import model to update seen/delivered

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Socket.io setup
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

// store all online connected users
export const userSocketMap = {}; // {userId: socketId}

// socket connection handler
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(
    'socket connected - handshake.query:',
    socket.handshake.query,
    'handshake.auth:',
    socket.handshake.auth,
  );

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.userId = userId; // ⭐ NEW: keep userId on socket for later use
  }
  console.log('✅ user connected:', userId, 'socketId:', socket.id);

  // emit list of online users
  io.emit('getOnlineUsers', Object.keys(userSocketMap));
  // User starts typing
  socket.on('typing', ({ to }) => {
    console.log('✍️ typing FROM', userId, 'TO', to);
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { from: userId });
    }
  });

  // User stops typing
  socket.on('stopTyping', ({ to }) => {
    console.log('🛑 stopTyping FROM', userId, 'TO', to);
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stopTyping', { from: userId });
    }
  });

  // ⭐ NEW: handle markAsSeen
  socket.on('markAsSeen', async ({ from }) => {
    try {
      // mark all unseen messages from `from` → me as seen
      await Message.updateMany(
        { senderId: from, receiverId: socket.userId, seen: false },
        { $set: { seen: true } },
      );

      // get updated ids
      const seenMessages = await Message.find({
        senderId: from,
        receiverId: socket.userId,
        seen: true,
      }).select('_id');

      const messageIds = seenMessages.map((m) => m._id.toString());

      // notify sender in real time
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

  // ⭐ NEW: optional messageDelivered event
  socket.on('messageDelivered', ({ messageId, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDelivered', { messageId });
    }
  });

  // disconnect handler
  socket.on('disconnect', () => {
    console.log('user disconnected with userId:', userId);
    delete userSocketMap[userId];
    io.emit('getOnlineUsers', Object.keys(userSocketMap));
  });
});

// Middleware setup
app.use(express.json({ limit: '4mb' }));
app.use(cors());
app.use('/api/status', (req, res) => res.send('Server is live'));

// Routes setup
app.use('/api/auth', userRouter);
app.use('/api/messages', messageRouter);

// connect MDB
await connectDB();
if (NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log('Server is running on PORT: ' + PORT));
}

export default server;
