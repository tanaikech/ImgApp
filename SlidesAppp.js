// DriveApp.createFile()  // This is used for automatically detected the scope of "https://www.googleapis.com/auth/drive"
;
(function (r) {
  var SlidesAppp;
  SlidesAppp = (function () {
    var newPPTXdata, pptxObjToBlob, putError, putInternalError, setPageSize;

    SlidesAppp.name = "SlidesAppp";

    function SlidesAppp(id_) {

      /**
       * ### Description
       * Check whether Drive API is enabled at Advanced Google services, and return it as true or false and the version.
       * ref: https://medium.com/@tanaike/checking-api-enabled-with-advanced-google-services-using-google-apps-script-572bcdeb39a8
       *
       * @param {String} apiName API name you want to check.
       * @returns {Object} Object including "driveAPI" and "version" properties.
       */
      function isAPIAtAdvancedGoogleServices_(apiName) {
        if (!apiName || apiName == "" || typeof apiName != "string") {
          throw new Error("Please set a valid API name.");
        } else if (!(/^[A-Z]+$/g).test(apiName[0])) {
          const [t, ...b] = apiName;
          apiName = [t.toUpperCase(), ...b].join("");
        }
        const obj = { apiName, api: "disable" };
        if (typeof this[apiName] !== "undefined") {
          obj.api = "enable";
          obj.version = this[apiName].getVersion();
        }
        return obj;
      }
      const isSlidesAPI = isAPIAtAdvancedGoogleServices_("Slides");
      const isDriveAPI = isAPIAtAdvancedGoogleServices_("Drive");
      if (isSlidesAPI.api == "disable" || isDriveAPI.api == "disable") {
        throw new Error("Please enable Drive API and Slides API at Advanced Google services.");
      }

      this.name = "SlidesAppp";
      if (id_ !== "create") {
        if (id_ === "" || DriveApp.getFileById(id_).getMimeType() !== MimeType.GOOGLE_SLIDES) {
          putError.call(this, "This file ID is not the file ID of Google Slides.");
        }
        this.obj = {
          presentationId: id_
        };
      }
      this.mainObj = {};
    }

    SlidesAppp.prototype.createNewSlidesWithPageSize = function (obj_) {
      var blob, createObj, e, pptxObj, tmpId;
      if (!obj_ || Object.keys(obj_).length === 0) {
        putError.call(this, "Object was not found. Please confirm it again.");
      }
      pptxObj = newPPTXdata.call(this);
      setPageSize.call(this, obj_, pptxObj);
      blob = pptxObjToBlob.call(this, pptxObj);
      createObj = {
        title: "SlidesSample",
        mimeType: MimeType.GOOGLE_SLIDES
      };
      if (obj_.hasOwnProperty("title")) {
        createObj.title = obj_.title;
      }
      if (obj_.hasOwnProperty("parent")) {
        createObj.parents = [
          {
            id: obj_.parent
          }
        ];
      }
      try {
        tmpId = Drive.Files.insert(createObj, blob).id;
      } catch (error) {
        e = error;
        if (e.message === "Drive is not defined") {
          putError.call(this, "Please enable Drive API at Advanced Google services, and try again.");
        } else {
          putError.call(this, e.message);
        }
      }
      return tmpId;
    };

    newPPTXdata = function () {
      var data;
      data = "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";
      return JSON.parse(Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(data), MimeType.ZIP))[0].getDataAsString());
    };

    setPageSize = function (obj_, obj) {
      var filename, h, root, unitX, unitY, w, xmlObj;
      if (obj_.hasOwnProperty("width") || obj_.hasOwnProperty("height")) {
        unitX = "pixel";
        unitY = "pixel";
        if (obj_.width.hasOwnProperty("unit")) {
          unitX = obj_.width.unit;
        }
        if (obj_.height.hasOwnProperty("unit")) {
          unitY = obj_.height.unit;
        }
        if ((unitX !== "pixel" && unitX !== "point") || (unitY !== "pixel" && unitY !== "point")) {
          putError.call(this, "Unit is wrong.");
        }
        if (!obj_.width.hasOwnProperty("size") || !obj_.height.hasOwnProperty("size")) {
          putError.call(this, "Size was not found.");
        }
        w = (unitX === "pixel" ? obj_.width.size * 0.75 : obj_.width.size) * 12700;
        h = (unitX === "pixel" ? obj_.height.size * 0.75 : obj_.height.size) * 12700;
        filename = "ppt/presentation.xml";
        xmlObj = XmlService.parse(obj[filename]);
        root = xmlObj.getRootElement();
        root.getChild("sldSz", root.getNamespace("p")).setAttribute("cx", w).setAttribute("cy", h);
        obj[filename] = XmlService.getRawFormat().format(root);
      }
    };

    pptxObjToBlob = function (pptxObj) {
      var blobs;
      blobs = Object.keys(pptxObj).reduce(function (ar, k) {
        var v;
        v = pptxObj[k];
        ar.push(v.toString() === "Blob" ? v : Utilities.newBlob(v, MimeType.PLAIN_TEXT, k));
        return ar;
      }, []);
      return Utilities.zip(blobs, "temp.pptx").setContentType(MimeType.MICROSOFT_POWERPOINT);
    };

    putError = function (m) {
      throw new Error(m);
    };

    putInternalError = function (m) {
      throw new Error("Internal error: " + m);
    };

    return SlidesAppp;

  })();
  return r.SlidesAppp = SlidesAppp;
})(this);
