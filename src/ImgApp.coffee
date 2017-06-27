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
  return new ImgApp(blob).GetSize()
}
`

do(r=@)->
    class ImgApp
        @name = "ImgApp"


        constructor: (blob) ->
            @bytear = do (blob) ->
                try
                    return blob.getBytes()
                catch e
                    throw new Error("Cannot retrieve file blob.")
            @format = ""


        GetSize: () ->
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
            return res


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
                if (byte2hex_num.call @, @bytear[i]) is "ff"
                    i += 1
                    ma = byte2hex_num.call @, @bytear[i]
                    if ma is "c0" or ma is "c1" or ma is "c2"
                        break
                    else
                        i += hex2num.call @, (byte2hex.call @, @bytear.slice(i+1, i+3))

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


        byte2hex_num = (data) ->
            conv = `(data < 0 ? data + 256 : data).toString(16)`
            `conv.length == 1 ? "0" + conv : conv`


        byte2hex = (data) ->
            conv = `[(i < 0 ? i + 256 : i).toString(16) for each (i in data)]`
            `[i.length == 1 ? "0" + i : i for each (i in conv)]`


        byte2num = (data, byteorder) ->
            if byteorder
                datlen = data.length
                conv = new Array datlen
                j = 0
                `for (var i=datlen-1; i>=0; i-=1){
                    var temp = (data[i] < 0 ? data[i] + 256 : data[i]).toString(16);
                    if (temp.length == 1) {
                        temp = "0" + temp;
                    }
                    conv[j] = temp;
                    j += 1;
                }`
            else
                conv = byte2hex.call @, data

            hex2num.call @, conv


        hex2num = (data) ->
            parseInt data.join(""), 16


    r.ImgApp = ImgApp
