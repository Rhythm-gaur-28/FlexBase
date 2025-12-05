const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Collection = require('../models/Collection');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const authRequired = require('../middleware/authRequired');
const mongoose = require('mongoose');

// Render marketplace page
router.get('/', authRequired, async (req, res) => {
  res.render('marketplace', { user: req.user });
});

// Get all active listings (API)
router.get('/api/listings', authRequired, async (req, res) => {
  try {
    const { brand, minPrice, maxPrice, sort = '-createdAt' } = req.query;
    
    const query = { status: 'active' };
    
    const listings = await Listing.find(query)
      .populate('seller', 'username profileImage')
      .populate('collection')
      .sort(sort)
      .lean();
    
    // Filter by brand and price if provided
    let filtered = listings;
    if (brand) {
      filtered = filtered.filter(l => l.collection && l.collection.brand.toLowerCase().includes(brand.toLowerCase()));
    }
    if (minPrice) {
      filtered = filtered.filter(l => l.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(l => l.price <= parseFloat(maxPrice));
    }
    
    res.json({ success: true, listings: filtered });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single listing details
router.get('/api/listings/:listingId', authRequired, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId)
      .populate('seller', 'username profileImage bio')
      .populate('collection')
      .lean();
    
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    
    // Increment view count
    await Listing.findByIdAndUpdate(req.params.listingId, { $inc: { views: 1 } });
    
    res.json({ success: true, listing });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new listing
// Create a new listing - WITH PAYMENT METHODS
router.post('/api/listings', authRequired, async (req, res) => {
  try {
    const { collectionId, price, title, description, paymentMethods } = req.body;
    
    console.log('📦 Creating listing with data:', { collectionId, price, title, paymentMethods });
    
    if (!collectionId || !price || !title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collection, price, and title are required' 
      });
    }
    
    // Validate payment methods
    if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one payment method is required' 
      });
    }
    
    // Verify collection ownership
    const collection = await Collection.findOne({ 
      _id: collectionId, 
      user: req.user._id 
    });
    
    if (!collection) {
      return res.status(403).json({ 
        success: false, 
        message: 'Collection not found or you do not own this collection' 
      });
    }
    
    // Check if already listed
    if (collection.isListed) {
      return res.status(400).json({ 
        success: false, 
        message: 'This collection is already listed for sale' 
      });
    }
    
    // Create listing WITH payment methods
    const listing = new Listing({
      collection: collectionId,
      seller: req.user._id,
      price: parseFloat(price),
      title,
      description: description || '',
      paymentMethods: paymentMethods  // ADD THIS LINE
    });
    
    await listing.save();
    
    console.log('✅ Listing created with payment methods:', listing.paymentMethods);
    
    // Update collection
    collection.isListed = true;
    collection.currentListing = listing._id;
    await collection.save();
    
    console.log(`📦 New listing created by ${req.user.username}: ${title} - $${price}`);
    
    res.json({ 
      success: true, 
      message: 'Collection listed successfully!',
      listing 
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});


// Cancel a listing
router.delete('/api/listings/:listingId', authRequired, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId);
    
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    
    // Verify ownership
    if (String(listing.seller) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update listing status
    listing.status = 'cancelled';
    await listing.save();
    
    // Update collection
    await Collection.findByIdAndUpdate(listing.collection, {
      isListed: false,
      currentListing: null
    });
    
    console.log(`❌ Listing cancelled by ${req.user.username}`);
    
    res.json({ success: true, message: 'Listing cancelled successfully' });
  } catch (error) {
    console.error('Cancel listing error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// // Purchase a collection (Transfer Ownership) - FIXED --- uses transaction version for atlas or production version
// router.post('/api/purchase/:listingId', authRequired, async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
  
//   try {
//     console.log('🛒 Purchase attempt by:', req.user.username);
//     console.log('📦 Listing ID:', req.params.listingId);
    
//     const listing = await Listing.findById(req.params.listingId).session(session);
    
//     if (!listing || listing.status !== 'active') {
//       await session.abortTransaction();
//       console.error('❌ Listing not found or not active');
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Listing not available' 
//       });
//     }
    
//     console.log('✅ Listing found, status:', listing.status);
    
//     // Prevent self-purchase
//     if (String(listing.seller) === String(req.user._id)) {
//       await session.abortTransaction();
//       console.error('❌ Self-purchase attempt');
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Cannot purchase your own collection' 
//       });
//     }
    
//     // Get collection
//     const collection = await Collection.findById(listing.collection).session(session);
//     if (!collection) {
//       await session.abortTransaction();
//       console.error('❌ Collection not found');
//       return res.status(404).json({ success: false, message: 'Collection not found' });
//     }
    
//     console.log('✅ Collection found:', collection.brand);
    
//     // Get current owner
//     const currentOwner = await User.findById(collection.user).session(session);
//     if (!currentOwner) {
//       await session.abortTransaction();
//       console.error('❌ Current owner not found');
//       return res.status(404).json({ success: false, message: 'Owner not found' });
//     }
    
//     console.log('✅ Current owner:', currentOwner.username);
    
//     // Create transaction record
//     const transaction = new Transaction({
//       listing: listing._id,
//       collection: collection._id,
//       buyer: req.user._id,
//       seller: listing.seller,
//       amount: listing.price,
//       status: 'completed',
//       completedAt: new Date()
//     });
//     await transaction.save({ session });
    
//     console.log('✅ Transaction created:', transaction._id);
    
//     // Initialize arrays if they don't exist
//     if (!Array.isArray(collection.previousOwners)) {
//       collection.previousOwners = [];
//     }
//     if (!Array.isArray(collection.transferHistory)) {
//       collection.transferHistory = [];
//     }
    
//     // Add current owner to previousOwners
//     collection.previousOwners.push({
//       user: currentOwner.username,
//       from: collection.createdAt || new Date(),
//       to: new Date()
//     });
    
//     console.log('✅ Previous owner added to history');
    
//     // Transfer ownership
//     collection.user = req.user._id;
//     collection.isListed = false;
//     collection.currentListing = null;
    
//     // Add to transfer history
//     collection.transferHistory.push({
//       from: listing.seller,
//       to: req.user._id,
//       transaction: transaction._id,
//       price: listing.price,
//       transferredAt: new Date()
//     });
    
//     await collection.save({ session });
    
//     console.log('✅ Collection ownership transferred to:', req.user.username);
    
//     // Update listing status
//     listing.status = 'sold';
//     await listing.save({ session });
    
//     console.log('✅ Listing marked as sold');
    
//     // Commit transaction
//     await session.commitTransaction();
    
//     console.log('✅✅✅ Purchase completed successfully!');
//     console.log(`🎉 ${req.user.username} purchased ${collection.brand} from ${currentOwner.username} for $${listing.price}`);
    
//     res.json({ 
//       success: true, 
//       message: 'Collection purchased successfully! Check your profile.',
//       transaction: {
//         id: transaction._id,
//         amount: listing.price,
//         seller: currentOwner.username,
//         collection: collection.brand
//       }
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error('❌❌❌ Purchase error:', error);
//     console.error('Error details:', error.message);
//     console.error('Stack trace:', error.stack);
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Purchase failed: ' + error.message
//     });
//   } finally {
//     session.endSession();
//   }
// });

// // Purchase a collection (Transfer Ownership) - NO TRANSACTIONS (for local MongoDB)
// router.post('/api/purchase/:listingId', authRequired, async (req, res) => {
//   try {
//     console.log('🛒 Purchase attempt by:', req.user.username);
//     console.log('📦 Listing ID:', req.params.listingId);
    
//     // Get listing
//     const listing = await Listing.findById(req.params.listingId);
    
//     if (!listing || listing.status !== 'active') {
//       console.error('❌ Listing not found or not active');
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Listing not available' 
//       });
//     }
    
//     console.log('✅ Listing found, status:', listing.status);
    
//     // Prevent self-purchase
//     if (String(listing.seller) === String(req.user._id)) {
//       console.error('❌ Self-purchase attempt');
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Cannot purchase your own collection' 
//       });
//     }
    
//     // Get collection
//     const collection = await Collection.findById(listing.collection);
//     if (!collection) {
//       console.error('❌ Collection not found');
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Collection not found' 
//       });
//     }
    
//     console.log('✅ Collection found:', collection.brand);
    
//     // Get current owner
//     const currentOwner = await User.findById(collection.user);
//     if (!currentOwner) {
//       console.error('❌ Current owner not found');
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Owner not found' 
//       });
//     }
    
//     console.log('✅ Current owner:', currentOwner.username);
    
//     // Check if already sold (race condition protection)
//     if (collection.user.toString() !== listing.seller.toString()) {
//       console.error('❌ Collection already sold to someone else');
//       return res.status(409).json({ 
//         success: false, 
//         message: 'This item was just purchased by someone else' 
//       });
//     }
    
//     // Create transaction record
//     const transaction = new Transaction({
//       listing: listing._id,
//       collection: collection._id,
//       buyer: req.user._id,
//       seller: listing.seller,
//       amount: listing.price,
//       status: 'completed',
//       completedAt: new Date()
//     });
//     await transaction.save();
    
//     console.log('✅ Transaction created:', transaction._id);
    
//     // Initialize arrays if they don't exist
//     if (!Array.isArray(collection.previousOwners)) {
//       collection.previousOwners = [];
//     }
//     if (!Array.isArray(collection.transferHistory)) {
//       collection.transferHistory = [];
//     }
    
//     // Add current owner to previousOwners
//     collection.previousOwners.push({
//       user: currentOwner.username,
//       from: collection.createdAt || new Date(),
//       to: new Date()
//     });
    
//     console.log('✅ Previous owner added to history');
    
//     // Transfer ownership
//     collection.user = req.user._id;
//     collection.isListed = false;
//     collection.currentListing = null;
    
//     // Add to transfer history
//     collection.transferHistory.push({
//       from: listing.seller,
//       to: req.user._id,
//       transaction: transaction._id,
//       price: listing.price,
//       transferredAt: new Date()
//     });
    
//     await collection.save();
    
//     console.log('✅ Collection ownership transferred to:', req.user.username);
    
//     // Update listing status
//     listing.status = 'sold';
//     await listing.save();
    
//     console.log('✅ Listing marked as sold');
//     console.log('✅✅✅ Purchase completed successfully!');
//     console.log(`🎉 ${req.user.username} purchased ${collection.brand} from ${currentOwner.username} for $${listing.price}`);
    
//     res.json({ 
//       success: true, 
//       message: 'Collection purchased successfully! Check your profile.',
//       transaction: {
//         id: transaction._id,
//         amount: listing.price,
//         seller: currentOwner.username,
//         collection: collection.brand
//       }
//     });
//   } catch (error) {
//     console.error('❌❌❌ Purchase error:', error);
//     console.error('Error details:', error.message);
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Purchase failed: ' + error.message
//     });
//   }
// });


// Purchase a collection - Works in BOTH local and production
router.post('/api/purchase/:listingId', authRequired, async (req, res) => {
  // Check if we're using a replica set (production)
  const useTransactions = process.env.MONGODB_USE_TRANSACTIONS === 'true';
  
  if (useTransactions) {
    // PRODUCTION: Use transactions (MongoDB Atlas or replica set)
    return await purchaseWithTransaction(req, res);
  } else {
    // LOCAL DEVELOPMENT: No transactions
    return await purchaseWithoutTransaction(req, res);
  }
});

// PRODUCTION VERSION - With Transactions
async function purchaseWithTransaction(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('🛒 Purchase (WITH TRANSACTION) by:', req.user.username);
    console.log('📦 Listing ID:', req.params.listingId);
    
    const listing = await Listing.findById(req.params.listingId).session(session);
    
    if (!listing || listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Listing not available' 
      });
    }
    
    if (String(listing.seller) === String(req.user._id)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot purchase your own collection' 
      });
    }
    
    const collection = await Collection.findById(listing.collection).session(session);
    if (!collection) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    
    const currentOwner = await User.findById(collection.user).session(session);
    if (!currentOwner) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }
    
    // Create transaction
    const transaction = new Transaction({
      listing: listing._id,
      collection: collection._id,
      buyer: req.user._id,
      seller: listing.seller,
      amount: listing.price,
      status: 'completed',
      completedAt: new Date()
    });
    await transaction.save({ session });
    
    // Initialize arrays
    if (!Array.isArray(collection.previousOwners)) collection.previousOwners = [];
    if (!Array.isArray(collection.transferHistory)) collection.transferHistory = [];
    
    // Update ownership
    collection.previousOwners.push({
      user: currentOwner.username,
      from: collection.createdAt || new Date(),
      to: new Date()
    });
    
    collection.user = req.user._id;
    collection.isListed = false;
    collection.currentListing = null;
    
    collection.transferHistory.push({
      from: listing.seller,
      to: req.user._id,
      transaction: transaction._id,
      price: listing.price,
      transferredAt: new Date()
    });
    
    await collection.save({ session });
    
    listing.status = 'sold';
    await listing.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    console.log('✅✅✅ Purchase completed (WITH TRANSACTION)');
    
    res.json({ 
      success: true, 
      message: 'Collection purchased successfully!',
      transaction: {
        id: transaction._id,
        amount: listing.price,
        seller: currentOwner.username,
        collection: collection.brand
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Purchase error (transaction):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Purchase failed: ' + error.message
    });
  }
}

