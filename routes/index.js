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
    description: "Designed by Nike, this shoe is the perfect fit for the modern man. Its classic design and timeless style make it a must-have for any fashionista.",
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
  const viewingSelf = true;
  const target = req.user; // own profile
  const followers = await User.find({ following: req.user._id }).select('username profileImage').lean();
  const following = await User.find({ _id: { $in: req.user.following } }).select('username profileImage').lean();
  const posts = []; // populate if you add posts later
  const collections = await Collection.find({ user: target._id }).lean();
  const saved = []; // include only for self
  res.render('profile', {
    user: req.user,            // current logged-in user (for navbar)
    profileUser: target,       // the profile being viewed
    viewingSelf,               // true
    followers,
    following,
    posts,
    collections,
    saved
  });
}); 
router.post('/profile/update', authRequired, uploadProfile.single('profilePicture'), async (req, res) => {
  try {
    const update = {
      bio: req.body.bio
    };
    if (req.file) {
      update.profileImage = '/uploads/profiles/' + req.file.filename;
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ---------- EXPLORE (User Search) ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/explore', authRequired, (req, res) => {
  res.render('explore', { user: req.user });
});

// Typeahead API: /api/users/search?q=<term>
router.get('/api/users/search', authRequired, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const regex = new RegExp('^' + escapeRegex(q), 'i'); // prefix match
    const users = await User.find({ username: regex })
      .select('username profileImage')
      .limit(8)
      .lean();
    res.json({ users });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ users: [] });
  }
});

// Example public profile by username
router.get('/u/:username', authRequired, async (req, res) => {
  const target = await User.findOne({ username: req.params.username }).lean();
  if (!target) return res.status(404).render('404'); 
  const viewingSelf = String(target._id) === String(req.user._id);
  if (viewingSelf) return res.redirect('/profile'); // canonicalize own profile URL to /profile [memory:21]
  const followers = []; // optionally compute if needed
  const following = []; // optionally compute if needed
  const posts = []; 
  const collections = await Collection.find({ user: target._id }).lean();
  // Do not fetch 'saved' for others
  res.render('profile', {
    user: req.user,
    profileUser: target,
    viewingSelf,
    followers,
    following,
    posts,
    collections,
    saved: [] // empty or omit
  });
});

module.exports = router;