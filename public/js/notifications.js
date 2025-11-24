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
    <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead('${notif._id}')">
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
        <img src="${tx.buyer.profileImage}" alt="${tx.buyer.username}" class="buyer-avatar">
        <div>
          <h3>${tx.buyer.username} wants to buy ${tx.collection.brand}</h3>
          <p class="tx-amount">Amount: $${tx.amount}</p>
          <p class="tx-payment">Payment Method: ${tx.paymentMethod.type}</p>
          <p class="tx-details">Details: ${tx.paymentMethod.details}</p>
          ${tx.paymentProof.transactionId ? `<p class="tx-ref">Ref: ${tx.paymentProof.transactionId}</p>` : ''}
          ${tx.paymentProof.notes ? `<p class="tx-notes">Notes: ${tx.paymentProof.notes}</p>` : ''}
        </div>
      </div>
      <div class="tx-actions">
        <button onclick="confirmPayment('${tx._id}')" class="btn-confirm">✓ Confirm Payment Received</button>
        <button onclick="rejectPayment('${tx._id}')" class="btn-reject">✗ Payment Not Received</button>
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

async function markAsRead(notificationId) {
  try {
    await fetch(`/notifications/api/notifications/${notificationId}/read`, {
      method: 'POST'
    });
    loadNotifications();
  } catch (error) {
    console.error('Error marking as read:', error);
  }
}

async function markAllRead() {
  // Implement mark all as read
  alert('Mark all read - to be implemented');
}

function getNotificationIcon(type) {
  const icons = {
    'payment_submitted': '💳',
    'payment_confirmed': '✅',
    'payment_rejected': '❌',
    'purchase_complete': '🎉'
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
  loadNotifications();
  loadPendingTransactions();
});
