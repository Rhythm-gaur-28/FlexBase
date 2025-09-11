document.addEventListener('DOMContentLoaded', function() {
  // Collections dropdown toggle
  const collectionsContainer = document.querySelector('.collections-container');
  const collectionsLink = document.getElementById('collectionsLink');
  const profileContainer = document.querySelector('.profile-container');

  if (collectionsContainer && collectionsLink) {
    collectionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Close profile dropdown if open
      if (profileContainer) profileContainer.classList.remove('active');
      // Toggle collections dropdown
      collectionsContainer.classList.toggle('active');
    });

    // Click outside to close collections dropdown
    document.addEventListener('click', function(e) {
      if (!collectionsContainer.contains(e.target) && !(profileContainer && profileContainer.contains(e.target))) {
        collectionsContainer.classList.remove('active');
      }
    });
  }

  if (profileContainer) {
    profileContainer.addEventListener('click', function(e) {
      e.stopPropagation();
      // Close collections dropdown if open
      if (collectionsContainer) collectionsContainer.classList.remove('active');
      this.classList.toggle('active');
    });
    // Click outside to close profile dropdown
    document.addEventListener('click', function(e) {
      if (!profileContainer.contains(e.target) && !(collectionsContainer && collectionsContainer.contains(e.target))) {
        profileContainer.classList.remove('active');
      }
    });
  }

  // Mobile nav as before
  const toggle = document.getElementById('navbarToggle');
  const mobileNav = document.getElementById('mobileNav');
  const closeNav = document.getElementById('closeNav');
  const overlay = document.getElementById('mobileNavOverlay');

  toggle.addEventListener('click', function() {
    mobileNav.classList.add('open');
    overlay.style.display = 'block';
  });
  closeNav.addEventListener('click', function() {
    mobileNav.classList.remove('open');
    overlay.style.display = 'none';
  });
  overlay.addEventListener('click', function() {
    mobileNav.classList.remove('open');
    overlay.style.display = 'none';
  });
});
