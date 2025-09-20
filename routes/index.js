const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const Post = require('../models/Post');
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
  const target = req.user;
  const followers = await User.find({ following: req.user._id }).select('username profileImage').lean();
  const following = await User.find({ _id: { $in: req.user.following } }).select('username profileImage').lean();
  const posts = await Post.find({ user: target._id }).populate('user', 'username profileImage').lean();
  const collections = await Collection.find({ user: target._id }).lean();
  const saved = [];

  res.render('profile', {
    user: req.user,
    profileUser: target,
    viewingSelf,
    followers,
    following,
    posts, // Make sure posts are passed
    collections,
    saved,
    isFollowing: false
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
  if (viewingSelf) return res.redirect('/profile');

  const followers = await User.find({ _id: { $in: target.followers } }).select('username profileImage').lean();
  const following = await User.find({ _id: { $in: target.following } }).select('username profileImage').lean();
  const posts = await Post.find({ user: target._id }).populate('user', 'username profileImage').lean();
  const collections = await Collection.find({ user: target._id }).lean();
  const isFollowing = req.user.following.map(id => String(id)).includes(String(target._id));

  res.render('profile', {
    user: req.user,
    profileUser: target,
    viewingSelf,
    followers,
    following,
    posts, // Make sure posts are passed
    collections,
    saved: [],
    isFollowing
  });
});

// Follow/Unfollow routes (add these to your routes/index.js)
router.post('/u/:username/follow', authRequired, async (req, res) => {
  try {
    if (req.user.username === req.params.username) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself.' });
    }
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    if (target.followers.includes(req.user._id)) {
      return res.status(409).json({ success: false, message: 'Already following.' });
    }

    target.followers.push(req.user._id);
    req.user.following.push(target._id);
    await target.save();
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/u/:username/unfollow', authRequired, async (req, res) => {
  try {
    if (req.user.username === req.params.username) {
      return res.status(400).json({ success: false, message: 'Cannot unfollow yourself.' });
    }
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    target.followers = target.followers.filter(fid => String(fid) !== String(req.user._id));
    req.user.following = req.user.following.filter(fid => String(fid) !== String(target._id));
    await target.save();
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
// Remove a follower (for your own profile)
router.post('/profile/remove-follower', authRequired, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const followerUser = await User.findOne({ username });
    if (!followerUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Remove from your followers list
    req.user.followers = req.user.followers.filter(fid => String(fid) !== String(followerUser._id));
    // Remove from their following list
    followerUser.following = followerUser.following.filter(fid => String(fid) !== String(req.user._id));

    await req.user.save();
    await followerUser.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unfollow a user from your following list
router.post('/profile/unfollow-user', authRequired, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Remove from your following list
    req.user.following = req.user.following.filter(fid => String(fid) !== String(targetUser._id));
    // Remove from their followers list
    targetUser.followers = targetUser.followers.filter(fid => String(fid) !== String(req.user._id));

    await req.user.save();
    await targetUser.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Add post storage configuration
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/posts/'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const uploadPost = multer({ storage: postStorage });

// GET route for add post page
router.get('/posts/add', authRequired, (req, res) => {
  res.render('addPost');
});

// POST route for creating post
router.post('/posts/add', authRequired, (req, res, next) => {
  uploadPost.array('images')(req, res, (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: "File upload failed." });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required.' });
    }

    const imagePaths = req.files.map(file => '/uploads/posts/' + file.filename);

    // Process hashtags
    const hashtags = req.body.hashtags ?
      (Array.isArray(req.body.hashtags) ? req.body.hashtags : [req.body.hashtags]) : [];

    const newPost = new Post({
      user: req.user._id,
      images: imagePaths,
      caption: req.body.caption || '',
      hashtags: hashtags
    });

    await newPost.save();
    res.json({ success: true, message: 'Post created successfully!' });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ success: false, message: 'Error creating post.' });
  }
});
// Get single post with full data
router.get('/api/posts/:postId', authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'username profileImage')
      .populate('comments.user', 'username profileImage')
      .lean();
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if current user liked this post
    const isLiked = post.likes.some(like => String(like) === String(req.user._id));
    
    res.json({ 
      success: true, 
      post: {
        ...post,
        isLiked,
        likesCount: post.likes.length,
        commentsCount: post.comments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle like on post
router.post('/api/posts/:postId/like', authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userLikeIndex = post.likes.indexOf(req.user._id);
    let isLiked;

    if (userLikeIndex > -1) {
      // Unlike
      post.likes.splice(userLikeIndex, 1);
      isLiked = false;
    } else {
      // Like
      post.likes.push(req.user._id);
      isLiked = true;
    }

    await post.save();
    res.json({ 
      success: true, 
      isLiked, 
      likesCount: post.likes.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add comment to post
router.post('/api/posts/:postId/comment', authRequired, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const newComment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    // Get the populated comment data
    const populatedPost = await Post.findById(req.params.postId)
      .populate('comments.user', 'username profileImage')
      .lean();

    const addedComment = populatedPost.comments[populatedPost.comments.length - 1];

    res.json({ 
      success: true, 
      comment: addedComment,
      commentsCount: post.comments.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;