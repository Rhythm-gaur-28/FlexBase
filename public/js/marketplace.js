let allListings = [];

async function loadListings() {
  try {
    const params = new URLSearchParams({
      sort: document.getElementById('sortFilter')?.value || '-createdAt'
    });
    
    const brand = document.getElementById('brandFilter')?.value;
    const minPrice = document.getElementById('minPrice')?.value;
    const maxPrice = document.getElementById('maxPrice')?.value;
    
    if (brand) params.append('brand', brand);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    const response = await fetch(`/marketplace/api/listings?${params}`);
    const data = await response.json();
    
    if (data.success) {
      allListings = data.listings;
      displayListings(data.listings);
    } else {
      document.getElementById('listings-grid').innerHTML = 
        '<p class="error">Failed to load listings</p>';
    }
  } catch (error) {
    console.error('Error loading listings:', error);
    document.getElementById('listings-grid').innerHTML = 
      '<p class="error">Error loading listings</p>';
  }
}

function displayListings(listings) {
  const grid = document.getElementById('listings-grid');
  
  if (listings.length === 0) {
    grid.innerHTML = '<p class="no-results">No listings found. Be the first to sell your collection!</p>';
    return;
  }
  
  grid.innerHTML = listings.map(listing => {
    if (!listing.collection) return '';
    
    return `
    <div class="listing-card" onclick="viewListing('${listing._id}')">
      <div class="listing-image">
        <img src="${listing.collection.images[0] || '/images/default-profile.jpg'}" 
             alt="${listing.title}">
        ${listing.collection.images.length > 1 ? 
          `<span class="image-count">+${listing.collection.images.length - 1} more</span>` : ''}
      </div>
      <div class="listing-info">
        <h3>${listing.title}</h3>
        <p class="brand">${listing.collection.brand}</p>
        <p class="price">$${listing.price.toFixed(2)}</p>
        <div class="seller-info">
          <img src="${listing.seller.profileImage}" alt="${listing.seller.username}">
          <span>@${listing.seller.username}</span>
        </div>
        <div class="listing-stats">
          <span>👁️ ${listing.views} views</span>
        </div>
      </div>
    </div>
  `}).join('');
}

async function viewListing(listingId) {
  try {
    const response = await fetch(`/marketplace/api/listings/${listingId}`);
    const data = await response.json();
    
    if (data.success) {
      showListingModal(data.listing);
    }
  } catch (error) {
    console.error('Error viewing listing:', error);
    alert('Failed to load listing details');
  }
}

function showListingModal(listing) {
  const modal = document.getElementById('listingModal');
  const details = document.getElementById('listingDetails');
  
  const images = listing.collection.images.map((img, idx) => 
    `<img src="${img}" alt="Image ${idx + 1}" class="listing-detail-image">`
  ).join('');
  
  const previousOwnersHtml = listing.collection.previousOwners && listing.collection.previousOwners.length > 0 ? `
    <div class="ownership-history">
      <h3>Previous Owners</h3>
      <ul>
        ${listing.collection.previousOwners.map(owner => `
          <li>@${owner.user} (${new Date(owner.from).toLocaleDateString()} - ${new Date(owner.to).toLocaleDateString()})</li>
        `).join('')}
      </ul>
    </div>
  ` : '';
  
  details.innerHTML = `
    <div class="listing-detail">
      <div class="listing-images">
        ${images}
      </div>
      <div class="listing-content">
        <h2>${listing.title}</h2>
        <p class="listing-price">$${listing.price.toFixed(2)}</p>
        
        <div class="collection-details">
          <h3>Collection Details</h3>
          <p><strong>Brand:</strong> ${listing.collection.brand}</p>
          <p><strong>Bought On:</strong> ${new Date(listing.collection.boughtOn).toLocaleDateString()}</p>
          <p><strong>Original Price:</strong> $${listing.collection.boughtAtPrice}</p>
          <p><strong>Market Price:</strong> $${listing.collection.marketPrice}</p>
        </div>
        
        ${listing.description ? `
          <div class="description">
            <h3>Description</h3>
            <p>${listing.description}</p>
          </div>
        ` : ''}
        
        <div class="seller-section">
          <h3>Seller</h3>
          <div class="seller-profile">
            <img src="${listing.seller.profileImage}" alt="${listing.seller.username}">
            <div>
              <p><strong>@${listing.seller.username}</strong></p>
              ${listing.seller.bio ? `<p class="bio">${listing.seller.bio}</p>` : ''}
            </div>
          </div>
        </div>
        
        ${previousOwnersHtml}
        
        <button class="btn-purchase" onclick="purchaseCollection('${listing._id}')">
          Purchase Now
        </button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

function closeModal() {
  document.getElementById('listingModal').style.display = 'none';
}

async function purchaseCollection(listingId) {
  if (!confirm('Are you sure you want to purchase this collection?')) {
    return;
  }
  
  try {
    const response = await fetch(`/marketplace/api/purchase/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('🎉 Collection purchased successfully! Check your profile.');
      closeModal();
      loadListings();
    } else {
      alert(data.message || 'Purchase failed');
    }
  } catch (error) {
    console.error('Purchase error:', error);
    alert('Purchase failed. Please try again.');
  }
}

