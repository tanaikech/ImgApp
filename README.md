<a name="TOP"></a>
# ImgApp
This is a library of image tools for Google Apps Script.

## Methods
1. ``getSize()`` : This method is for retrieving the width and height of image as the unit of pixel.

I would like to add the methods for handling images in the future.

## How to install this library

- Open Script Editor. And please operate follows by click.
- -> Resource
- -> Library
- -> Input Script ID to text box. Script ID is **``1T03nYHRho6XMWYcaumClcWr6ble65mAT8OLJqRFJ5lukPVogAN2NDl-y``**.
- -> Add library
- -> Please select latest version
- -> Developer mode ON (If you don't want to use latest version, please select others.)
- -> Identifier is "**``ImgApp``**". This is set under the default.

[If you want to read about Libraries, please check this.](https://developers.google.com/apps-script/guide_libraries).

-----

## 1. getSize()
### Overview
This method is for retrieving the width and height of image as the unit of pixel.

### Description
Unfortunately, there are no methods to directly retrieve the image size at Google Apps Script. As a workaround, there is a method that it imports the image in Google Document and retrieves the size using ``getWidth()`` and ``getHeight()``. [[A1](#retrieveusingdoc)] But in this method, it uses much time and resources on Google. So I thought of retrieving the information of image at the binary level, and created this. By this, the low process cost could be achieved.

### Demo

![](images/demo1.gif)

This is a demonstration for this method. the size information is retrieved from BMP, GIF, PNG and JPG files. The play speed is the real time. From this demo, you can see the speed for retrieving the size information from files.

This sample image is created by [k3-studio](http://k3-studio.deviantart.com/art/Overpass-413875385).

### Usage

~~~javascript
var blob = DriveApp.getFileById(fileId).getBlob();
var res = ImgApp.getSize(blob);
~~~

At first, please retrieve the file blob of image and give it to ``ImgApp.getSize()``. The results can be retrieved as JSON object like below.

~~~
{
    identification : ### BMP, GIF, PNG and JPG ###,
    width          : ### pixel ###,
    height         : ### pixel ###,
    filesize       : ### bytes ###
}
~~~

So if you want width and height, you can retrieve them using as follows.

~~~javascript
var blob = DriveApp.getFileById(fileId).getBlob();
var res = ImgApp.getSize(blob);
var width = res.width;
var height = res.height;
~~~

### Limitation
This method (``getSize()``) can retrieve the size information from BMP, GIF, PNG and JPG files.

-----

# Appendix
<a name="retrieveusingdoc"></a>
## 1. Retrieving Image Size using Google Document
~~~javascript
function getSize_doc(blob) {
  var docfile = Drive.Files.insert({
    title: "temp",
    mimeType: "application/vnd.google-apps.document",
  }).getId();
  var img = DocumentApp.openById(docfile).insertImage(0, blob);
  Drive.Files.remove(docfile);
  return {width: img.getWidth(), height: img.getHeight()};
}
~~~

# Update History
* v1.0.0 (June 27, 2017)

    Initial release.

[TOP](#TOP)
