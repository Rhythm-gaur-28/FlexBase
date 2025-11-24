const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const Collection = require('../models/Collection');
const Listing = require('../models/Listing');
const authRequired = require('../middleware/authRequired');

// Render notifications page - NEW!
router.get('/', authRequired, async (req, res) => {
  res.render('notifications', { user: req.user });
});

// Get user notifications
router.get('/api/notifications', authRequired, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username profileImage')
      .populate('relatedTransaction')
      .populate('relatedListing')
      .sort('-createdAt')
      .limit(50)
      .lean();
    
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending transactions (for seller approval)
router.get('/api/pending-transactions', authRequired, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      seller: req.user._id,
      status: 'payment_submitted'
    })
      .populate('buyer', 'username profileImage')
      .populate('collection')
      .populate('listing')
      .sort('-paymentSubmittedAt')
      .lean();
    
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Confirm payment received (seller approves)
router.post('/api/transactions/:transactionId/confirm', authRequired, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('collection')
      .populate('buyer', 'username')
      .populate('seller', 'username');
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    // Verify seller
    if (String(transaction.seller._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    if (transaction.status !== 'payment_submitted') {
      return res.status(400).json({ success: false, message: 'Transaction not in valid state' });
    }
    
    // Get collection
    const collection = await Collection.findById(transaction.collection._id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    
    // Initialize arrays
    if (!Array.isArray(collection.previousOwners)) collection.previousOwners = [];
    if (!Array.isArray(collection.transferHistory)) collection.transferHistory = [];
    
    // Add current owner to previousOwners
    collection.previousOwners.push({
      user: transaction.seller.username,
      from: collection.createdAt || new Date(),
      to: new Date()
    });
    
    // Transfer ownership
    collection.user = transaction.buyer._id;
    collection.isListed = false;
    collection.currentListing = null;
    
    collection.transferHistory.push({
      from: transaction.seller._id,
      to: transaction.buyer._id,
      transaction: transaction._id,
      price: transaction.amount,
      transferredAt: new Date()
    });
    
    await collection.save();
    
    // Update transaction
    transaction.status = 'completed';
    transaction.paymentConfirmedAt = new Date();
    transaction.completedAt = new Date();
    await transaction.save();
    
    // Update listing
    await Listing.findByIdAndUpdate(transaction.listing, { status: 'sold' });
    
    // Notify buyer
    const buyerNotification = new Notification({
      recipient: transaction.buyer._id,
      sender: req.user._id,
      type: 'purchase_complete',
      message: `Payment confirmed! ${collection.brand} has been transferred to your collection.`,
      relatedTransaction: transaction._id
    });
    await buyerNotification.save();
    
    console.log(`✅ Transaction confirmed by ${req.user.username}`);
    console.log(`🎉 ${transaction.buyer.username} now owns ${collection.brand}`);
    
    res.json({ 
      success: true, 
      message: 'Payment confirmed and item transferred!' 
    });
  } catch (error) {
    console.error('Confirm transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject payment (seller denies)
router.post('/api/transactions/:transactionId/reject', authRequired, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('buyer', 'username');
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (String(transaction.seller) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update transaction
    transaction.status = 'rejected';
    transaction.rejectedAt = new Date();
    transaction.rejectionReason = reason || 'Payment not received';
    await transaction.save();
    
    // Reactivate listing
    await Listing.findByIdAndUpdate(transaction.listing, { status: 'active' });
    
    // Notify buyer
    const notification = new Notification({
      recipient: transaction.buyer._id,
      sender: req.user._id,
      type: 'payment_rejected',
      message: `Payment rejected: ${reason || 'Payment not received'}. Your purchase was cancelled.`,
      relatedTransaction: transaction._id
    });
    await notification.save();
    
    res.json({ success: true, message: 'Payment rejected' });
  } catch (error) {
    console.error('Reject transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark notification as read
router.post('/api/notifications/:notificationId/read', authRequired, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
