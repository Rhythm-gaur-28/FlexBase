const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if email or username already exists
    if (await User.findOne({ email })) {
      return res.status(400).render('register', { error: 'Email already in use' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).render('register', { error: 'Username already taken' });
    }
    
    const newUser = new User({ username, email, password });
    await newUser.save();
    
    // Create JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Set JWT as cookie or send as you prefer, here as cookie
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600000 });
    res.redirect('/');
  } catch (err) {
    res.status(500).render('register', { error: 'Server error. Try again later.' });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.isPasswordMatch(password))) {
      return res.status(401).render('login', { error: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600000 });
    res.redirect('/');
  } catch (err) {
    res.status(500).render('login', { error: 'Server error. Try again later.' });
  }
};

// Logout user (clear cookie)
exports.logoutUser = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};
