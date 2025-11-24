const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const Notification = require('../models/Notification');
const authRequired = require('../middleware/authRequired');


// ============= NOTIFICATION HELPER FOR CHAT =============
async function createChatNotification(recipientId, senderId, chatId, messagePreview, io) {
  try {
    // Don't notify yourself
    if (String(recipientId) === String(senderId)) {
      return;
    }
    
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type: 'new_message',
      message: 'sent you a message',
      relatedChat: chatId,
      data: {
        chatPreview: messagePreview
      },
      read: false
    });
    
    await notification.save();
    
    // Send real-time notification
    if (io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'username profileImage')
        .lean();
      
      io.to(`user_${recipientId}`).emit('newNotification', {
        notification: populatedNotification
      });
    }
    
    console.log(`✅ Chat notification sent to user ${recipientId}`);
    
  } catch (error) {
    console.error('Error creating chat notification:', error);
  }
}
// ============= END NOTIFICATION HELPER =============

// Get user's chat list
router.get('/chats', authRequired, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      type: 'private'
    })
    .populate('participants', 'username profileImage')
    .populate('lastMessage')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username' }
    })
    .sort({ lastActivity: -1 });

    // Get or create community chat (FIXED: Prevent duplicates)
    let communityChat = await Chat.findOne({ type: 'community' })
      .populate('participants', 'username profileImage')
      .populate('lastMessage')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' }
      });

    if (!communityChat) {
      // Create community chat only once
      communityChat = await Chat.create({
        type: 'community',
        name: 'FlexBase Community',
        description: 'Connect with sneaker enthusiasts worldwide',
        participants: [req.user._id],
        createdBy: req.user._id
      });
      
      await communityChat.populate('participants', 'username profileImage');
    } else {
      // FIXED: Only add user if not already in participants
      const isUserInCommunity = communityChat.participants.some(
        participant => participant._id.toString() === req.user._id.toString()
      );
      
      if (!isUserInCommunity) {
        communityChat.participants.push(req.user._id);
        await communityChat.save();
        await communityChat.populate('participants', 'username profileImage');
      }
    }

    res.json({
      success: true,
      chats,
      communityChat
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get messages for a specific chat
router.get('/chats/:chatId/messages', authRequired, async (req, res) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // For community chat, allow any authenticated user
    // For private chat, check if user is participant
    if (chat.type === 'private' && !chat.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({ 
      chatId, 
      deleted: false 
    })
    .populate('sender', 'username profileImage')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    // Mark messages as read
    await Message.updateMany(
      { 
        chatId, 
        'readBy.user': { $ne: req.user._id },
        sender: { $ne: req.user._id }
      },
      { 
        $push: { 
          readBy: { 
            user: req.user._id, 
            readAt: new Date() 
          } 
        } 
      }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Send message with notifications
router.post('/chats/:chatId/messages', authRequired, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // For community chat, add user to participants if not already there
    if (chat.type === 'community') {
      const isUserInChat = chat.participants.some(
        participantId => participantId.toString() === req.user._id.toString()
      );
      
      if (!isUserInChat) {
        chat.participants.push(req.user._id);
        await chat.save();
      }
    } else if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Create the message
    const message = await Message.create({
      chatId,
      sender: req.user._id,
      content: content.trim(),
      messageType,
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    await message.populate('sender', 'username profileImage');

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    chat.lastActivity = new Date();
    await chat.save();

    // Get Socket.IO instance
    const io = req.app.get('io');
    
    if (io) {
      // Prepare message preview for notifications
      const messagePreview = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      
      // For community chat
      if (chat.type === 'community') {
        // Emit message to all users
        io.emit('newMessage', {
          chatId,
          message,
          senderId: req.user._id.toString()
        });
        
        // ⭐ NEW - Send notifications to all community members except sender
        const otherParticipants = chat.participants.filter(
          participantId => participantId.toString() !== req.user._id.toString()
        );
        
        for (const participantId of otherParticipants) {
          await createChatNotification(
            participantId,
            req.user._id,
            chatId,
            `📢 Community: ${messagePreview}`,
            io
          );
        }
        
      } else {
        // For private chat
        const otherParticipants = chat.participants.filter(
          participantId => participantId.toString() !== req.user._id.toString()
        );
        
        otherParticipants.forEach(participantId => {
          // Emit real-time message
          io.to(`user_${participantId}`).emit('newMessage', {
            chatId,
            message
          });
        });
        
        // ⭐ NEW - Send notification to other participant
        for (const participantId of otherParticipants) {
          await createChatNotification(
            participantId,
            req.user._id,
            chatId,
            messagePreview,
            io
          );
        }
      }
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Create or get private chat
router.post('/chats/private', authRequired, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, userId], $size: 2 }
    }).populate('participants', 'username profileImage');

    if (!chat) {
      chat = await Chat.create({
        type: 'private',
        participants: [req.user._id, userId],
        createdBy: req.user._id
      });
      
      await chat.populate('participants', 'username profileImage');
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users for chat
router.get('/search-users', authRequired, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: q.trim(), $options: 'i' }
    })
    .select('username profileImage')
    .limit(10);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Clear chat messages
router.delete('/chats/:chatId/clear', authRequired, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check permissions
    if (chat.type === 'private') {
      // For private chats, user must be a participant
      if (!chat.participants.includes(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (chat.type === 'community') {
      // For community chats, you might want to restrict this to admins only
      // For now, allow any participant to clear (you can modify this logic)
      if (!chat.participants.includes(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Count messages before deletion for logging
    const messageCount = await Message.countDocuments({ chatId, deleted: false });
    
    // Mark all messages as deleted (soft delete)
    await Message.updateMany(
      { chatId, deleted: false },
      { 
        deleted: true, 
        deletedAt: new Date(),
        deletedBy: req.user._id
      }
    );

    // Update chat's last message to null
    chat.lastMessage = null;
    chat.lastActivity = new Date();
    await chat.save();

    // Log the action
    console.log(`🧹 Chat cleared: ${chat.type} chat (${chatId}) - ${messageCount} messages deleted by user ${req.user.username}`);

    // Emit to all chat participants
    const io = req.app.get('io');
    if (io) {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== req.user._id.toString()) {
          io.to(`user_${participantId}`).emit('chatCleared', {
            chatId,
            chatType: chat.type,
            clearedBy: {
              id: req.user._id,
              username: req.user.username
            }
          });
        }
      });
    }

    res.json({
      success: true,
      message: `Successfully cleared ${messageCount} messages`,
      messagesDeleted: messageCount
    });

  } catch (error) {
    console.error('❌ Error clearing chat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while clearing chat' 
    });
  }
});

module.exports = router;
