const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:4000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Import models
const User = require('./models/User');
let UserStatus;
try {
  UserStatus = require('./models/UserStatus');
} catch (error) {
  UserStatus = {
    findOneAndUpdate: () => Promise.resolve(),
    updateMany: () => Promise.resolve()
  };
}

// Auth/session middleware
app.use(async (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      res.locals.user = user || null;
      req.user = user || null;
    } catch {
      res.locals.user = null;
      req.user = null;
    }
  } else {
    res.locals.user = null;
    req.user = null;
  }
  next();
});

// DB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flexbase')
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
console.log("Views directory:", path.join(__dirname, "views"));
console.log("Current working directory:", process.cwd());

// Socket.IO logic (unchanged)
// ...

// ✅ Use only your main routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).send('Something went wrong!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FlexBase server running on port ${PORT}`);
});
