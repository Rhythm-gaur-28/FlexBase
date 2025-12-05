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
const Notification = require('../models/Notification');
const authRequired = require('../middleware/authRequired');
const authController = require('../controllers/authController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Cloudinary + Multer storage
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'flexbase/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'avif', 'webp'],
    public_id: (req, file) => `user_${req.user?._id || Date.now()}`
  }
});

const collectionStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'flexbase/collections',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `collection_${Date.now()}`
  }
});

const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'flexbase/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `post_${Date.now()}`
  }
});

const uploadProfile = multer({ storage: profileStorage });
const uploadCollection = multer({ storage: collectionStorage });
const uploadPost = multer({ storage: postStorage });

// ============= NOTIFICATION HELPER FUNCTION =============
async function createNotification(recipientId, senderId, type, data, io) {
  try {
    // Don't notify yourself
    if (String(recipientId) === String(senderId)) {
      return;
    }
    
    const messages = {
      'follow': 'started following you',
      'like': 'liked your post',
      'comment': 'commented on your post',
      'new_message': 'sent you a message'
    };
    
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type: type,
      message: messages[type] || 'New notification',
      relatedPost: data?.postId,
      relatedChat: data?.chatId,
      data: {
        postImage: data?.postImage,
        commentText: data?.commentText,
        chatPreview: data?.chatPreview
      },
      read: false
    });
    
    await notification.save();
    
    // Send real-time notification
    if (io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'username profileImage')
        .populate('relatedPost', 'images')
        .lean();
      
      io.to(`user_${recipientId}`).emit('newNotification', {
        notification: populatedNotification
      });
    }
    
    console.log(`✅ Notification sent: ${type} to user ${recipientId}`);
    
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
// ============= END NOTIFICATION HELPER =============


// Import chat routes
const chatRoutes = require('./chat');
// ADD THIS LINE - Import marketplace routes
const marketplaceRoutes = require('./marketplace');

// Mount chat routes under /api/chat
router.use('/api/chat', chatRoutes);
// ADD THIS LINE - Mount marketplace routes
router.use('/marketplace', marketplaceRoutes);

// Chat page route
router.get('/chat', authRequired, async (req, res) => {
  res.render('chat', {
    title: 'Chat | FlexBase',
    user: req.user
  });
});


// ---------- Home Page (Landing/Explore) ----------
router.get('/', async (req, res) => {
  console.log('📍 Hit / route inside index.js');
  console.log('👤 User:', req.user ? req.user.username : 'No user logged in');
  
  try {
    const category = req.query.category || 'new-arrivals';
    const row1Products = await Product.find({ section: 'row1', category });
    const row2Products = await Product.find({ section: 'row2', category });
    const row3Products = await Product.find({ section: 'row3', category });
    const shoeOfDay = await Product.findOne({ featured: true }) || {
      name: "2025 Nike The Best Classical",
      description: "Designed by Nike, this shoe is the perfect fit for the modern man. Its classic design and timeless style make it a must-have for any fashionista.",
      image: "/images/shoe-of-day.png"
    };

    console.log('✅ Rendering index.ejs');
    res.render('index', { 
      row1Products, 
      row2Products, 
      row3Products, 
      category, 
      shoeOfDay,
      user: req.user // MAKE SURE THIS LINE IS HERE
    });
  } catch (err) {
    console.error('❌ Error rendering / route:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/api/products/:category', cacheMiddleware('products:'), async (req, res) => {
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
    const toArray = v => Array.isArray(v) ? v : v ? [v] : [];
    const pOwnerIds = toArray(req.body.prevOwnerIds);
    const pFrom = toArray(req.body.prevFrom);
    const pTo = toArray(req.body.prevTo);

    const previousOwners = pOwnerIds.map((username, idx) => ({
      user: username,
      from: pFrom[idx] || null,
      to: pTo[idx] || null
    }));

    const imagePaths = (req.files || []).map(file => file.path);

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
    posts,
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
      update.profileImage = req.file.path;
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ---------- EXPLORE (User Search) ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/explore', authRequired, (req, res) => {
  res.render('explore', { user: req.user });
});

router.get('/api/users/search', authRequired, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const regex = new RegExp('^' + escapeRegex(q), 'i');
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

// Public profile by username
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
    posts,
    collections,
    saved: [],
    isFollowing
  });
});

// Follow/Unfollow routes
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

    // ⭐ NEW - Send notification
    const io = req.app.get('io');
    await createNotification(target._id, req.user._id, 'follow', {}, io);

    res.json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
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
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/profile/remove-follower', authRequired, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const followerUser = await User.findOne({ username });
    if (!followerUser) return res.status(404).json({ success: false, message: 'User not found' });

    req.user.followers = req.user.followers.filter(fid => String(fid) !== String(followerUser._id));
    followerUser.following = followerUser.following.filter(fid => String(fid) !== String(req.user._id));

    await req.user.save();
    await followerUser.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Remove follower error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/profile/unfollow-user', authRequired, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    req.user.following = req.user.following.filter(fid => String(fid) !== String(targetUser._id));
    targetUser.followers = targetUser.followers.filter(fid => String(fid) !== String(req.user._id));

    await req.user.save();
    await targetUser.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add post
router.get('/posts/add', authRequired, (req, res) => {
  res.render('addPost');
});

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

    const imagePaths = req.files.map(file => file.path);
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

// Post interactions
router.get('/api/posts/:postId', authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'username profileImage')
      .populate('comments.user', 'username profileImage')
      .lean();
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

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
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/api/posts/:postId/like', authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('user', '_id');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userLikeIndex = post.likes.indexOf(req.user._id);
    let isLiked;

    if (userLikeIndex > -1) {
      post.likes.splice(userLikeIndex, 1);
      isLiked = false;
    } else {
      post.likes.push(req.user._id);
      isLiked = true;
      
      // ⭐ NEW - Send notification when liking
      const io = req.app.get('io');
      await createNotification(post.user._id, req.user._id, 'like', {
        postId: post._id,
        postImage: post.images[0]
      }, io);
    }

    await post.save();
    res.json({ 
      success: true, 
      isLiked, 
      likesCount: post.likes.length 
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/api/posts/:postId/comment', authRequired, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text required' });
    }

    const post = await Post.findById(req.params.postId).populate('user', '_id');
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

    const populatedPost = await Post.findById(req.params.postId)
      .populate('comments.user', 'username profileImage')
      .lean();

    const addedComment = populatedPost.comments[populatedPost.comments.length - 1];

    // ⭐ NEW - Send notification
    const io = req.app.get('io');
    await createNotification(post.user._id, req.user._id, 'comment', {
      postId: post._id,
      commentText: text.trim().substring(0, 50),
      postImage: post.images[0]
    }, io);

    res.json({ 
      success: true, 
      comment: addedComment,
      commentsCount: post.comments.length 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/api/posts/:postId/comment/:commentId', authRequired, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    
    const post = await Post.findById(postId).populate('user', 'username');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isCommentOwner = String(comment.user) === String(req.user._id);
    const isPostOwner = String(post.user._id) === String(req.user._id);
    
    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    post.comments.pull(commentId);
    await post.save();

    res.json({ 
      success: true, 
      commentsCount: post.comments.length 
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Newsletter subscription
router.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    console.log(`📧 New newsletter subscription: ${email}`);
    
    res.json({
      success: true,
      message: 'Successfully subscribed to FlexBase newsletter!'
    });
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Subscription failed. Please try again later.'
    });
  }
});

module.exports = router;