function applyFilters() {
  loadListings();
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('listingModal');
  if (event.target === modal) {
    closeModal();
  }
}

// Load listings on page load
document.addEventListener('DOMContentLoaded', loadListings);


// Global variable to store current listing
let currentPurchaseListing = null;

// Update the existing purchaseCollection function
function purchaseCollection(listingId) {
    openPurchaseModal(listingId);
}

// Open purchase modal
function openPurchaseModal(listingId) {
    console.log('Opening purchase modal for listing:', listingId);
    
    fetch(`/marketplace/api/listings/${listingId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentPurchaseListing = data.listing;
                displayPurchaseModal(data.listing);
            } else {
                showNotification(data.message || 'Failed to load listing details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading listing:', error);
            showNotification('Error loading listing', 'error');
        });
}

function displayPurchaseModal(listing) {
    console.log('Displaying purchase modal with listing:', listing);
    
    // Set item preview
    document.getElementById('purchaseItemImage').src = listing.collection.images[0];
    document.getElementById('purchaseItemTitle').textContent = listing.title;
    document.getElementById('purchaseItemPrice').textContent = `$${listing.price}`;
    document.getElementById('currentListingId').value = listing._id;
    
    // Display payment options
    const optionsContainer = document.getElementById('paymentOptionsContainer');
    optionsContainer.innerHTML = '';
    
    if (listing.paymentMethods && listing.paymentMethods.length > 0) {
        listing.paymentMethods.forEach((method, index) => {
            const option = document.createElement('div');
            option.className = 'payment-option';
            option.onclick = () => selectPaymentMethod(index);
            option.innerHTML = `
                <div class="payment-option-radio"></div>
                <div class="payment-option-info">
                    <div class="payment-option-type">${method.type}</div>
                    <div class="payment-option-details">${method.details}</div>
                    ${method.name ? `<div class="payment-option-details">${method.name}</div>` : ''}
                </div>
            `;
            optionsContainer.appendChild(option);
        });
    } else {
        optionsContainer.innerHTML = '<p style="color: #999;">No payment methods available for this listing.</p>';
    }
    
    // Show modal
    document.getElementById('purchaseModal').classList.add('show');
}

function selectPaymentMethod(index) {
    console.log('Selected payment method index:', index);
    
    // Update radio buttons
    document.querySelectorAll('.payment-option').forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });
    
    // Store selected index
    document.getElementById('selectedPaymentMethodIndex').value = index;
    
    // Show payment details
    const method = currentPurchaseListing.paymentMethods[index];
    const detailsSection = document.getElementById('paymentDetailsSection');
    const detailsDisplay = document.getElementById('selectedPaymentDetails');
    
    detailsDisplay.innerHTML = `
        <h4>📋 Payment Details</h4>
        <div class="payment-detail-row">
            <span class="payment-detail-label">Method:</span>
            <span class="payment-detail-value">${method.type}</span>
        </div>
        <div class="payment-detail-row">
            <span class="payment-detail-label">Details:</span>
            <span class="payment-detail-value">${method.details}</span>
        </div>
        ${method.name ? `
            <div class="payment-detail-row">
                <span class="payment-detail-label">Account Name:</span>
                <span class="payment-detail-value">${method.name}</span>
            </div>
        ` : ''}
        <div class="payment-detail-row">
            <span class="payment-detail-label">Amount:</span>
            <span class="payment-detail-value">$${currentPurchaseListing.price}</span>
        </div>
        <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
            ⚠️ Please complete the payment using the above details, then click "I've Made the Payment" below.
        </p>
    `;
    
    detailsSection.style.display = 'block';
    document.getElementById('confirmPaymentBtn').style.display = 'block';
}

function submitPurchase() {
    const listingId = document.getElementById('currentListingId').value;
    const methodIndex = parseInt(document.getElementById('selectedPaymentMethodIndex').value);
    const transactionId = document.getElementById('transactionId').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();
    
    if (isNaN(methodIndex)) {
        showNotification('Please select a payment method', 'error');
        return;
    }
    
    const selectedMethod = currentPurchaseListing.paymentMethods[methodIndex];
    
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
    
    console.log('Submitting purchase with payment method:', selectedMethod);
    
    fetch(`/marketplace/api/purchase/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            paymentMethod: {
                type: selectedMethod.type,
                details: selectedMethod.details
            },
            paymentProof: {
                transactionId: transactionId,
                notes: notes
            }
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('✅ Purchase successful! Wait till seller confirmation', 'success');
            closePurchaseModal();
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
        } else {
            showNotification(data.message || 'Purchase failed', 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✓ I\'ve Made the Payment';
        }
    })
    .catch(error => {
        console.error('Purchase error:', error);
        showNotification('Purchase failed. Please try again.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ I\'ve Made the Payment';
    });
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.remove('show');
    document.getElementById('paymentDetailsSection').style.display = 'none';
    document.getElementById('confirmPaymentBtn').style.display = 'none';
    document.getElementById('transactionId').value = '';
    document.getElementById('paymentNotes').value = '';
    document.getElementById('selectedPaymentMethodIndex').value = '';
    currentPurchaseListing = null;
    
    console.log('Purchase modal closed');
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set message and type
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

