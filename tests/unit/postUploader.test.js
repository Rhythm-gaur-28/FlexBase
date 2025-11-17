/**
 * @jest-environment jsdom
 */

const { handleFiles } = require('../../public/js/postUploader.js');

describe("handleFiles()", () => {

  let toastFn;
  let displayPreviewFn;
  let previewSection;
  let selectedImages;

  beforeEach(() => {
    toastFn = jest.fn();
    displayPreviewFn = jest.fn();
    previewSection = { style: { display: 'none' }};
    selectedImages = [];
  });

  test("should show error when no valid images", () => {
    const files = [
      { type: "text/plain" },
      { type: "application/pdf" }
    ];

    const result = handleFiles(
      files,
      selectedImages,
      toastFn,
      displayPreviewFn,
      previewSection
    );

    expect(toastFn).toHaveBeenCalledWith(
      'Please select valid image files.',
      'error'
    );
    expect(result.length).toBe(0);
  });

  test("should add valid images to selectedImages", () => {
    const image1 = new File(["dummy"], "img1.png", { type: "image/png" });
    const image2 = new File(["dummy"], "img2.jpg", { type: "image/jpeg" });

    const result = handleFiles(
      [image1, image2],
      selectedImages,
      toastFn,
      displayPreviewFn,
      previewSection
    );

    expect(result.length).toBe(2);
    expect(displayPreviewFn).toHaveBeenCalled();
    expect(previewSection.style.display).toBe("block");
  });

});
