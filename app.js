const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:4000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Import models
const User = require('./models/User');
let UserStatus;

// Try to import UserStatus, create a simple version if it fails
try {
  UserStatus = require('./models/UserStatus');
} catch (error) {
  console.log('UserStatus model not found, creating a simple in-memory version');
  // Simple in-memory user status for now
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

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flexbase')
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.match(/token=([^;]+)/)?.[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.profileImage = user.profileImage;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication error'));
  }
});

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
  console.log(`🔗 User ${socket.username} connected (${socket.userId})`);
  
  try {
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Update user online status (only if UserStatus model exists)
    if (UserStatus && typeof UserStatus.findOneAndUpdate === 'function') {
      await UserStatus.findOneAndUpdate(
        { user: socket.userId },
        { 
          isOnline: true, 
          lastSeen: new Date(), 
          socketId: socket.id 
        },
        { upsert: true }
      );

      // Broadcast user online status to all connected clients
      socket.broadcast.emit('userStatusUpdate', {
        userId: socket.userId,
        isOnline: true
      });
    }

    // Handle typing indicators
    socket.on('typing', ({ chatId, isTyping }) => {
      if (!chatId) return;
      
      socket.to(`chat_${chatId}`).emit('userTyping', {
        userId: socket.userId,
        username: socket.username,
        profileImage: socket.profileImage,
        isTyping,
        chatId
      });
    });

    // Join chat rooms
    socket.on('joinChat', (chatId) => {
      if (chatId) {
        socket.join(`chat_${chatId}`);
        console.log(`📱 User ${socket.username} joined chat ${chatId}`);
      }
    });

    // Leave chat rooms
    socket.on('leaveChat', (chatId) => {
      if (chatId) {
        socket.leave(`chat_${chatId}`);
        console.log(`📱 User ${socket.username} left chat ${chatId}`);
      }
    });

    // Handle message read status
    socket.on('markMessagesRead', async ({ chatId, messageIds }) => {
      if (!chatId || !messageIds || !Array.isArray(messageIds)) return;
      
      try {
        socket.to(`chat_${chatId}`).emit('messagesRead', {
          userId: socket.userId,
          chatId,
          messageIds
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User ${socket.username} disconnected`);
      
      try {
        if (UserStatus && typeof UserStatus.findOneAndUpdate === 'function') {
          await UserStatus.findOneAndUpdate(
            { user: socket.userId },
            { 
              isOnline: false, 
              lastSeen: new Date(),
              socketId: null
            }
          );

          // Broadcast user offline status to all connected clients
          socket.broadcast.emit('userStatusUpdate', {
            userId: socket.userId,
            isOnline: false,
            lastSeen: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.username}:`, error);
    });

  } catch (error) {
    console.error('Error in socket connection handler:', error);
  }
});

// Routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Error handling middleware
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
server.listen(PORT, () => {
  console.log(`🚀 FlexBase server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  
  // Update all online users to offline
  try {
    if (UserStatus && typeof UserStatus.updateMany === 'function') {
      await UserStatus.updateMany(
        { isOnline: true },
        { isOnline: false, lastSeen: new Date(), socketId: null }
      );
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  
  try {
    if (UserStatus && typeof UserStatus.updateMany === 'function') {
      await UserStatus.updateMany(
        { isOnline: true },
        { isOnline: false, lastSeen: new Date(), socketId: null }
      );
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
