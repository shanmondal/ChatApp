import React from 'react';
import axios from 'axios';
import { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
const backendURL = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendURL;
export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  //Login user for handle user auth and socket connection
  const login = async (state, userCredential) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, userCredential);
      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);

        axios.defaults.headers.common['token'] = data.token;
        localStorage.setItem('token', data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  // logout function

  const logout = async () => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common['token'] = null;
    socket.disconnect();
    toast.success('Logged Out Succesfully');
  };

  // Function to check the user is authenticated or not
  const checkAuth = async () => {
    try {
      const { data } = await axios.get('/api/auth/check');
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to Update user profile
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put('/api/auth/update-profile', body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success('Profile updated succesfully');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //connect socket fucnction to handle socket connection and online user updates

  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;
    const newSocket = io(backendURL, {
      query: {
        userId: userData._id,
      },
    });
    newSocket.connect();
    setSocket(newSocket);
    newSocket.on('getOnlineUsers', (userIds) => {
      setOnlineUsers(userIds);
    });
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['token'] = token;
    }
    checkAuth();
  }, []);

  const value = {
    axios,
    token,
    authUser,

    onlineUsers,

    socket,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
