(function () {
  const input = document.getElementById('userSearch');
  const list = document.getElementById('searchResults');
  if (!input || !list) return;

  let lastTerm = '';
  let activeIndex = -1;
  let cache = new Map();
  const limit = 8;

  const debounce = (fn, ms = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const render = (users) => {
    list.innerHTML = '';
    activeIndex = -1;
    if (!users || users.length === 0) {
      list.innerHTML = '<li class="results-empty">No users found</li>';
      list.classList.add('show');
      return;
    }
    const frag = document.createDocumentFragment();
    users.forEach((u, i) => {
      const li = document.createElement('li');
      li.className = 'results-item';
      li.setAttribute('data-username', u.username);
      li.innerHTML = `
        <img src="${u.profileImage || '/images/default-profile.jpg'}" alt="${u.username}" />
        <span>@${u.username}</span>
      `;
      li.addEventListener('click', () => {
        // Adjust destination as per your routes; example: public profile by username
        window.location.href = '/u/' + encodeURIComponent(u.username);
      });
      frag.appendChild(li);
    });
    list.appendChild(frag);
    list.classList.add('show');
  };

  const search = async (q) => {
    const key = q.toLowerCase();
    if (cache.has(key)) { render(cache.get(key)); return; }
    const res = await fetch('/api/users/search?q=' + encodeURIComponent(q), { credentials: 'include' });
    const data = await res.json();
    const users = Array.isArray(data.users) ? data.users.slice(0, limit) : [];
    cache.set(key, users);
    render(users);
  };

  const onInput = debounce(async (e) => {
    const term = e.target.value.trim();
    lastTerm = term;
    if (!term) { list.classList.remove('show'); list.innerHTML = ''; return; }
    try { await search(term); } catch { /* ignore */ }
  }, 250);

  input.addEventListener('input', onInput);

  // Basic keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = Array.from(list.querySelectorAll('.results-item'));
    if (!list.classList.contains('show') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      items.forEach((li, i) => li.style.background = i === activeIndex ? '#f0eefc' : '');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items.forEach((li, i) => li.style.background = i === activeIndex ? '#f0eefc' : '');
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      list.classList.remove('show');
    }
  });

  // Hide when clicking outside
  document.addEventListener('click', (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.classList.remove('show');
    }
  });
})();
