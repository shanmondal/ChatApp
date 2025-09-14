import { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './authContext';
import toast from 'react-hot-toast';

export const chatContext = createContext();

const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState({});
  const { socket, axios, authUser } = useContext(AuthContext);
  const [typingUsers, setTypingUsers] = useState({});

  // title casing helper
  function toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const getUsers = async () => {
    try {
      const { data } = await axios.get(`/api/messages/users`);
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);

        // tell backend to mark all as seen
        if (socket) {
          socket.emit('markAsSeen', { from: userId });
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessages = async (messageData) => {
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData,
      );
      if (data.success) {
        const fullMessage = {
          _id: data.message._id,
          senderId: data.message.senderId,
          receiverId: data.message.receiverId,
          text: data.message.text || '',
          image: data.message.image || null,
          seen: data.message.seen || false,
          delivered: data.message.delivered || false, // ⭐ track delivered
          createdAt: data.message.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fullMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // socket subscriptions
  const subscribeToMessage = () => {
    if (!socket) return;

    // 1️⃣ Incoming new messages
    socket.on('newMessage', (newMessage) => {
      console.log('📩 newMessage received', newMessage);
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prev) => [...prev, newMessage]);

        socket.emit('markAsSeen', { from: newMessage.senderId });
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: prev[newMessage.senderId]
            ? prev[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
    // someone typing
    socket.on('typing', ({ from }) => {
      console.log('📩 typing received from', from);
      setTypingUsers((prev) => ({ ...prev, [from]: true }));
    });

    socket.on('stopTyping', ({ from }) => {
      console.log('📩 stopTyping received from', from);
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[from];
        return copy;
      });
    });

    // 2️⃣ Seen updates
    socket.on('messagesSeen', ({ by, messageIds }) => {
      if (by && by !== authUser._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg._id.toString())
              ? { ...msg, seen: true }
              : msg,
          ),
        );
      }
    });

    // 3️⃣ Delivered updates
    socket.on('messageDelivered', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, delivered: true } : msg,
        ),
      );
    });
  };

  const unSubscribeFromMessage = () => {
    if (!socket) return;
    socket.off('newMessage');
    socket.off('messagesSeen');
    socket.off('messageDelivered');
    socket.off('typing');
    socket.off('stopTyping');
  };

  useEffect(() => {
    subscribeToMessage();
    return () => unSubscribeFromMessage();
  }, [socket, selectedUser]);

  const value = {
    messages,
    getMessages,
    toTitleCase,
    users,
    selectedUser,
    sendMessages,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    getUsers,
    typingUsers,
  };

  return <chatContext.Provider value={value}>{children}</chatContext.Provider>;
};

export default ChatProvider;
