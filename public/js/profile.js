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
  const editBtn = document.querySelector('.edit-profile-btn');
  const modal = document.getElementById('editProfileModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const confirmModal = document.getElementById('confirmCancel');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');
  const toast = document.getElementById('toast');
  const form = document.getElementById('editProfileForm');

  // Open modal
  editBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  // Cancel button confirmation
  cancelBtn.addEventListener('click', () => {
    confirmModal.style.display = 'flex';
  });

  // Confirm cancel - close both modals
  confirmYes.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    modal.style.display = 'none';
  });

  // Decline cancel - close confirmation but keep modal open
  confirmNo.addEventListener('click', () => {
    confirmModal.style.display = 'none';
  });

  // Close modals on outside click
  [modal, confirmModal].forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) el.style.display = 'none';
    });
  });

  // Form submit handler
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

      if (result.success) {
        // Update images with cache busting
        const timestamp = '?t=' + new Date().getTime();
        document.querySelectorAll('.profile-avatar, .profile-avatar-big').forEach(img => {
          img.src = result.profileImage + timestamp;
        });
        // Update bio text
        document.querySelector('.profile-about').textContent = result.bio || '';
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

  // Toast message helper
  function toastMessage(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.collection-grid');
  const modal = document.getElementById('collectionModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const imgSlider = modal.querySelector('.modal-img-slider');
  const sliderInd = modal.querySelector('.slider-indicator');
  const sliderCount = modal.querySelector('.slider-counter');
  const leftArrow = modal.querySelector('.arrow-left');
  const rightArrow = modal.querySelector('.arrow-right');
  const brandEl = modal.querySelector('.modal-brand');
  const priceEl = modal.querySelector('.modal-prices');
  const dateEl = modal.querySelector('.modal-date');
  const timelineEl = modal.querySelector('.ownership-timeline');
  let currentIdx = 0;
  let currentCollection = null;

  // grid click
  if (grid) {
    grid.querySelectorAll('.collection-card').forEach(card => {
      card.onclick = () => openModal(parseInt(card.getAttribute('data-index')));
    });
  }

  function openModal(idx) {
    currentCollection = allCollections[idx];
    currentIdx = 0; // slider starts at 0
    modal.classList.add('open');
    updateModal();
  }

  function updateModal() {
    // Images
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
    // Show images
    const imgs = imgSlider.querySelectorAll('img');
    imgs.forEach((im, i) => im.style.display = (i === currentIdx ? 'block' : 'none'));
    // Dots
    sliderInd.innerHTML = '';
    imgs.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = (i === currentIdx ? 'active' : '');
      dot.onclick = () => { currentIdx = i; updateSliderNav(); };
      sliderInd.appendChild(dot);
    });
    // Counter
    sliderCount.innerHTML = (currentIdx + 1) + '/' + imgs.length;
  }
  // Arrows
  leftArrow.onclick = () => { if (currentIdx > 0) { currentIdx--; updateSliderNav(); } };
  rightArrow.onclick = () => { if (currentCollection && currentIdx < currentCollection.images.length - 1) { currentIdx++; updateSliderNav(); } };

  // Meta info
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
    if (!owners.length) { timelineEl.innerHTML = '<div style="color:#baa;">No previous ownership records.</div>'; return; }
    // Timeline bar
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

  // Modal close
  closeBtn.onclick = () => { modal.classList.remove('open'); };
});
