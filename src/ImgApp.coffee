`
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
  return new ImgApp().GetSize(blob)
}

/**
 * Resize image from inputted width. When the source file is Google Docs (spreadsheet, document and slide),<br>
 * its thumbnail is created and it is resized.<br>
 * In order to use this method, please enable Drive API at Google API console.<br>
 *<br>
 * <h3>usage</h3>
 * var res = ImgApp.doResize(fileId, width);<br>
 * DriveApp.createFile(res.blob.setName("filename")); // If you want to save as a file, please use this.<br>
 *<br>
 * @param {string} fileId File ID on Google Drive
 * @param {integer} width Resized width you want
 * @return {Object} JSON object {blob: [blob], originalwidth: ###, originalheight: ###, resizedwidth: ###, resizedheight: ###}
 */
function doResize(fileId, width) {
  return new ImgApp().DoResize(fileId, width)
}

/**
 * Update a thumbnail of a file using an image.<br>
 * There are some limitations for updating thumbnail.<br>
 * Please confirm the detail information at https://developers.google.com/drive/v3/web/file#uploading_thumbnails.<br>
 *   - If Drive can generate a thumbnail from the file, then it will use the generated one and ignore any you may have uploaded.<br>
 *   - If it cannot generate a thumbnail, it will always use yours if you provided one.<br>
 *<br>
 * <h3>usage</h3>
 * ImgApp.updateThumbnail(imgFileId, srcFileId);<br>
 *<br>
 * @param {string} imgFileId File ID of new thumbnail image on Google Drive
 * @param {string} srcFileId File ID of file, which is updated thumbnail, on Google Drive
 * @return {Object} JSON object id,mimeType,name,thumbnailVersion,thumbnailLink
 */
function updateThumbnail(imgFileId, srcFileId) {
  return new ImgApp().UpdateThumbnail(imgFileId, srcFileId)
}

/**
 * This method is for editing images. In the current stage, the image can be cropped. And several images can be merged as an image.<br>
 * <br>
 * <h3>usage</h3>
 * ImgApp.editImage(object);<br>
 * <br>
 * @param {Object} object Object for using this method.
 * @return {Object} Blob of result image.
 */
function editImage(object) {
  return new ImgApp().EditImage(object)
}
`

