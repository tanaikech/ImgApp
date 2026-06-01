/**
 * Title: ImgApp (v2.0.0)
 * Author: Tanaike (Refactored to ES6+ V8 Runtime Architecture)
 * GitHub: https://github.com/tanaikech/ImgApp
 */

class ImgApp {
  constructor() {}

  /**
   * Retrieves the image size (width and height) from a file blob.
   * Optimized using DataView for high-speed binary parsing on V8 runtime.
   *
   * @param {Object} blob File blob (PNG, JPG, GIF, BMP)
   * @return {Object} JSON object {identification: string, width: number, height: number, filesize: number}
   */
  GetSize(blob) {
    let bytes;
    try {
      bytes = blob.getBytes();
    } catch (e) {
      throw new Error("Cannot retrieve file blob.");
    }

    const filesize = bytes.length;
    // GAS returns signed bytes (-128 to 127). We convert to unsigned 8-bit integers.
    const buffer = new Uint8Array(filesize);
    for (let i = 0; i < filesize; i++) {
      buffer[i] = bytes[i];
    }
    const view = new DataView(buffer.buffer);

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      filesize > 24 &&
      view.getUint32(0, false) === 0x89504e47 &&
      view.getUint32(4, false) === 0x0d0a1a0a
    ) {
      return {
        identification: "PNG",
        width: view.getUint32(16, false),
        height: view.getUint32(20, false),
        filesize,
      };
    }

    // JPG signature: FF D8
    if (filesize > 2 && view.getUint16(0, false) === 0xffd8) {
      let offset = 2;
      while (offset < view.byteLength) {
        let marker = view.getUint8(offset);
        if (marker === 0xff) {
          let type = view.getUint8(offset + 1);
          if (type === 0xc0 || type === 0xc1 || type === 0xc2) {
            return {
              identification: "JPG",
              width: view.getUint16(offset + 7, false),
              height: view.getUint16(offset + 5, false),
              filesize,
            };
          } else {
            offset += 2 + view.getUint16(offset + 2, false);
          }
        } else {
          offset++;
        }
      }
    }

    // GIF signature: 47 49 46 ("GIF")
    if (
      filesize > 10 &&
      view.getUint8(0) === 0x47 &&
      view.getUint8(1) === 0x49 &&
      view.getUint8(2) === 0x46
    ) {
      return {
        identification: "GIF",
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
        filesize,
      };
    }

    // BMP signature: 42 4D ("BM")
    if (filesize > 26 && view.getUint16(0, false) === 0x424d) {
      return {
        identification: "BMP",
        width: view.getInt32(18, true),
        height: Math.abs(view.getInt32(22, true)), // BMP height can be negative (top-down DIB)
        filesize,
      };
    }

