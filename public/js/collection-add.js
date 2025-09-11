document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addCollectionForm');
  const steps = document.querySelectorAll('.wizard-step');
  let step = 0;

  // ------ Step navigation with validation ------
  // Step 1: Require at least 1 image
  let imagesArr = [];
  const showStep = (n) => {
    steps.forEach((s, i) => s.classList.toggle('active', i === n));
    step = n;
  };
  const btnsNext = document.querySelectorAll('.btn-next');
  const btnsPrev = document.querySelectorAll('.btn-prev');

  btnsNext[0].onclick = function () {
    if (imagesArr.length === 0) {
      toastMessage("Please upload at least one image before proceeding.");
      return;
    }
    showStep(1);
  };

  btnsNext[1].onclick = function () {
    const brand = form.elements['brand'].value.trim();
    const boughtOn = form.elements['boughtOn'].value;
    const boughtAtPrice = form.elements['boughtAtPrice'].value;
    const marketPrice = form.elements['marketPrice'].value;
    if (!brand || !boughtOn || !boughtAtPrice || !marketPrice) {
      toastMessage("Please complete all details before continuing.");
      return;
    }
    if (parseInt(boughtAtPrice, 10) < 1 || parseInt(marketPrice, 10) < 1) {
      toastMessage("Prices must be greater than zero.");
      return;
    }
    showStep(2);
  };

  btnsPrev.forEach((btn, idx) => btn.onclick = () => showStep(step - 1));

  // ------ Image upload (Step 1) with constraints ------
  const fileInput = document.getElementById('images');
  const addMoreBtn = document.getElementById('addMoreBtn');
  const imagePreview = document.getElementById('imagePreview');

  fileInput.addEventListener('change', function () {
    if (imagesArr.length + this.files.length > 5) {
      toastMessage("Can't add more than 5");
      this.value = '';
      return;
    }
    Array.from(this.files).forEach(f => {
      imagesArr.push(f);
    });
    displayImagePreview();
    this.value = '';
    addMoreBtn.style.display = imagesArr.length < 5 ? 'inline-block' : 'none';
  });

  addMoreBtn.addEventListener('click', () => {
    fileInput.click();
  });

  function displayImagePreview() {
    imagePreview.innerHTML = '';
    imagesArr.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.width = 90;
        img.style.margin = '6px';
        imagePreview.appendChild(img);
        const remBtn = document.createElement('button');
        remBtn.innerHTML = '&times;';
        remBtn.className = 'img-remove-btn';
        remBtn.onclick = () => {
          imagesArr.splice(idx, 1);
          displayImagePreview();
          addMoreBtn.style.display = imagesArr.length < 5 ? 'inline-block' : 'none';
        };
        img.after(remBtn);
      };
      reader.readAsDataURL(f);
    });
    addMoreBtn.style.display = imagesArr.length < 5 ? 'inline-block' : 'none';
  }

  // ------ Bio/Details Step (Step 2) - Inputs validation and no future dates ------
  const boughtAtPriceInput = form.elements['boughtAtPrice'];
  const marketPriceInput = form.elements['marketPrice'];
  [boughtAtPriceInput, marketPriceInput].forEach(input => {
    input.addEventListener('input', function () {
      let val = parseInt(this.value, 10);
      if (val < 1) {
        this.value = '';
        toastMessage("Price cannot be zero or negative.");
      }
    });
    input.addEventListener('blur', function () {
      if (this.value && parseInt(this.value, 10) < 1) {
        this.value = '';
        toastMessage("Price cannot be zero or negative.");
      }
    });
  });
  const boughtOnInput = form.elements['boughtOn'];
  if (boughtOnInput) {
    const today = new Date().toISOString().split('T')[0];
    boughtOnInput.setAttribute('max', today);
  }

  // ------ Owners Step (Step 3) - all date constraints ------
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('addOwnerBtn').onclick = () => {
    const container = docuFRment.getElementById('owners-container');
    let minFromDate = '';
if (container.children.length) {
  const prevToInput = container.lastElementChild.querySelector('[name="prevTo"]');
  minFromDate = prevToInput.value || prevToInput.getAttribute('min') || '';
}
const div = document.createElement('div');
div.className = 'owner-block';

// When a new owner is added, automatically set its "From" date to be the last owner's "To" date
let presetFrom = '';
if (minFromDate) presetFrom = minFromDate;

div.innerHTML = `
  <input type="text" name="prevOwnerIds" placeholder="Username or ID" required />
  <input type="date" name="prevFrom" placeholder="From" required max="${todayStr}" ${minFromDate ? `min="${minFromDate}" value="${presetFrom}"` : ''}/>
  <input type="date" name="prevTo" placeholder="To" required max="${todayStr}" ${minFromDate ? `min="${minFromDate}"` : ''}/>
  <button type="button" onclick="this.parentNode.remove()">Remove</button>
`;
    div.querySelector('button').onclick = () => div.remove();
    const fromInput = div.querySelector('[name="prevFrom"]');
    const toInput = div.querySelector('[name="prevTo"]');
    fromInput.addEventListener('change', () => {
      toInput.min = fromInput.value;
      if (toInput.value && toInput.value < fromInput.value) {
        toastMessage('"To" date cannot be before "From" date.');
        toInput.value = '';
      }
      if (fromInput.value > todayStr) {
        toastMessage('"From" date cannot be in the future.');
        fromInput.value = todayStr;
        toInput.value = '';
      }
    });
    toInput.addEventListener('change', () => {
      if (fromInput.value && toInput.value < fromInput.value) {
        toastMessage('"To" date cannot be before "From" date.');
        toInput.value = '';
      }
      if (toInput.value > todayStr) {
        toastMessage('"To" date cannot be in the future.');
        toInput.value = todayStr;
      }
    });
    container.appendChild(div);
  };

  // ------ Form Submit -------
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    imagesArr.forEach((f) => fd.append('images', f));

    // Append other form fields except dynamic owners
    Array.from(form.elements).forEach(el => {
      if (!el.name || el.type === 'file') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) fd.append(el.name, el.value);
      } else {
        if (!el.name.startsWith('prevOwnerIds') && !el.name.startsWith('prevFrom') && !el.name.startsWith('prevTo')) {
          fd.append(el.name, el.value);
        }
      }
    });

    // Append dynamic owner fields
    const prevOwnerIds = document.querySelectorAll('input[name="prevOwnerIds"]');
    const prevFroms = document.querySelectorAll('input[name="prevFrom"]');
    const prevTos = document.querySelectorAll('input[name="prevTo"]');

    prevOwnerIds.forEach(input => fd.append('prevOwnerIds', input.value));
    prevFroms.forEach(input => fd.append('prevFrom', input.value));
    prevTos.forEach(input => fd.append('prevTo', input.value));

    // Log all FormData entries
    for (const pair of fd.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    try {
      console.log('Sending fetch for /collections/add');
      const res = await fetch('/collections/add', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      console.log('Fetch response received, status:', res.status);
      const result = await res.json();
      console.log('Response JSON:', result);
      toastMessage(result.success ? 'Shoe added to your collection!' : result.message);
      if (result.success) setTimeout(() => window.location.href = '/profile', 1800);
      // console.log('prevOwnerIds:', req.body.prevOwnerIds);
      // console.log('prevFrom:', req.body.prevFrom);
      // console.log('prevTo:', req.body.prevTo);
    } catch (error) {
      // console.error('Fetch upload error:', error);
      toastMessage('Upload failed.');
    }
  };
  // ------ Toast message helper ------
  function toastMessage(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }
});
