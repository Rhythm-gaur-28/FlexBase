const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Auth/session middleware
const User = require('./models/User');
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

// DB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flexbase')
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Only one route file to handle everything
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FlexBase server running on http://localhost:${PORT}`);
});