    return {
      Error:
        "Cannot retrieve image size. Supported formats: PNG, JPG, GIF, BMP.",
    };
  }

  /**
   * Resizes an image based on the inputted width.
   * Uses Drive API thumbnailLink property.
   *
   * @param {string} fileId File ID on Google Drive
   * @param {number} width Resized width you want
   * @return {Object} JSON object {blob, originalwidth, originalheight, resizedwidth, resizedheight, identification}
   */
  DoResize(fileId, width) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=thumbnailLink,mimeType`;
    const options = {
      method: "get",
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true,
    };

    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() >= 400) {
      throw new Error(
        `'${fileId}' is not compatible. Error message: ${res.getContentText()}`,
      );
    }

    const data = JSON.parse(res.getContentText());
    if (!data.thumbnailLink)
      throw new Error("Cannot retrieve thumbnail link from this file.");

    const parts = data.thumbnailLink.split("=");
    const baseThumbUrl = parts.slice(0, parts.length - 1).join("=");
    const mimetype = data.mimeType;
    const targetWidth = width > 0 ? width : 100;

    let isDocOrPdf =
      mimetype.includes("google-apps") || mimetype.includes("pdf");
    let originalBlob;

    if (isDocOrPdf) {
      originalBlob = this._fetchImageBlob(`${baseThumbUrl}=s10000`);
    } else if (mimetype.includes("image")) {
      originalBlob = DriveApp.getFileById(fileId).getBlob();
    } else {
      originalBlob = this._fetchImageBlob(`${baseThumbUrl}=s10000`);
    }

    const sizeInfo = this.GetSize(originalBlob);
    const ow = sizeInfo.width;
    const oh = sizeInfo.height;

    let rw, rh;
    if (targetWidth > ow) {
      rw = ow;
      rh = oh;
    } else {
      rw = targetWidth;
      rh = Math.ceil((targetWidth * oh) / ow);
    }

    const fetchParam = isDocOrPdf ? `s${rh}` : `s${rw}`;
    const resizedBlob = this._fetchImageBlob(`${baseThumbUrl}=${fetchParam}`);
    const resizedSizeInfo = this.GetSize(resizedBlob);

    return {
      blob: resizedBlob,
      identification: resizedSizeInfo.identification || sizeInfo.identification,
      originalwidth: ow,
      originalheight: oh,
      resizedwidth: resizedSizeInfo.width || rw,
      resizedheight: resizedSizeInfo.height || rh,
    };
  }

  /**
   * Updates a thumbnail of a file using an image.
   *
   * @param {string} imgFileId File ID of the new thumbnail image
   * @param {string} srcFileId File ID of the file to be updated
   * @return {Object} JSON object containing id, mimeType, name, thumbnailVersion, thumbnailLink
   */
  UpdateThumbnail(imgFileId, srcFileId) {
    if (!imgFileId) throw new Error("No image file ID.");
    if (!srcFileId) throw new Error("No source file ID.");

    const imgFile = DriveApp.getFileById(imgFileId);
    const mime = imgFile.getMimeType();

    if (!["image/png", "image/gif", "image/jpeg"].includes(mime)) {
      throw new Error(
        `The image format (${mime}) cannot be used for thumbnail.`,
      );
    }

    const imageBase64 = Utilities.base64EncodeWebSafe(
      imgFile.getBlob().getBytes(),
    );
    const metadata = {
      contentHints: {
        thumbnail: {
          image: imageBase64,
          mimeType: mime,
        },
      },
    };

    const fields = "id,mimeType,name,thumbnailVersion,thumbnailLink";
    const boundary = "xxxxxxxxxx";
    const url = `https://www.googleapis.com/upload/drive/v3/files/${srcFileId}?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(fields)}`;

    let payloadStr = `--${boundary}\r\n`;
    payloadStr += `Content-Disposition: form-data; name="metadata"\r\n`;
    payloadStr += `Content-Type: application/json; charset=UTF-8\r\n\r\n`;
    payloadStr += JSON.stringify(metadata) + "\r\n";
    payloadStr += `--${boundary}--\r\n`;

    const payload = Utilities.newBlob(payloadStr).getBytes();

    const options = {
      method: "patch",
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      payload: payload,
      muteHttpExceptions: true,
    };

    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() >= 400) {
      throw new Error(
        `Failed to update thumbnail. Status: ${res.getResponseCode()}, Response: ${res.getContentText()}`,
      );
    }

    return JSON.parse(res.getContentText());
  }

  /**
   * Edits an image (crop or merge) using Google Slides as a temporary canvas.
   *
   * @param {Object} obj Configuration object for editing
   * @return {Blob} Blob of the resultant image
   */
  EditImage(obj) {
    if (
      obj.hasOwnProperty("blob") &&
      obj.hasOwnProperty("crop") &&
      obj.blob.toString() === "Blob" &&
      typeof obj.crop === "object"
    ) {
      return this._cropImage(obj);
    } else if (
      obj.hasOwnProperty("merge") &&
      Array.isArray(obj.merge) &&
      Array.isArray(obj.merge[0])
    ) {
      return this._mergeImages(obj);
    } else {
      throw new Error("Wrong object format. Please check the documentation.");
    }
  }

  /**
   * NEW FEATURE: Extracts text from an image using Google Drive OCR.
   *
   * @param {Blob} blob Blob of the image.
   * @param {Object} options Options for OCR extraction (e.g. { language: "en" })
   * @return {Object} JSON object containing the extracted text.
   */
  ExtractText(blob, options = {}) {
    const lang = options.language || "en";
    const resource = {
      name: "ImgApp_OCR_Temp",
      mimeType: "application/vnd.google-apps.document",
    };

    try {
      const file = Drive.Files.create(resource, blob, { ocrLanguage: lang });
      const doc = DocumentApp.openById(file.id);
      const text = doc.getBody().getText();
      Drive.Files.remove(file.id);
      return { text: text.trim() };
    } catch (e) {
      throw new Error(
        "OCR Failed. Please ensure Drive API is enabled at Advanced Google Services. Details: " +
          e.message,
      );
    }
  }

  /* ================= Private Helper Methods ================= */

  _fetchImageBlob(url) {
    return UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    }).getBlob();
  }

  _pixelToPt(pixel) {
    return pixel * 0.75;
  }
  _ptToPixel(pt) {
    return pt * 1.33333;
  }

  _getImageFromSlide(presentationId, slideId, rs, filename) {
    let croppedBlob = null;
    try {
      if (typeof Slides === "undefined")
        throw new Error("Slides is not defined");
      const resObj = Slides.Presentations.Pages.getThumbnail(
        presentationId,
        slideId,
        {
          "thumbnailProperties.thumbnailSize": "LARGE",
          "thumbnailProperties.mimeType": "PNG",
        },
      );
      const url = resObj.contentUrl.replace(/=s\d+/, `=s${Math.ceil(rs)}`);
      croppedBlob = UrlFetchApp.fetch(url).getBlob();
      croppedBlob.setName(filename || "outputImageFromImgApp.png");
    } catch (e) {
      if (e.message.includes("Slides is not defined")) {
        throw new Error(
          "Please enable Slides API at Advanced Google services, and try again.",
        );
      }
      throw new Error(e.message);
    }
    return croppedBlob;
  }

  _cropImage(obj) {
    const unit =
      obj.hasOwnProperty("unit") && typeof obj.unit === "string"
        ? obj.unit
        : "pixel";
    const size = this.GetSize(obj.blob);

    if (size.width * size.height > 25000000) {
      throw new Error(
        "The image size is too large. Max limit is 25,000,000 pixels.",
      );
    }

    const width = unit === "point" ? this._pixelToPt(size.width) : size.width;
    const height =
      unit === "point" ? this._pixelToPt(size.height) : size.height;

    const t = Number(obj.crop.t) || 0;
    const b = Number(obj.crop.b) || 0;
    const l = Number(obj.crop.l) || 0;
    const r = Number(obj.crop.r) || 0;

    const pageObj = {
      title: "tempForImgApp",
      width: { unit: unit, size: width - r - l },
      height: { unit: unit, size: height - b - t },
    };

    const presentationId = new SlidesAppp().createNewSlidesWithPageSize(
      pageObj,
    );
    const slides = SlidesApp.openById(presentationId);
    const slide = slides.getSlides()[0];

    const setWidth = unit === "pixel" ? this._pixelToPt(width) : width;
    const setHeight = unit === "pixel" ? this._pixelToPt(height) : height;
    const setL = unit === "pixel" ? this._pixelToPt(l) : l;
    const setT = unit === "pixel" ? this._pixelToPt(t) : t;

    slide.insertImage(obj.blob, -setL, -setT, setWidth, setHeight);
    slides.saveAndClose();

    let rs =
      size.width -
      (unit === "point" ? this._ptToPixel(l) : l) -
      (unit === "point" ? this._ptToPixel(r) : r);
    if (
      obj.hasOwnProperty("outputWidth") &&
      obj.outputWidth > 0 &&
      obj.outputWidth <= 1600
    ) {
      rs =
        unit === "point" ? this._ptToPixel(obj.outputWidth) : obj.outputWidth;
    }

    const croppedBlob = this._getImageFromSlide(
      presentationId,
      slide.getObjectId(),
      rs,
      obj.blob.getName(),
    );
    DriveApp.getFileById(presentationId).setTrashed(true);
    return croppedBlob;
  }

  _mergeImages(obj) {
    const canvas = obj.merge.reduce(
      (acc, row) => {
        let mWidth = 0;
        let mHeight = 0;
        const ar = [];
        row.forEach((cell) => {
          if (cell && cell.toString() === "Blob") {
            const temp = this.GetSize(cell);
            if (temp.width * temp.height > 25000000) {
              throw new Error(
                "The image size is too large. Max limit is 25,000,000 pixels.",
              );
            }
            ar.push({
              blob: cell,
              left: mWidth,
              top: acc.maxHeight,
              width: temp.width,
              height: temp.height,
            });
            mWidth += temp.width;
            if (mHeight < temp.height) mHeight = temp.height;
          } else {
            ar.push(null);
          }
        });
        acc.images.push(ar);
        if (acc.maxWidth < mWidth) acc.maxWidth = mWidth;
        acc.maxHeight += mHeight;
        return acc;
      },
      { maxWidth: 0, maxHeight: 0, images: [] },
    );

    const pageObj = {
      title: "tempForImgApp",
      width: { unit: "pixel", size: canvas.maxWidth },
      height: { unit: "pixel", size: canvas.maxHeight },
    };

    const presentationId = new SlidesAppp().createNewSlidesWithPageSize(
      pageObj,
    );
    const slides = SlidesApp.openById(presentationId);
    const slide = slides.getSlides()[0];

    canvas.images.forEach((row) => {
      row.forEach((cell) => {
        if (cell) {
          slide.insertImage(
            cell.blob,
            this._pixelToPt(cell.left),
            this._pixelToPt(cell.top),
            this._pixelToPt(cell.width),
            this._pixelToPt(cell.height),
          );
        }
      });
    });
    slides.saveAndClose();

    let rs = canvas.maxWidth > 1600 ? 1600 : canvas.maxWidth;
    if (
      obj.hasOwnProperty("outputWidth") &&
      obj.outputWidth > 0 &&
      obj.outputWidth <= 1600
    ) {
      rs = obj.outputWidth;
    }

    const mergedBlob = this._getImageFromSlide(
      presentationId,
      slide.getObjectId(),
      rs,
      obj.outputFilename || "merged.png",
    );
    DriveApp.getFileById(presentationId).setTrashed(true);
    return mergedBlob;
  }
}

