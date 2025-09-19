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

  // ------ COLLECTIONS MODAL ------
  const grid = document.querySelector('.collection-grid');
  const collectionModal = document.getElementById('collectionModal');
  
  if (grid && collectionModal) {
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

    // Grid click
    grid.querySelectorAll('.collection-card').forEach(card => {
      card.onclick = () => openModal(parseInt(card.getAttribute('data-index')));
    });

    function openModal(idx) {
      currentCollection = allCollections[idx];
      currentIdx = 0;
      collectionModal.classList.add('open');
      updateModal();
    }

    function updateModal() {
      imgSlider.innerHTML = '';
      if (!currentCollection.images || !currentCollection.images.length) return;
      currentCollection.images.forEach((src, i) => {
        const im = document.createElement('img');
        im.src = src;
        im.style.display = (i === currentIdx ? 'block' : 'none');
        imgSlider.appendChild(im);
      });
      updateSliderNav();
      updateMeta();
      updateTimeline();
    }

    function updateSliderNav() {
      const imgs = imgSlider.querySelectorAll('img');
      imgs.forEach((im, i) => im.style.display = (i === currentIdx ? 'block' : 'none'));
      sliderInd.innerHTML = '';
      imgs.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = (i === currentIdx ? 'active' : '');
        dot.onclick = () => { currentIdx = i; updateSliderNav(); };
        sliderInd.appendChild(dot);
      });
      sliderCount.innerHTML = (currentIdx + 1) + '/' + imgs.length;
    }

    if (leftArrow) leftArrow.onclick = () => { if (currentIdx > 0) { currentIdx--; updateSliderNav(); } };
    if (rightArrow) rightArrow.onclick = () => { if (currentCollection && currentIdx < currentCollection.images.length - 1) { currentIdx++; updateSliderNav(); } };

    function updateMeta() {
      brandEl.textContent = currentCollection.brand || '';
      priceEl.innerHTML = `Bought for: <b>$${currentCollection.boughtAtPrice}</b> &bull; Market: <b>$${currentCollection.marketPrice}</b>`;
      const iso = currentCollection.boughtOn;
      const date = iso ? (new Date(iso)).toLocaleDateString() : "";
      dateEl.innerHTML = `Bought on <b>${date}</b>`;
    }

    function updateTimeline() {
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
