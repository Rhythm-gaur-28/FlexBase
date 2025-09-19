document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addPostForm');
  const fileInput = document.getElementById('images');
  const uploadArea = document.getElementById('uploadArea');
  const imagePreviewSection = document.getElementById('imagePreviewSection');
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  const toast = document.getElementById('toast');
  
  let selectedImages = [];

  // Drag and drop functionality
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  });

  // Handle selected files
  function handleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      showToast('Please select valid image files.', 'error');
      return;
    }

    // Add new images to selected images array
    selectedImages = [...selectedImages, ...imageFiles];
    displayImagePreviews();
    
    // Show preview section
    imagePreviewSection.style.display = 'block';
  }

  // Display image previews
  function displayImagePreviews() {
    imagePreviewGrid.innerHTML = '';
    
    selectedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview ${index + 1}">
          <button type="button" class="img-remove-btn" onclick="removeImage(${index})">&times;</button>
        `;
        
        imagePreviewGrid.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    });
  }

  // Remove image function (global scope)
  window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    displayImagePreviews();
    
    if (selectedImages.length === 0) {
      imagePreviewSection.style.display = 'none';
    }
  };

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validation
    if (selectedImages.length === 0) {
      showToast('Please add at least one image before proceeding.', 'error');
      return;
    }

    const submitBtn = form.querySelector('.btn-post');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sharing...';

    try {
      const formData = new FormData();
      
      // Add images
      selectedImages.forEach(image => {
        formData.append('images', image);
      });
      
      // Add caption
      const caption = document.getElementById('caption').value.trim();
      formData.append('caption', caption);
      
      // Add hashtags
      const hashtagsInput = document.getElementById('hashtags').value.trim();
      if (hashtagsInput) {
        const hashtags = hashtagsInput
          .split(/\s+/)
          .filter(tag => tag.startsWith('#'))
          .map(tag => tag.substring(1)); // Remove # symbol for storage
        
        hashtags.forEach(tag => {
          formData.append('hashtags', tag);
        });
      }

      const response = await fetch('/posts/add', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        showToast('Post shared successfully!', 'success');
        setTimeout(() => {
          window.location.href = '/profile';
        }, 1500);
      } else {
        showToast(result.message || 'Failed to add post', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Failed to add post', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Share Post';
    }
  });

  // Toast message function
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
});
