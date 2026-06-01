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

    // 6. Test TIFF Binary parsing & DPI/PPI [NEW RESOLUTION]
    Logger.log("--- Test 6: Native TIFF Binary Parsing & DPI ---");
    // Build a mock 50-byte tiny Little-Endian TIFF in memory with Width=400, Height=300, ResolutionUnit=2 (inches)
    const tiffBytes = [
      0x49, 0x49, // Signature (II)
      0x2a, 0x00, // Magic (42)
      0x08, 0x00, 0x00, 0x00, // Offset to first IFD (8)
      0x03, 0x00, // 3 Directory entries
      // Entry 1: Width (Tag 256)
      0x00, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x90, 0x01, 0x00, 0x00,
      // Entry 2: Height (Tag 257)
      0x01, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x2c, 0x01, 0x00, 0x00,
      // Entry 3: ResolutionUnit (Tag 296)
      0x28, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
      // Offset to next IFD (0)
      0x00, 0x00, 0x00, 0x00
    ];
    // Convert to signed bytes for GAS Blob
    const tiffSigned = tiffBytes.map(b => b > 127 ? b - 256 : b);
    const mockTiffBlob = Utilities.newBlob(tiffSigned, "image/tiff", "mock.tiff");
    const tiffRes = ImgApp.getSize(mockTiffBlob);
    Logger.log("TIFF Parsing Result: " + JSON.stringify(tiffRes));
    if (tiffRes.width !== 400 || tiffRes.height !== 300 || tiffRes.identification !== "TIFF") {
      throw new Error("TIFF native parsing failed.");
    }

    // 7. Test doResize with Blob input & mimeType conversion [NEW RESOLUTION]
    Logger.log("--- Test 7: doResize() with Blob Input and MimeType Conversion ---");
    const resizedBlobRes = ImgApp.doResize(originalBlob, 150, "image/png");
    Logger.log(
      `Result: Resized Width: ${resizedBlobRes.resizedwidth}, Target Type: ${resizedBlobRes.blob.getContentType()}`
    );
    if (resizedBlobRes.resizedwidth !== 150) throw new Error("doResize with Blob input failed.");
    if (resizedBlobRes.blob.getContentType() !== "image/png") {
      throw new Error("doResize mimeType conversion failed.");
    }

    Logger.log(">>> All integration tests completed SUCCESSFULLY.");
  } catch (error) {
    Logger.log("!!! Test Execution FAILED: " + error.stack);
  } finally {
    // Cleanup Phase: Prevent Drive clutter
    Logger.log("Cleanup: Removing temporary Drive files...");
    tempFile.setTrashed(true);
    Logger.log("Cleanup complete. Drive state restored.");
  }
}
