const express = require('express');
const router = express.Router();
const authRequired = require('../../middleware/authRequired');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Collection = require('../../models/Collection');

router.get('/profile', authRequired, async (req, res) => {
  const target = req.user;

  const followers = await User.find({ following: req.user._id })
    .select('username profileImage').lean();

  const following = await User.find({ _id: { $in: req.user.following } })
    .select('username profileImage').lean();

  const posts = await Post.find({ user: target._id })
    .populate('user', 'username profileImage').lean();

  const collections = await Collection.find({ user: target._id }).lean();

  res.json({
    user: req.user,
    profileUser: target,
    followers,
    following,
    posts,
    collections,
    saved: [],
    isFollowing: false
  });
});

module.exports = router;