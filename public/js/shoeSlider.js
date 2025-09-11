// public/js/shoeSlider.js
document.addEventListener('DOMContentLoaded', function () {
  // Swiper configuration (same as before)
  const swiperConfig = {
    slidesPerView: 5,
    spaceBetween: 20,
    loop: true,
    loopAdditionalSlides: 2,
    centeredSlides: false,
    autoplay: {
      delay: 1800,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    speed: 1000,
    allowTouchMove: true,
    freeMode: false,
    breakpoints: {
      320: { slidesPerView: 1.5, spaceBetween: 12 },
      600: { slidesPerView: 2.5, spaceBetween: 16 },
      800: { slidesPerView: 3.5, spaceBetween: 18 },
      1200: { slidesPerView: 5, spaceBetween: 20 }
    }
  };

  // Initialize sliders
  window.swipers = {
    row1: new Swiper('#slider-row1', swiperConfig),
    row2: new Swiper('#slider-row2', swiperConfig),
    row3: new Swiper('#slider-row3', swiperConfig)
  };

  // Function to create slider HTML with icons
  function createSliderHTML(products) {
    return products.map(product => `
      <div class="swiper-slide">
        <div class="shoe-card">
          <img src="${product.image}" alt="${product.name}" class="shoe-image"/>
          ${product.tag ? `<span class="shoe-tag">${product.tag}</span>` : ''}
          <div class="shoe-name">${product.name}</div>
          <div class="shoe-price">
            ${product.oldPrice ? `<span class="old-price">$${product.oldPrice}</span>` : ''}
            <span class="current-price">$${product.price}</span>
          </div>
          
          <div class="card-icons">
            <div class="card-icon view-icon" onclick="viewProduct('${product._id}')">
              <svg viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </div>
            <div class="card-icon cart-icon" onclick="addToCart('${product._id}')">
              <svg viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Fixed smooth tab switching for all three rows
  window.showCategory = async function (category) {
    try {
      const response = await fetch(`/api/products/${category}`);
      const data = await response.json();

      // Update active tab
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelector(`.tab[onclick="showCategory('${category}')"]`).classList.add('active');

      // Update all three sliders
      ['row1', 'row2', 'row3'].forEach(row => {
        // Destroy existing swiper
        if (window.swipers[row]) {
          window.swipers[row].destroy(true, true);
        }

        // Update content
        const wrapper = document.querySelector(`#slider-${row} .swiper-wrapper`);
        wrapper.innerHTML = createSliderHTML(data[`${row}Products`]);

        // Recreate swiper
        window.swipers[row] = new Swiper(`#slider-${row}`, swiperConfig);
      });

    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  // Icon click handlers
  window.viewProduct = function (productId) {
    console.log('View product:', productId);
    // Add your view product logic here
    // e.g., open modal, redirect to product page
  }

  window.addToCart = function (productId) {
    console.log('Add to cart:', productId);
    // Add your cart logic here
    // e.g., add to cart, show notification
  }
  // In your shoeSlider.js or main JS file
  window.buyNow = function (productId) {
    console.log('Buy now clicked for:', productId);
    // Add your purchase logic here
    // e.g., redirect to checkout, add to cart, open modal
  }
});
