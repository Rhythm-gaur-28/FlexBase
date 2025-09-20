// Tab switching
document.querySelectorAll('.side-nav-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const selected = this.getAttribute('data-tab');
    document.querySelectorAll('.profile-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.getAttribute('data-tab') === selected);
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // ------ EDIT PROFILE MODAL (only for own profile) ------
  const editBtn = document.querySelector('.edit-profile-btn');
  const modal = document.getElementById('editProfileModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const confirmModal = document.getElementById('confirmCancel');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');
  const toast = document.getElementById('toast');
  const form = document.getElementById('editProfileForm');

  // Only add edit profile listeners if elements exist (own profile)
  if (editBtn && modal) {
    editBtn.addEventListener('click', () => {
      // Set modal image preview to current profile image if no new image is selected
      const sidebarImg = document.querySelector('.profile-avatar-big');
      const modalImg = document.getElementById('profile-preview');
      if (sidebarImg && modalImg) {
        modalImg.src = sidebarImg.src;
      }
      // Set modal bio textarea to current bio
      const sidebarBio = document.querySelector('.profile-about');
      const modalBio = document.getElementById('bio');
      if (sidebarBio && modalBio) {
        modalBio.value = sidebarBio.textContent.trim();
      }
      modal.style.display = 'flex';
    });
  }

  if (cancelBtn && confirmModal) {
    cancelBtn.addEventListener('click', () => {
      confirmModal.style.display = 'flex';
    });
  }

  if (confirmYes && confirmModal && modal) {
    confirmYes.addEventListener('click', () => {
      confirmModal.style.display = 'none';
      modal.style.display = 'none';
    });
  }

  if (confirmNo && confirmModal) {
    confirmNo.addEventListener('click', () => {
      confirmModal.style.display = 'none';
    });
  }

  // Close modals on outside click
  if (modal && confirmModal) {
    [modal, confirmModal].forEach(el => {
      el.addEventListener('click', e => {
        if (e.target === el) el.style.display = 'none';
      });
    });
  }

  // Form submit handler (only if form exists)
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const res = await fetch('/profile/update', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        const result = await res.json();

        if (result.success && result.user) {
          // Update images with cache busting if profileImage changed
          const timestamp = '?t=' + new Date().getTime();
          if (result.user.profileImage) {
            document.querySelectorAll('.profile-avatar, .profile-avatar-big, #profile-preview').forEach(img => {
              img.src = result.user.profileImage + timestamp;
            });
          }
          // Update bio text everywhere
          if (typeof result.user.bio !== 'undefined') {
            document.querySelector('.profile-about').textContent = result.user.bio || '';
            document.getElementById('bio').value = result.user.bio || '';
          }
          // Close modal and show success toast
          modal.style.display = 'none';
          toastMessage('Changes saved successfully!');
        } else {
          toastMessage('Failed to save changes.');
        }
      } catch (err) {
        toastMessage('Error updating profile.');
      }
    });
  }

  // Profile picture input handler (only if exists)
  const profilePictureInput = document.getElementById('profilePicture');
  if (profilePictureInput) {
    profilePictureInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const preview = document.getElementById('profile-preview');
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ------ COLLECTIONS MODAL (FIXED) ------
  const collectionsTab = document.querySelector('[data-tab="collections"]');
  const collectionModal = document.getElementById('collectionModal');
  
  if (collectionsTab && collectionModal) {
    const closeBtn = document.getElementById('closeModalBtn');
    const imgSlider = collectionModal.querySelector('.modal-img-slider');
    const sliderInd = collectionModal.querySelector('.slider-indicator');
    const sliderCount = collectionModal.querySelector('.slider-counter');
    const leftArrow = collectionModal.querySelector('.arrow-left');
    const rightArrow = collectionModal.querySelector('.arrow-right');
    const brandEl = collectionModal.querySelector('.modal-brand');
    const priceEl = collectionModal.querySelector('.modal-prices');
    const dateEl = collectionModal.querySelector('.modal-date');
    const timelineEl = collectionModal.querySelector('.ownership-timeline');
    let currentIdx = 0;
    let currentCollection = null;

    // Target ONLY collection cards in the collections tab
    const collectionsTabPane = document.querySelector('[data-tab="collections"]');
    
    // Add click listeners to collection cards (not post cards)
    document.addEventListener('click', (e) => {
      const clickedCard = e.target.closest('.collection-card');
      
      // Check if it's a collection card (has data-index, not data-post-id)
      if (clickedCard && 
          clickedCard.hasAttribute('data-index') && 
          !clickedCard.hasAttribute('data-post-id') &&
          collectionsTabPane.classList.contains('active')) {
        
        const index = parseInt(clickedCard.getAttribute('data-index'));
        openCollectionModal(index);
      }
    });

    function openCollectionModal(idx) {
      // Use the global allCollections variable
      if (typeof allCollections !== 'undefined' && allCollections[idx]) {
        currentCollection = allCollections[idx];
        currentIdx = 0;
        collectionModal.classList.add('open');
        updateCollectionModal();
      } else {
        console.log('Collection not found:', idx, typeof allCollections);
      }
    }

    function updateCollectionModal() {
      if (!imgSlider) return;
      imgSlider.innerHTML = '';
      if (!currentCollection.images || !currentCollection.images.length) return;
      
      currentCollection.images.forEach((src, i) => {
        const im = document.createElement('img');
        im.src = src;
        im.style.display = (i === currentIdx ? 'block' : 'none');
        imgSlider.appendChild(im);
      });
      updateCollectionSliderNav();
      updateCollectionMeta();
      updateCollectionTimeline();
    }

    function updateCollectionSliderNav() {
      if (!imgSlider || !sliderInd || !sliderCount) return;
      
      const imgs = imgSlider.querySelectorAll('img');
      imgs.forEach((im, i) => im.style.display = (i === currentIdx ? 'block' : 'none'));
      sliderInd.innerHTML = '';
      imgs.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = (i === currentIdx ? 'active' : '');
        dot.onclick = () => { currentIdx = i; updateCollectionSliderNav(); };
        sliderInd.appendChild(dot);
      });
      sliderCount.innerHTML = (currentIdx + 1) + '/' + imgs.length;
    }

    if (leftArrow) {
      leftArrow.onclick = () => { 
        if (currentIdx > 0) { 
          currentIdx--; 
          updateCollectionSliderNav(); 
        } 
      };
    }
    
    if (rightArrow) {
      rightArrow.onclick = () => { 
        if (currentCollection && currentIdx < currentCollection.images.length - 1) { 
          currentIdx++; 
          updateCollectionSliderNav(); 
        } 
      };
    }

    function updateCollectionMeta() {
      if (brandEl) brandEl.textContent = currentCollection.brand || '';
      if (priceEl) priceEl.innerHTML = `Bought for: <b>$${currentCollection.boughtAtPrice}</b> &bull; Market: <b>$${currentCollection.marketPrice}</b>`;
      const iso = currentCollection.boughtOn;
      const date = iso ? (new Date(iso)).toLocaleDateString() : "";
      if (dateEl) dateEl.innerHTML = `Bought on <b>${date}</b>`;
    }

    function updateCollectionTimeline() {
      if (!timelineEl) return;
      timelineEl.innerHTML = '';
      const owners = currentCollection.previousOwners || [];
      if (!owners.length) { 
        timelineEl.innerHTML = '<div style="color:#baa;">No previous ownership records.</div>'; 
        return; 
      }
      let points = owners.map((own, idx) => `
        <div class="owner-block">
          <div class="timeline-dot"></div>
          <div class="timeline-owner-label">${own.user || 'User'}</div>
          <div class="timeline-owner-date">
            ${own.from ? (new Date(own.from)).toLocaleDateString() : ''}
            -
            ${own.to ? (new Date(own.to)).toLocaleDateString() : ''}
          </div>
        </div>
      `).join('');
      timelineEl.innerHTML = `
        <div class="timeline-track">
          <div class="timeline-line"></div>
          ${points}
        </div>
      `;
    }

    if (closeBtn) closeBtn.onclick = () => { collectionModal.classList.remove('open'); };
  }

  // ------ POST MODAL ------
  const postModal = document.getElementById('postModal');
  
  if (postModal) {
    const closePostBtn = document.getElementById('closePostModalBtn');
    const postImgSlider = postModal.querySelector('.post-modal-img-slider');
    const postSliderInd = postModal.querySelector('.post-slider-indicator');
    const postSliderCount = postModal.querySelector('.post-slider-counter');
    const postLeftArrow = postModal.querySelector('.post-arrow-left');
    const postRightArrow = postModal.querySelector('.post-arrow-right');
    
    // Post details elements
    const postUserAvatar = postModal.querySelector('.post-user-avatar');
    const postUsername = postModal.querySelector('.post-username');
    const postTimestamp = postModal.querySelector('.post-timestamp');
    const postCaptionText = postModal.querySelector('.post-caption-text');
    const postHashtags = postModal.querySelector('.post-hashtags');
    const likeBtn = postModal.querySelector('#likeBtn');
    const likesCount = postModal.querySelector('.likes-count');
    const commentToggle = postModal.querySelector('#commentToggle');
    const commentsCount = postModal.querySelector('.comments-count');
    const commentsList = postModal.querySelector('#commentsList');
    const commentInput = postModal.querySelector('#commentInput');
    const submitCommentBtn = postModal.querySelector('#submitComment');
    
    let currentPostIdx = 0;
    let currentPostImageIdx = 0;
    let currentPostData = null;

    // Post card click handlers using event delegation
    document.addEventListener('click', (e) => {
      const clickedCard = e.target.closest('.post-card');
      
      if (clickedCard && clickedCard.hasAttribute('data-post-id')) {
        const postId = clickedCard.getAttribute('data-post-id');
        openPostModal(postId);
      }
    });

    async function openPostModal(postId) {
      try {
        // Fetch post data
        const response = await fetch(`/api/posts/${postId}`, {
          credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
          currentPostData = result.post;
          currentPostImageIdx = 0;
          postModal.classList.add('open');
          updatePostModal();
        }
      } catch (error) {
        console.error('Error loading post:', error);
        toastMessage('Error loading post');
      }
    }

    function updatePostModal() {
      if (!currentPostData) return;
      
      // Update images
      updatePostImages();
      
      // Update user info
      if (postUserAvatar) postUserAvatar.src = currentPostData.user.profileImage || '/images/default-profile.jpg';
      if (postUsername) postUsername.textContent = currentPostData.user.username;
      if (postTimestamp) postTimestamp.textContent = new Date(currentPostData.createdAt).toLocaleDateString();
      
      // Update caption
      if (postCaptionText) postCaptionText.textContent = currentPostData.caption || '';
      
      // Update hashtags
      if (postHashtags) {
        postHashtags.innerHTML = '';
        if (currentPostData.hashtags && currentPostData.hashtags.length > 0) {
          currentPostData.hashtags.forEach(tag => {
            const hashtagEl = document.createElement('span');
            hashtagEl.className = 'post-hashtag';
            hashtagEl.textContent = '#' + tag;
            postHashtags.appendChild(hashtagEl);
          });
        }
      }
      
      // Update like button
      if (likeBtn) {
        likeBtn.classList.toggle('liked', currentPostData.isLiked);
      }
      if (likesCount) likesCount.textContent = currentPostData.likesCount || 0;
      
      // Update comments count
      if (commentsCount) commentsCount.textContent = currentPostData.commentsCount || 0;
      
      // Load comments
      loadComments();
      
      // Make username clickable
      if (postUsername) {
        postUsername.onclick = () => {
          window.location.href = '/u/' + currentPostData.user.username;
        };
      }
    }

    function updatePostImages() {
      if (!postImgSlider) return;
      postImgSlider.innerHTML = '';
      if (!currentPostData.images || !currentPostData.images.length) return;
      
      currentPostData.images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.style.display = (i === currentPostImageIdx ? 'block' : 'none');
        postImgSlider.appendChild(img);
      });
      
      updatePostSliderNav();
    }

    function updatePostSliderNav() {
      if (!postImgSlider) return;
      const imgs = postImgSlider.querySelectorAll('img');
      imgs.forEach((img, i) => img.style.display = (i === currentPostImageIdx ? 'block' : 'none'));
      
      // Update indicators
      if (postSliderInd) {
        postSliderInd.innerHTML = '';
        imgs.forEach((_, i) => {
          const dot = document.createElement('span');
          dot.className = (i === currentPostImageIdx ? 'active' : '');
          dot.onclick = () => { 
            currentPostImageIdx = i; 
            updatePostSliderNav(); 
          };
          postSliderInd.appendChild(dot);
        });
      }
      
      // Update counter
      if (postSliderCount) postSliderCount.textContent = `${currentPostImageIdx + 1}/${imgs.length}`;
      
      // Show/hide arrows
      if (postLeftArrow) postLeftArrow.style.display = imgs.length > 1 ? 'flex' : 'none';
      if (postRightArrow) postRightArrow.style.display = imgs.length > 1 ? 'flex' : 'none';
      if (postSliderInd) postSliderInd.style.display = imgs.length > 1 ? 'block' : 'none';
    }

    // Arrow navigation
    if (postLeftArrow) {
      postLeftArrow.onclick = () => {
        if (currentPostImageIdx > 0) {
          currentPostImageIdx--;
          updatePostSliderNav();
        }
      };
    }

    if (postRightArrow) {
      postRightArrow.onclick = () => {
        if (currentPostData && currentPostImageIdx < currentPostData.images.length - 1) {
          currentPostImageIdx++;
          updatePostSliderNav();
        }
      };
    }

    // Like button functionality
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        if (!currentPostData) return;
        
        try {
          const response = await fetch(`/api/posts/${currentPostData._id}/like`, {
            method: 'POST',
            credentials: 'include'
          });
          const result = await response.json();
          
          if (result.success) {
            currentPostData.isLiked = result.isLiked;
            currentPostData.likesCount = result.likesCount;
            likeBtn.classList.toggle('liked', result.isLiked);
            if (likesCount) likesCount.textContent = result.likesCount;
          }
        } catch (error) {
          console.error('Error toggling like:', error);
        }
      });
    }

    // Submit comment
    if (submitCommentBtn) {
      submitCommentBtn.addEventListener('click', async () => {
        const text = commentInput ? commentInput.value.trim() : '';
        if (!text || !currentPostData) return;
        
        try {
          submitCommentBtn.disabled = true;
          const response = await fetch(`/api/posts/${currentPostData._id}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text })
          });
          const result = await response.json();
          
          if (result.success) {
            currentPostData.comments = currentPostData.comments || [];
            currentPostData.comments.push(result.comment);
            currentPostData.commentsCount = result.commentsCount;
            if (commentsCount) commentsCount.textContent = result.commentsCount;
            if (commentInput) commentInput.value = '';
            loadComments();
          }
        } catch (error) {
          console.error('Error adding comment:', error);
        } finally {
          submitCommentBtn.disabled = false;
        }
      });
    }

    // Enter key to submit comment
    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (submitCommentBtn) submitCommentBtn.click();
        }
      });
    }

    function loadComments() {
      if (!commentsList || !currentPostData.comments) return;
      
      commentsList.innerHTML = '';
      currentPostData.comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        
        const timeAgo = getTimeAgo(new Date(comment.createdAt));
        
        commentEl.innerHTML = `
          <img src="${comment.user.profileImage || '/images/default-profile.jpg'}" alt="${comment.user.username}" class="comment-avatar">
          <div class="comment-content">
            <div class="comment-username" onclick="window.location.href='/u/${comment.user.username}'">${comment.user.username}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-timestamp">${timeAgo}</div>
          </div>
        `;
        
        commentsList.appendChild(commentEl);
      });
      
      // Scroll to bottom
      commentsList.scrollTop = commentsList.scrollHeight;
    }

    function getTimeAgo(date) {
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + 'm ago';
      if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + 'h ago';
      if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + 'd ago';
      return date.toLocaleDateString();
    }

    // Close modal
    if (closePostBtn) {
      closePostBtn.onclick = () => {
        postModal.classList.remove('open');
      };
    }
  }

  // ------ FOLLOW FUNCTIONALITY (only for other profiles) ------
  const followForm = document.getElementById('followForm');
  const followBtn = document.getElementById('followBtn');
  
  if (followForm && followBtn) {
    followForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = window.location.pathname.split('/u/')[1];
      if (!username) return;
      
      const action = followBtn.textContent.trim() === 'Follow' ? 'follow' : 'unfollow';
      followBtn.disabled = true;
      
      try {
        const res = await fetch(`/u/${username}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        const data = await res.json();
        
        if (data.success) {
          followBtn.textContent = action === 'follow' ? 'Unfollow' : 'Follow';
          // Update follower count
          const followerCountEl = document.querySelector('[data-tab="followers"] .profile-count');
          if (followerCountEl) {
            let currentCount = parseInt(followerCountEl.textContent) || 0;
            followerCountEl.textContent = action === 'follow' ? currentCount + 1 : Math.max(0, currentCount - 1);
          }
          toastMessage(action === 'follow' ? 'Successfully followed!' : 'Successfully unfollowed!');
        } else {
          toastMessage(data.message || 'An error occurred');
        }
      } catch {
        toastMessage('Network/server error');
      } finally {
        followBtn.disabled = false;
      }
    });
  }

  // ------ FOLLOWERS/FOLLOWING LIST ACTIONS ------
  // Remove follower functionality
  document.querySelectorAll('.btn-remove-follower').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const username = e.target.getAttribute('data-username');
      if (!username) return;
      
      if (!confirm(`Remove ${username} from your followers?`)) return;
      
      e.target.disabled = true;
      try {
        const res = await fetch('/profile/remove-follower', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username })
        });
        
        const data = await res.json();
        if (data.success) {
          // Remove user item from DOM
          const userItem = e.target.closest('.user-item');
          userItem.remove();
          
          // Update follower count
          const followerCountEl = document.querySelector('[data-tab="followers"] .profile-count');
          if (followerCountEl) {
            let currentCount = parseInt(followerCountEl.textContent) || 0;
            followerCountEl.textContent = Math.max(0, currentCount - 1);
          }
          
          toastMessage(`${username} removed from followers`);
        } else {
          toastMessage(data.message || 'Failed to remove follower');
        }
      } catch {
        toastMessage('Network error');
      } finally {
        e.target.disabled = false;
      }
    });
  });

  // Unfollow user functionality
  document.querySelectorAll('.btn-unfollow-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const username = e.target.getAttribute('data-username');
      if (!username) return;
      
      if (!confirm(`Unfollow ${username}?`)) return;
      
      e.target.disabled = true;
      try {
        const res = await fetch('/profile/unfollow-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username })
        });
        
        const data = await res.json();
        if (data.success) {
          // Remove user item from DOM
          const userItem = e.target.closest('.user-item');
          userItem.remove();
          
          // Update following count
          const followingCountEl = document.querySelector('[data-tab="following"] .profile-count');
          if (followingCountEl) {
            let currentCount = parseInt(followingCountEl.textContent) || 0;
            followingCountEl.textContent = Math.max(0, currentCount - 1);
          }
          
          toastMessage(`Unfollowed ${username}`);
        } else {
          toastMessage(data.message || 'Failed to unfollow');
        }
      } catch {
        toastMessage('Network error');
      } finally {
        e.target.disabled = false;
      }
    });
  });

  // Make usernames clickable to visit profiles
  document.querySelectorAll('.user-username').forEach(username => {
    username.addEventListener('click', () => {
      const usernameText = username.textContent.trim();
      window.location.href = '/u/' + encodeURIComponent(usernameText);
    });
  });

  // Toast message helper
  function toastMessage(message) {
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  }
});
