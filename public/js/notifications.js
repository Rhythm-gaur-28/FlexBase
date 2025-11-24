// Load notifications
async function loadNotifications() {
  try {
    const response = await fetch('/notifications/api/notifications');
    const data = await response.json();
    
    if (data.success) {
      displayNotifications(data.notifications);
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Load pending transactions
async function loadPendingTransactions() {
  try {
    const response = await fetch('/notifications/api/pending-transactions');
    const data = await response.json();
    
    if (data.success && data.transactions.length > 0) {
      displayPendingTransactions(data.transactions);
      document.getElementById('pendingTransactionsSection').style.display = 'block';
    } else {
      document.getElementById('pendingTransactionsSection').style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading pending transactions:', error);
  }
}

function displayNotifications(notifications) {
  const container = document.getElementById('notificationsList');
  
  if (notifications.length === 0) {
    container.innerHTML = '<p class="no-notifications">No notifications yet</p>';
    return;
  }
  
  container.innerHTML = notifications.map(notif => `
    <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
         data-notification-id="${notif._id}"
         onclick="markAsRead('${notif._id}')">
      <div class="notif-icon ${notif.type}">
        ${getNotificationIcon(notif.type)}
      </div>
      <div class="notif-content">
        <p class="notif-message">${notif.message}</p>
        <span class="notif-time">${getTimeAgo(new Date(notif.createdAt))}</span>
      </div>
      ${!notif.read ? '<div class="unread-dot"></div>' : ''}
    </div>
  `).join('');
}

function displayPendingTransactions(transactions) {
  const container = document.getElementById('pendingTransactions');
  
  container.innerHTML = transactions.map(tx => `
    <div class="pending-transaction-card">
      <div class="tx-info">
        <img src="${tx.buyer.profileImage || '/images/default-profile.jpg'}" alt="${tx.buyer.username}" class="buyer-avatar">
        <div>
          <h3>${tx.buyer.username} wants to buy ${tx.collection.brand}</h3>
          <p class="tx-amount">Amount: $${tx.amount}</p>
          <p class="tx-payment">Payment Method: ${tx.paymentMethod.type}</p>
          <p class="tx-details">Details: ${tx.paymentMethod.details}</p>
          ${tx.paymentProof?.transactionId ? `<p class="tx-ref">Ref: ${tx.paymentProof.transactionId}</p>` : ''}
          ${tx.paymentProof?.notes ? `<p class="tx-notes">Notes: ${tx.paymentProof.notes}</p>` : ''}
        </div>
      </div>
      <div class="tx-actions">
        <button onclick="event.stopPropagation(); confirmPayment('${tx._id}')" class="btn-confirm">✓ Confirm Payment Received</button>
        <button onclick="event.stopPropagation(); rejectPayment('${tx._id}')" class="btn-reject">✗ Payment Not Received</button>
      </div>
    </div>
  `).join('');
}

async function confirmPayment(transactionId) {
  if (!confirm('Confirm that you have received the payment?')) return;
  
  try {
    const response = await fetch(`/notifications/api/transactions/${transactionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Payment confirmed! Item transferred to buyer.');
      loadPendingTransactions();
      loadNotifications();
    } else {
      alert(data.message || 'Failed to confirm payment');
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    alert('Error confirming payment');
  }
}

async function rejectPayment(transactionId) {
  const reason = prompt('Why are you rejecting this payment?');
  if (!reason) return;
  
  try {
    const response = await fetch(`/notifications/api/transactions/${transactionId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Payment rejected. Listing reactivated.');
      loadPendingTransactions();
      loadNotifications();
    } else {
      alert(data.message || 'Failed to reject payment');
    }
  } catch (error) {
    console.error('Error rejecting payment:', error);
    alert('Error rejecting payment');
  }
}

// FIXED: Mark as read function
async function markAsRead(notificationId) {
  try {
    console.log('Marking notification as read:', notificationId);
    
    const response = await fetch(`/notifications/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Mark as read response:', data);
    
    if (data.success) {
      // Update UI immediately without reloading
      const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
      if (notificationElement) {
        notificationElement.classList.remove('unread');
        notificationElement.classList.add('read');
        
        // Remove unread dot
        const unreadDot = notificationElement.querySelector('.unread-dot');
        if (unreadDot) {
          unreadDot.remove();
        }
      }
      
      console.log('✅ Notification marked as read');
    } else {
      console.error('Failed to mark as read:', data.message);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
}

// FIXED: Mark all as read
async function markAllRead() {
  try {
    console.log('Marking all notifications as read');
    
    // Get all unread notification IDs
    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
    
    if (unreadNotifications.length === 0) {
      alert('No unread notifications');
      return;
    }
    
    if (!confirm(`Mark ${unreadNotifications.length} notifications as read?`)) {
      return;
    }
    
    // Mark each as read
    const promises = Array.from(unreadNotifications).map(item => {
      const notificationId = item.getAttribute('data-notification-id');
      return fetch(`/notifications/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    await Promise.all(promises);
    
    // Update UI
    unreadNotifications.forEach(item => {
      item.classList.remove('unread');
      item.classList.add('read');
      
      const unreadDot = item.querySelector('.unread-dot');
      if (unreadDot) {
        unreadDot.remove();
      }
    });
    
    alert('✅ All notifications marked as read');
    console.log('✅ All notifications marked as read');
    
  } catch (error) {
    console.error('Error marking all as read:', error);
    alert('Error marking all notifications as read');
  }
}

function getNotificationIcon(type) {
  const icons = {
    'payment_submitted': '💳',
    'payment_confirmed': '✅',
    'payment_rejected': '❌',
    'purchase_complete': '🎉',
    'offer_received': '💵',
    'offer_accepted': '✔️',
    'offer_declined': '❌',
    'payment_requested': '💰',
    'ownership_transferred': '🎁'
  };
  return icons[type] || '🔔';
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return date.toLocaleDateString();
}

// Load on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Notifications page loaded');
  loadNotifications();
  loadPendingTransactions();
  
  // Refresh every 30 seconds
  setInterval(() => {
    loadNotifications();
    loadPendingTransactions();
  }, 30000);
});
