const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const authRequired = require('../middleware/authRequired');
const authController = require('../controllers/authController');


// ---------- Multer Storage Setup ----------
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/profiles/'),
  filename: (req, file, cb) => cb(null, `user_${req.user._id}${path.extname(file.originalname)}`)
});
const collectionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/collections/'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const uploadProfile = multer({ storage: profileStorage });
const uploadCollection = multer({ storage: collectionStorage });

// ---------- Home Page (Landing/Explore) ----------
router.get('/', async (req, res) => {
  const category = req.query.category || 'new-arrivals';
  const row1Products = await Product.find({ section: 'row1', category });
  const row2Products = await Product.find({ section: 'row2', category });
  const row3Products = await Product.find({ section: 'row3', category });
  const shoeOfDay = await Product.findOne({ featured: true }) || {
    name: "2025 Nike The Best Classical",
    description: "No description.",
    image: "/images/shoe-of-day.png"
  };
  res.render('index', { row1Products, row2Products, row3Products, category, shoeOfDay });
});
router.get('/api/products/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const row1Products = await Product.find({ section: 'row1', category });
    const row2Products = await Product.find({ section: 'row2', category });
    const row3Products = await Product.find({ section: 'row3', category });
    res.json({ row1Products, row2Products, row3Products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ---------- AUTH ----------
// Display registration form
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// Handle registration
router.post('/register', authController.registerUser);

// Display login form
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
router.post('/login', authController.loginUser);

// Handle logout
router.get('/logout', authController.logoutUser);

// ---------- COLLECTIONS ADD & VIEW ----------
router.get('/collections/add', authRequired, (req, res) => {
  res.render('addCollectionItem', { error: null, users: [] });
});
router.post('/collections/add', authRequired, (req, res, next) => {
  uploadCollection.array('images')(req, res, (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: "File upload failed." });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Normalize previous owners inputs to arrays even if only one owner is provided
    const toArray = v => Array.isArray(v) ? v : v ? [v] : [];
    const pOwnerIds = toArray(req.body.prevOwnerIds); // Contains the usernames
    const pFrom = toArray(req.body.prevFrom);
    const pTo = toArray(req.body.prevTo);

    const previousOwners = pOwnerIds.map((username, idx) => ({
      user: username, // Store as a username string
      from: pFrom[idx] || null,
      to: pTo[idx] || null
    }));

    const imagePaths = req.files.map(file => '/uploads/collections/' + file.filename);

    const newCollection = new Collection({
      user: req.user._id,
      images: imagePaths,
      brand: req.body.brand,
      boughtOn: req.body.boughtOn,
      boughtAtPrice: req.body.boughtAtPrice,
      marketPrice: req.body.marketPrice,
      previousOwners
    });

    await newCollection.save();
    res.json({ success: true, message: 'Shoe added to your collection!' });
  } catch (err) {
    console.error('Error adding shoe:', err);
    res.status(500).json({ success: false, message: 'Error adding shoe.' });
  }
});



router.get('/collections/user/:userId', authRequired, async (req, res) => {
  const collections = await Collection.find({ user: req.params.userId }).populate('previousOwners.user');
  res.json({ collections });
});

// ---------- PROFILE & UPDATE ----------
router.get('/profile', authRequired, async (req, res) => {
  const followers = await User.find({ following: req.user._id });
  const following = await User.find({ _id: { $in: req.user.following } });
  const posts = [];
  const collections = await Collection.find({ user: req.user._id }).populate('previousOwners.user');
  const saved = [];
  res.render('profile', {
    user: req.user,
    followers,
    following,
    posts,
    collections,
    saved
  });
});
router.post('/profile/update', authRequired, uploadProfile.single('profilePicture'), async (req, res) => {
  try {
    const { bio } = req.body;
    const updateData = { bio: bio || req.user.bio };
    if (req.file) {
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }
    await User.findByIdAndUpdate(req.user._id, updateData);
    res.json({ success: true, message: 'Profile updated successfully.', profileImage: updateData.profileImage, bio: updateData.bio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

module.exports = router;