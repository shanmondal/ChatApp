import { generateToken } from '../lib/utils.js';
import User from '../Models/User.js';

import bcrypt from 'bcryptjs';
import cloudinary from '../lib/cloudinary.js';

export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.json({ success: false, message: 'Missing details' });
    }
    const user = await User.findOne({ email });

    if (user) {
      return res.json({
        success: false,
        message: 'User already exists with this Email',
      });
    }
    // encrypt the password before saving to DB
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);
    // create user in DB

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });
    const token = generateToken(newUser._id);
    res.json({
      success: true,
      userData: newUser,
      token,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.log(error.message);

    res.json({ success: false, message: error.message });
  }
};

// Code for users Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });
    const isPasswordMatch = await bcrypt.compare(password, userData.password);

    if (!isPasswordMatch) {
      return res.json({ success: false, message: 'Invalid Email or Password' });
    }
    const token = generateToken(userData._id);
    res.json({ success: true, userData, token, message: 'Login successful' });
  } catch (error) {
    console.log(error.message);

    res.json({ success: false, message: error.message });
  }
};

// Middleware to check if user is authenticated
export const isAuthenticated = (req, res) => {
  const user = req.user;
  if (user) {
    return res.json({ success: true, user });
  } else {
    return res.json({ success: false, message: 'You are not logged in' });
  }
};

// controller to update profile of user
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, profilePic } = req.body;
    const userId = req.user._id;
    let updatedUser;

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { fullName, bio },
        { new: true },
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, fullName, bio },
        { new: true },
      );
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