// Purchase without transaction (LOCAL DEVELOPMENT) - WITH SELLER APPROVAL
async function purchaseWithoutTransaction(req, res) {
  try {
    console.log('🛒 Purchase (PENDING SELLER APPROVAL) by:', req.user.username);
    console.log('📦 Listing ID:', req.params.listingId);
    console.log('💳 Payment data:', req.body);
    
    const listing = await Listing.findById(req.params.listingId);
    
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ 
        success: false, 
        message: 'Listing not available' 
      });
    }
    
    if (String(listing.seller) === String(req.user._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot purchase your own collection' 
      });
    }
    
    const collection = await Collection.findById(listing.collection);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    
    const currentOwner = await User.findById(collection.user);
    if (!currentOwner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }
    
    // Get payment info from request
    const { paymentMethod, paymentProof } = req.body;
    
    if (!paymentMethod || !paymentMethod.type || !paymentMethod.details) {
      return res.status(400).json({
        success: false,
        message: 'Payment method information is required'
      });
    }
    
    // Create transaction with PENDING status
    const transaction = new Transaction({
      listing: listing._id,
      collection: collection._id,
      buyer: req.user._id,
      seller: listing.seller,
      amount: listing.price,
      paymentMethod: {
        type: paymentMethod.type,
        details: paymentMethod.details
      },
      paymentProof: paymentProof || {},
      status: 'payment_submitted', // WAIT FOR SELLER CONFIRMATION
      paymentSubmittedAt: new Date()
    });
    await transaction.save();
    
    console.log('✅ Transaction created (pending seller approval)');
    
    // Update listing to pending
    listing.status = 'pending';
    await listing.save();
    
    // Create notification for seller
    const Notification = require('../models/Notification');
    const notification = new Notification({
      recipient: listing.seller,
      sender: req.user._id,
      type: 'payment_submitted',
      message: `${req.user.username} has submitted payment for ${collection.brand}. Please confirm receipt.`,
      relatedTransaction: transaction._id,
      relatedListing: listing._id
    });
    await notification.save();
    
    console.log('🔔 Notification sent to seller');
    console.log('⏳ Waiting for seller confirmation');
    
    res.json({ 
      success: true, 
      message: 'Payment submitted! Waiting for seller to confirm receipt.',
      transaction: {
        id: transaction._id,
        amount: listing.price,
        seller: currentOwner.username,
        collection: collection.brand,
        status: 'payment_submitted'
      }
    });
  } catch (error) {
    console.error('❌ Purchase error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Purchase failed: ' + error.message
    });
  }
}





// Get user's listings (for profile page)
router.get('/api/user-listings', authRequired, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user._id })
      .populate('collection')
      .sort('-createdAt')
      .lean();
    
    res.json({ success: true, listings });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's purchase history
router.get('/api/purchases', authRequired, async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      buyer: req.user._id,
      status: 'completed'
    })
      .populate('collection')
      .populate('seller', 'username profileImage')
      .sort('-createdAt')
      .lean();
    
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's sales history
router.get('/api/sales', authRequired, async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      seller: req.user._id,
      status: 'completed'
    })
      .populate('collection')
      .populate('buyer', 'username profileImage')
      .sort('-createdAt')
      .lean();
    
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
