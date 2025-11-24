const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Render login page
exports.renderLogin = (req, res) => {
  const error = req.query.error || null;
  res.render('login', { error });
};

// Render register page
exports.renderRegister = (req, res) => {
  res.render('register', { error: null });
};

// Register a user - USES REGISTER-SUCCESS PAGE
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.render('register', { error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.render('register', { error: 'Password must be at least 6 characters long' });
    }
    
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.render('register', { error: 'Email already in use' });
      } else {
        return res.render('register', { error: 'Username already taken' });
      }
    }
    
    const newUser = new User({ username, email, password });
    await newUser.save();
    
    const token = generateToken(newUser._id);
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log(`✅ New user registered: ${username} (${email})`);
    console.log(`🍪 Cookie set with token`);
    
    // Render REGISTER success page (celebration!)
    res.render('register-success', { user: newUser });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { error: 'Server error. Please try again later.' });
  }
};

// Login user - USES LOGIN-SUCCESS PAGE
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.redirect('/login?error=' + encodeURIComponent('Email and password are required'));
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    let isValidPassword;
    if (user.isPasswordMatch && typeof user.isPasswordMatch === 'function') {
      isValidPassword = await user.isPasswordMatch(password);
    } else {
      isValidPassword = await bcrypt.compare(password, user.password);
    }
    
    if (!isValidPassword) {
      return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    const token = generateToken(user._id);
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log(`✅ User logged in: ${user.username} (${user.email})`);
    console.log(`🍪 Cookie set with token`);
    
    // Render LOGIN success page (welcome back!)
    res.render('login-success', { user: user });
    
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/login?error=' + encodeURIComponent('Server error. Please try again later.'));
  }
};


// Logout user
exports.logoutUser = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  });
  
  console.log('User logged out');
  res.redirect('/login');
};

// Authentication middleware - verify JWT token
exports.authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.redirect('/login?error=' + encodeURIComponent('Access denied. Please login.'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login?error=' + encodeURIComponent('User not found. Please login again.'));
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.clearCookie('token');
    
    if (error.name === 'TokenExpiredError') {
      return res.redirect('/login?error=' + encodeURIComponent('Session expired. Please login again.'));
    } else if (error.name === 'JsonWebTokenError') {
      return res.redirect('/login?error=' + encodeURIComponent('Invalid session. Please login again.'));
    } else {
      return res.redirect('/login?error=' + encodeURIComponent('Authentication failed. Please login again.'));
    }
  }
};

// Optional: Check if user is authenticated (for conditional rendering)
exports.checkAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        req.user = user;
        req.isAuthenticated = true;
      } else {
        res.clearCookie('token');
        req.user = null;
        req.isAuthenticated = false;
      }
    } else {
      req.user = null;
      req.isAuthenticated = false;
    }
    
    next();
  } catch (error) {
    res.clearCookie('token');
    req.user = null;
    req.isAuthenticated = false;
    next();
  }
};

// Get current user info (for API endpoints)
exports.getCurrentUser = async (req, res) => {
  try {
    if (req.user) {
      res.json({
        success: true,
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