/* ================= Global API Exposing Functions ================= */

/**
 * Retrieve image size (width and height) from file blob.
 * @param {Object} blob File blob: png, jpg, gif and bmp
 * @return {Object} JSON object {identification: [png, jpg, gif and bmp], width: [pixel], height: [pixel], filesize: [bytes]}
 */
function getSize(blob) {
  return new ImgApp().GetSize(blob);
}

/**
 * Resize image from inputted width.
 * @param {string} fileId File ID on Google Drive
 * @param {integer} width Resized width you want
 * @return {Object} JSON object {blob: [blob], originalwidth: ###, originalheight: ###, resizedwidth: ###, resizedheight: ###}
 */
function doResize(fileId, width) {
  return new ImgApp().DoResize(fileId, width);
}

/**
 * Update a thumbnail of a file using an image.
 * @param {string} imgFileId File ID of new thumbnail image on Google Drive
 * @param {string} srcFileId File ID of file, which is updated thumbnail, on Google Drive
 * @return {Object} JSON object id,mimeType,name,thumbnailVersion,thumbnailLink
 */
function updateThumbnail(imgFileId, srcFileId) {
  return new ImgApp().UpdateThumbnail(imgFileId, srcFileId);
}

/**
 * Edit images (Crop or Merge).
 * @param {Object} object Object for using this method.
 * @return {Object} Blob of result image.
 */
function editImage(object) {
  return new ImgApp().EditImage(object);
}

/**
 * Extracts text from an image (OCR).
 * @param {Object} blob File blob
 * @param {Object} options OCR options { language: string }
 * @return {Object} JSON object { text: string }
 */
function extractText(blob, options) {
  return new ImgApp().ExtractText(blob, options);
}
