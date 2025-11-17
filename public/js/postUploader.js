function handleFiles(files, selectedImages, showToast, displayImagePreviews, imagePreviewSection) {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));

  if (imageFiles.length === 0) {
    showToast('Please select valid image files.', 'error');
    return selectedImages;
  }

  const updated = [...selectedImages, ...imageFiles];
  displayImagePreviews(updated);
  imagePreviewSection.style.display = 'block';

  return updated;
}

module.exports = { handleFiles };