do(r=@)->
    class ImgApp
        @name = "ImgApp"


        constructor: (blob) ->
            @bytear = []


        # EditImage --------------------------------------------------------------------------------
        EditImage: (obj_) ->
            if obj_.hasOwnProperty("blob") and obj_.hasOwnProperty("crop") and obj_.blob.toString() is "Blob" and typeof obj_.crop is "object"
                cropImage.call @, obj_

            else if obj_.hasOwnProperty("merge") and Array.isArray(obj_.merge) and Array.isArray(obj_.merge[0])
                mergeImages.call @, obj_

            else
                throw new Error("Wrong object. Please confirm it again.")


        mergeImages = (obj_) ->
            canvas = obj_.merge.reduce (o, r) =>
                mWidth = 0
                mHeight = 0
                ar = []
                r.forEach (c) =>
                    if c and c.toString() is "Blob"
                        temp = @GetSize c

                        if temp.width * temp.height > 25000000
                            throw new Error("The image size is too large. Please check https://gist.github.com/tanaikech/9414d22de2ff30216269ca7be4bce462")

                        ar.push
                            blob: c
                            left: mWidth
                            top: o.maxHeight
                            width: temp.width
                            height: temp.height

                        mWidth += temp.width
                        if mHeight < temp.height
                            mHeight = temp.height
                    else
                        ar.push null
                o.images.push ar
                if o.maxWidth < mWidth
                    o.maxWidth = mWidth
                o.maxHeight += mHeight
                o
            ,
            maxWidth: 0
            maxHeight: 0
            images: []

            object =
                title: "tempForImaApp"
                width:
                    unit: "pixel"
                    size: canvas.maxWidth
                height:
                    unit: "pixel"
                    size: canvas.maxHeight

            presentationId = (new SlidesAppp("create")).createNewSlidesWithPageSize object
            slides = SlidesApp.openById(presentationId)
            slide = slides.getSlides()[0]
            canvas.images.forEach (r) ->
                r.forEach (c) ->
                    if c
                        slide.insertImage(
                            c.blob
                            pixelToPt.call(@, c.left)
                            pixelToPt.call(@, c.top)
                            pixelToPt.call(@, c.width)
                            pixelToPt.call(@, c.height)
                        )
                    return
                return

            slides.saveAndClose()
            rs = if canvas.maxWidth > 1600 then 1600 else canvas.maxWidth
            if obj_.hasOwnProperty("outputWidth") and obj_.outputWidth > 0 and obj_.outputWidth <= 1600
                rs = obj_.outputWidth

            croppedBlob = getImageFromSlide.call @, presentationId, slide.getObjectId(), rs, obj_.outputFilename
            DriveApp.getFileById(presentationId).setTrashed(true)
            croppedBlob


        cropImage = (obj_) ->
            unit = if obj_.hasOwnProperty("unit") and typeof obj_.unit is "string" then obj_.unit else "pixel"
            size = @GetSize obj_.blob
            if size.width * size.height > 25000000
                throw new Error("The image size is too large. Please check https://gist.github.com/tanaikech/9414d22de2ff30216269ca7be4bce462")

            width = if obj_.unit is "point" then pixelToPt.call(@, size.width) else size.width
            height = if obj_.unit is "point" then pixelToPt.call(@, size.height) else size.height

            [t, b, l, r] = ["t", "b", "l", "r"].map (k) ->
                if obj_.crop.hasOwnProperty(k) then Number(obj_.crop[k]) else 0

            object =
                title: "tempForImaApp"
                width:
                    unit: obj_.unit
                    size: width - r - l
                height:
                    unit: obj_.unit
                    size: height - b - t

            presentationId = (new SlidesAppp("create")).createNewSlidesWithPageSize object
            slides = SlidesApp.openById(presentationId)
            slide = slides.getSlides()[0]
            setWidth = if obj_.unit is "pixel" then pixelToPt.call(@, width) else width
            setHeight = if obj_.unit is "pixel" then pixelToPt.call(@, height) else height
            setL = if obj_.unit is "pixel" then pixelToPt.call(@, l) else l
            setT = if obj_.unit is "pixel" then pixelToPt.call(@, t) else t
            _ = slide.insertImage obj_.blob, -setL, -setT, setWidth, setHeight
            slides.saveAndClose()

            rs = size.width - (if obj_.unit is "point" then ptToPixel.call(@, l) else l) - (if obj_.unit is "point" then ptToPixel.call(@, r) else r)
            if obj_.hasOwnProperty("outputWidth") and obj_.outputWidth > 0 and obj_.outputWidth <= 1600
                rs = if obj_.unit is "point" then ptToPixel.call(@, obj_.outputWidth) else obj_.outputWidth

            croppedBlob = getImageFromSlide.call @, presentationId, slide.getObjectId(), rs, obj_.blob.getName()
            DriveApp.getFileById(presentationId).setTrashed(true)
            croppedBlob


        ptToPixel = (pt_) ->
            pt_ * 1.33333


        ptToEmu = (pt_) ->
            pt_ * 12700


        pixelToPt = (pixel_) ->
            pixel_ * 0.75


        pixelToEmu = (pixel_) ->
            pixel_ * 0.75 * 12700


        getImageFromSlide = (presentationId, slideId, rs, filename) ->
            croppedBlob = null

            try
                resObj  = Slides.Presentations.Pages.getThumbnail(
                    presentationId,
                    slideId,
                    "thumbnailProperties.thumbnailSize": "LARGE"
                    "thumbnailProperties.mimeType": "PNG"
                )
                try
                    url = resObj.contentUrl.replace(/=s\d+/, "=s" + Math.ceil(rs))
                    croppedBlob = UrlFetchApp.fetch(url).getBlob()
                catch er
                    throw new Error er.message

                croppedBlob = croppedBlob.setName(filename or "outputImageFromImgApp.png")

            catch e
                if e.message is "Slides is not defined"
                    throw new Error "Please enable Slides API at Advanced Google services, and try again."
                else
                    throw new Error e.message

            croppedBlob


        # UpdateThumbnail --------------------------------------------------------------------------------
        UpdateThumbnail: (imgFileId_, srcFileId_) ->
            throw new Error("No image file ID.") if !imgFileId_?
            throw new Error("No source file ID.") if !srcFileId_?
            img4thumb = DriveApp.getFileById(imgFileId_)
            mime = img4thumb.getMimeType()
            if mime isnt "image/png" and mime isnt "image/gif" and mime isnt "image/hpeg"
                throw new Error "The image format (" + mime + ") cannot be used for thumbnail."
            metadata =
                contentHints:
                    thumbnail:
                        image: Utilities.base64EncodeWebSafe img4thumb.getBlob().getBytes()
                        mimeType: mime
            fields = "id,mimeType,name,thumbnailVersion,thumbnailLink"
            url = "https://www.googleapis.com/upload/drive/v3/files/" + srcFileId_ + "?uploadType=multipart&fields=" + encodeURIComponent(fields)
            boundary = "xxxxxxxxxx"
            data = "--" + boundary + "\r\n"
            data += "Content-Disposition: form-data; name=\"metadata\"\r\n"
            data += "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            data += JSON.stringify(metadata) + "\r\n"
            data += "--" + boundary + "--\r\n"
            payload = Utilities.newBlob(data).getBytes()
            headers =
                "Authorization" : "Bearer " + ScriptApp.getOAuthToken()
                "Content-Type"  : "multipart/related; boundary=" + boundary
            method  = "patch"
            fetch.call @, url, method, payload, headers


        # DoResize --------------------------------------------------------------------------------
        DoResize: (fileId, width) ->
            try
                url = "https://www.googleapis.com/drive/v3/files/" + fileId + "?fields=thumbnailLink%2CmimeType"
                method = "get"
                headers =
                    "Authorization": "Bearer " + ScriptApp.getOAuthToken()
                res = fetch.call @, url, method, null, headers
                thumbUrl = res.thumbnailLink
                mimetype = res.mimeType
                r = thumbUrl.split "="
            catch e
                throw new Error "'" + fileId + "' is not compatible file. Error message is " + JSON.stringify(e)

            width = if width > 0 then width else 100
            n = false
            rs = {}

            if ~mimetype.indexOf('google-apps') or ~mimetype.indexOf('pdf')
                n = true
                turl = thumbUrl.replace r[r.length - 1], "s10000"
                rs = GetResizedSize.call @, (GetImage.call @, turl, "png"), width
            else if ~mimetype.indexOf 'image'
                rs = GetResizedSize.call @, DriveApp.getFileById(fileId).getBlob(), width
            else
                turl = thumbUrl.replace r[r.length - 1], "s10000"
                rs = GetResizedSize.call @, (GetImage.call @, turl, "png"), width

            blob = GetImage.call @, thumbUrl.replace(r[r.length - 1], "s" + if n then rs.reheight else rs.rewidth)
            resized = @GetSize blob

            blob           : blob
            identification : resized.identification
            originalwidth  : rs.orgwidth
            originalheight : rs.orgheight
            resizedwidth   : resized.width
            resizedheight  : resized.height


        GetImage = (turl) ->
            UrlFetchApp.fetch(
                    turl,
                    headers :
                        Authorization: "Bearer " + ScriptApp.getOAuthToken()
            ).getBlob()


        GetResizedSize = (blob, width) ->
            size = @GetSize blob
            ow = size.width
            oh = size.height
            if width > ow
                rw = ow
                rh = oh
            else
                rw = width
                rh = Math.ceil(width * oh / ow)

            orgwidth  : ow
            orgheight : oh
            rewidth   : rw
            reheight  : rh


        # GetSize --------------------------------------------------------------------------------
        GetSize: (blob) ->
            @bytear = do (blob) ->
                try
                    return blob.getBytes()
                catch e
                    throw new Error "Cannot retrieve file blob."
            getFormat.call @
            switch @format
                when "bmp"
                    res = getInfBMP.call @
                when "gif"
                    res = getInfGIF.call @
                when "png"
                    res = getInfPNG.call @
                when "jpg"
                    res = getInfJPG.call @
                else
                    res = Error: @format
            res


        getInfBMP = () ->
            identification : "BMP"
            width          : byte2num @bytear.slice(18, 22), true
            height         : byte2num @bytear.slice(22, 26), true
            filesize       : @bytear.length


        getInfGIF = () ->
            identification : "GIF"
            width          : byte2num @bytear.slice(6, 8), true
            height         : byte2num @bytear.slice(8, 10), true
            filesize       : @bytear.length


        getInfPNG = () ->
            identification : "PNG"
            width          : byte2num @bytear.slice(16, 20), false
            height         : byte2num @bytear.slice(20, 24), false
            filesize       : @bytear.length


        getInfJPG = () ->
            i = 0
            while i < @bytear.length
                i += 1
                if (byte2hexNum.call @, @bytear[i]) is "ff"
                    i += 1
                    ma = byte2hexNum.call @, @bytear[i]
                    if ma is "c0" or ma is "c1" or ma is "c2"
                        break
                    else
                        i += hex2num.call @, (byte2hex.call @, @bytear.slice i+1, i+3)

            identification : "JPG"
            width          : hex2num.call @, (byte2hex.call @, @bytear.slice i+6, i+8)
            height         : hex2num.call @, (byte2hex.call @, @bytear.slice i+4, i+6)
            filesize       : @bytear.length


        getFormat = () ->
            f = (byte2hex.call @, @bytear.slice(0, 8)).join("")
            @format = if f.slice(0, 16) == "89504e470d0a1a0a" then "png"
            else if f.slice(0, 4) == "ffd8" then "jpg"
            else if f.slice(0, 6) == "474946" then "gif"
            else if f.slice(0, 4) == "424d" then "bmp"
            else "Cannot retrieve image size. Now, it can retrive image size from png, jpg, gif and bmp."
            return


        byte2hexNum = (data) ->
            conv = (if data < 0 then data + 256 else data).toString(16)
            return (if conv.length is 1 then "0" + conv else conv)


        byte2hex = (data) ->
            data.map (e) ->
                (if e < 0 then e + 256 else e).toString(16)
            .map (e) ->
                return (if e.length is 1 then "0" + e else e)


        byte2num = (data, byteorder) ->
            if byteorder
                conv = data.reduceRight (ar, e) ->
                    temp = (if e < 0 then e + 256 else e).toString(16)
                    if temp.length is 1
                        temp = "0" + temp
                    ar.push temp
                    ar
                ,[]
            else
                conv = byte2hex.call @, data

            hex2num.call @, conv


        hex2num = (data) ->
            parseInt data.join(""), 16


        fetch = (url, method, payload, headers) ->
            try
                res = UrlFetchApp.fetch(
                        url,
                        method             : method
                        payload            : payload
                        headers            : headers
                        muteHttpExceptions : true
                        )
            catch e
                throw new Error e
            try
                r = JSON.parse res.getContentText()
            catch e
                r = res.getContentText()
            return r


    r.ImgApp = ImgApp
