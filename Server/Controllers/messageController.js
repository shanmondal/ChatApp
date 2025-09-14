//Get all users except the logged in user
import cloudinary from '../lib/cloudinary.js';
import Message from '../Models/message.js';
import User from '../Models/User.js';
import { io, userSocketMap } from '../server.js';

export const getUsersForSideMenu = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUser = await User.find({ _id: { $ne: userId } }).select(
      '-password',
    );

    // count unseen messages from each user

    const unseenMessages = {};
    const promises = filteredUser.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, users: filteredUser, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// get all messages for the slected user  to the logged in user

export const getMessagesForSelectedUser = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const loggedInUserId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: loggedInUserId },
      ],
    });
    // question for chat gpt here i already have a api to mark single message as seen using message id
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: loggedInUserId },
      { seen: true },
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// api to mark messages as seen,when i already opened sender chat , using message id

export const markMessagesAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndUpdate(id, { seen: true }, { new: true });
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

//send message to selected user
export const sendMessageToSelectedUser = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const receiverSocketId = userSocketMap[receiverId];
    const isDelivered = !!receiverSocketId;
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      delivered: isDelivered,
    });
    await newMessage.save();

    //emit the message to receiver if online

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }
    // optionally notify sender about delivered status immediately
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit('messageDelivered', {
        messageId: newMessage._id.toString(),
        to: receiverId,
      });
    }

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
