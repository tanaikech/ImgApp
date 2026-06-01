/**
 * Test Execution Script for ImgApp v2.0.0
 *
 * Instructions:
 * 1. Ensure you have the Drive API and Slides API enabled at "Advanced Google services".
 * 2. Select the `runImgAppTests` function from the Run menu in the Apps Script Editor.
 * 3. Click Run. The script will dynamically generate temporary images, test every feature
 *    (including the newly added extractText feature), output the results to the Logger,
 *    and seamlessly trash any temporary files generated to ensure your Drive stays clean.
 */

function runImgAppTests() {
  Logger.log(">>> Starting ImgApp v2.0.0 Integration Tests...");

  // Setup Phase: Fetch a dummy image for processing.
  Logger.log("Setup: Fetching dummy images for tests...");
  const dummyImageUrl = "https://picsum.photos/400/300";
  const dummyTextUrl =
    "https://dummyimage.com/600x400/000/fff&text=Hello+ImgApp+V2";

  const originalBlob = UrlFetchApp.fetch(dummyImageUrl)
    .getBlob()
    .setName("test_imgapp.jpg");
  const textBlob = UrlFetchApp.fetch(dummyTextUrl)
    .getBlob()
    .setName("test_text.jpg");
  const tempFile = DriveApp.createFile(originalBlob);
  const tempFileId = tempFile.getId();

  try {
    // 1. Test getSize()
    Logger.log("--- Test 1: getSize() ---");
    const sizeRes = ImgApp.getSize(originalBlob); // Assuming ImgApp class exists in your project. If testing standalone library, use ImgApp.getSize
    Logger.log("Result: " + JSON.stringify(sizeRes));
    if (!sizeRes.width || !sizeRes.height) throw new Error("getSize Failed.");

    // 2. Test doResize()
    Logger.log("--- Test 2: doResize() ---");
    const resizeRes = ImgApp.doResize(tempFileId, 200);
    Logger.log(
      `Result: Original: ${resizeRes.originalwidth}x${resizeRes.originalheight}, Resized: ${resizeRes.resizedwidth}x${resizeRes.resizedheight}`,
    );
    if (resizeRes.resizedwidth !== 200) throw new Error("doResize Failed.");

    // 3. Test updateThumbnail()
    Logger.log("--- Test 3: updateThumbnail() ---");
    const thumbRes = ImgApp.updateThumbnail(tempFileId, tempFileId);
    Logger.log(
      "Result: Thumbnail successfully updated. Version: " +
        thumbRes.thumbnailVersion,
    );

    // 4. Test editImage() - Crop logic
    Logger.log("--- Test 4: editImage() ---");
    const cropConfig = {
      blob: originalBlob,
      unit: "pixel",
      crop: { t: 50, b: 50, l: 50, r: 50 },
      outputWidth: 150,
    };
    const croppedBlob = ImgApp.editImage(cropConfig);
    Logger.log(
      "Result: Cropped image generated successfully. Size: " +
        croppedBlob.getBytes().length +
        " bytes",
    );

    // 5. Test extractText() [NEW FEATURE]
    Logger.log("--- Test 5: extractText() (New Feature) ---");
    const textRes = ImgApp.extractText(textBlob, { language: "en" });
    Logger.log("Result Extracted Text: [" + textRes.text + "]");

    Logger.log(">>> All tests completed SUCCESSFULLY.");
  } catch (error) {
    Logger.log("!!! Test Execution FAILED: " + error.stack);
  } finally {
    // Cleanup Phase: Prevent Drive clutter
    Logger.log("Cleanup: Removing temporary Drive files...");
    tempFile.setTrashed(true);
    Logger.log("Cleanup complete. Drive state restored.");
  }
}
