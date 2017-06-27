/**
 * Title  ImgApp<br>
 * Author  Tanaike<br>
 * GitHub  https://github.com/tanaikech/ImgApp<br>
 *<br>
 * Retrieve image size (width and height) from file blob.<br>
 *<br>
 * <h3>usage</h3>
 * var blob = DriveApp.getFileById(fileId).getBlob(); // Please retrieve file blob like this.<br>
 * var res = ImgApp.getSize(blob);<br>
 *<br>
 * @param {Object} blob File blob: png, jpg, gif and bmp
 * @return {Object} JSON object {identification: [png, jpg, gif and bmp], width: [pixel], height: [pixel], filesize: [bytes]}
 */
function getSize(blob) {
  return new ImgApp(blob).GetSize()
}
;
(function(r) {
  var ImgApp;
  ImgApp = (function() {
    var byte2hex, byte2hex_num, byte2num, getFormat, getInfBMP, getInfGIF, getInfJPG, getInfPNG, hex2num;

    ImgApp.name = "ImgApp";

    function ImgApp(blob) {
      this.bytear = (function(blob) {
        var e;
        try {
          return blob.getBytes();
        } catch (error) {
          e = error;
          throw new Error("Cannot retrieve file blob.");
        }
      })(blob);
      this.format = "";
    }

    ImgApp.prototype.GetSize = function() {
      var res;
      getFormat.call(this);
      switch (this.format) {
        case "bmp":
          res = getInfBMP.call(this);
          break;
        case "gif":
          res = getInfGIF.call(this);
          break;
        case "png":
          res = getInfPNG.call(this);
          break;
        case "jpg":
          res = getInfJPG.call(this);
          break;
        default:
          res = {
            Error: this.format
          };
      }
      return res;
    };

    getInfBMP = function() {
      return {
        identification: "BMP",
        width: byte2num(this.bytear.slice(18, 22), true),
        height: byte2num(this.bytear.slice(22, 26), true),
        filesize: this.bytear.length
      };
    };

    getInfGIF = function() {
      return {
        identification: "GIF",
        width: byte2num(this.bytear.slice(6, 8), true),
        height: byte2num(this.bytear.slice(8, 10), true),
        filesize: this.bytear.length
      };
    };

    getInfPNG = function() {
      return {
        identification: "PNG",
        width: byte2num(this.bytear.slice(16, 20), false),
        height: byte2num(this.bytear.slice(20, 24), false),
        filesize: this.bytear.length
      };
    };

    getInfJPG = function() {
      var i, ma;
      i = 0;
      while (i < this.bytear.length) {
        i += 1;
        if ((byte2hex_num.call(this, this.bytear[i])) === "ff") {
          i += 1;
          ma = byte2hex_num.call(this, this.bytear[i]);
          if (ma === "c0" || ma === "c1" || ma === "c2") {
            break;
          } else {
            i += hex2num.call(this, byte2hex.call(this, this.bytear.slice(i + 1, i + 3)));
          }
        }
      }
      return {
        identification: "JPG",
        width: hex2num.call(this, byte2hex.call(this, this.bytear.slice(i + 6, i + 8))),
        height: hex2num.call(this, byte2hex.call(this, this.bytear.slice(i + 4, i + 6))),
        filesize: this.bytear.length
      };
    };

    getFormat = function() {
      var f;
      f = (byte2hex.call(this, this.bytear.slice(0, 8))).join("");
      this.format = f.slice(0, 16) === "89504e470d0a1a0a" ? "png" : f.slice(0, 4) === "ffd8" ? "jpg" : f.slice(0, 6) === "474946" ? "gif" : f.slice(0, 4) === "424d" ? "bmp" : "Cannot retrieve image size. Now, it can retrive image size from png, jpg, gif and bmp.";
    };

    byte2hex_num = function(data) {
      var conv;
      conv = (data < 0 ? data + 256 : data).toString(16);
      return conv.length == 1 ? "0" + conv : conv;
    };

    byte2hex = function(data) {
      var conv;
      conv = [(i < 0 ? i + 256 : i).toString(16) for each (i in data)];
      return [i.length == 1 ? "0" + i : i for each (i in conv)];
    };

    byte2num = function(data, byteorder) {
      var conv, datlen, j;
      if (byteorder) {
        datlen = data.length;
        conv = new Array(datlen);
        j = 0;
        for (var i=datlen-1; i>=0; i-=1){
                    var temp = (data[i] < 0 ? data[i] + 256 : data[i]).toString(16);
                    if (temp.length == 1) {
                        temp = "0" + temp;
                    }
                    conv[j] = temp;
                    j += 1;
                };
      } else {
        conv = byte2hex.call(this, data);
      }
      return hex2num.call(this, conv);
    };

    hex2num = function(data) {
      return parseInt(data.join(""), 16);
    };

    return ImgApp;

  })();
  return r.ImgApp = ImgApp;
})(this);
