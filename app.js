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
      }
    });

    // Leave chat rooms
    socket.on('leaveChat', (chatId) => {
      if (chatId) {
        socket.leave(`chat_${chatId}`);
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
app.use('/api', require('./routes/api/profile'))
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
  console.log(`🔌 Socket.IO server ready for connections`);
});
