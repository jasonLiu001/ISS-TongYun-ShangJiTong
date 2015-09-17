/**
 * Created by wang on 2014/9/29.
 */

var crypto = require('crypto');
var CryptoJS = require("crypto-js");

function Crypto(){}

/**
*
 * 消息明文加密
 * @param plainText {string} 需要加密的xml明文
 * @param key {string} 加密密钥
* */
Crypto.encryptSSOPlain=function(plainText,key){
   plainText=Crypto.MD5(plainText)+plainText;
   var encryptText=Crypto.encrypt(plainText,'uft8',Crypto.odd(Crypto.MD5Encrypt(key)),key);
   return encryptText;
};

/**
 * 消息明文解密
 * @param message {string} 需要解密的字符串
 * @param key {string} 解密密钥
* */
Crypto.decryptSSOPlain=function(message,key){
    var decryptText=Crypto.decrypt(message,'uft8',Crypto.odd(Crypto.MD5Encrypt(key)),key);
    decryptText=decryptText.substring(32,decryptText.length);
    return decryptText;
};

/**
*
 * @summary MD5加密key值
 * @param strSource {string} 需要加密的初始字符串 *
 * @return 加密之后的字符
* */
Crypto.MD5Encrypt=function(strSource){
    var MD5Encrypt = crypto.createHash("md5");
    var bytes = getBytesArray(strSource);
    var encryptString;
    var buffer=new Buffer(bytes,'utf8');
    MD5Encrypt.update(buffer);

    encryptString = MD5Encrypt.digest('hex');

    if(encryptString.length<32){
        encryptString="0"+encryptString;
    }
    encryptString=encryptString.substring(8,24);

    return encryptString;
};

/**
*
 * @summary: MD5加密消息体body.
 * @param length {string} 指定加密长度 16或者32
* */
Crypto.MD5=function(strSource, length){
    var MD5Encrypt = crypto.createHash("md5");
    var bytes = getBytesArray(strSource);
    var encryptString;
    var buffer=new Buffer(bytes,'utf8');
    MD5Encrypt.update(buffer);

    encryptString = MD5Encrypt.digest('hex');
    switch (length) {
        case 16:
            encryptString = encryptString.substr(8, 16);
            break;
        case 32:
            encryptString = encryptString.substr(0, 32);
            break;
        default :
            encryptString = encryptString.substr(0, 32);
            break;
    }

    return encryptString;
};

/**
*
 *
 * @summary 取md5字符串中的奇数位
* */
Crypto.odd=function(md5Key){
    var count = md5Key.length;
    var charArr = [];
    for (var i = 0; i < count; i += 2) {
        charArr.push(md5Key.substr(i, 1));
    }

    var oddString = charArr.join('');
    return oddString;
};

/**
*
 * @summary DES加密方法
 * @param encryptString {string} 需要加密的原始字符串
 * @param encoding {string} 字符编码格式 默认为值 'utf8'
 * @param key {string} 通过MD5Encrypt和odd函数对给定的key计算之后的值
 * @param iv {string} 初始给定的key值，初始加密向量
 * @return 加密之后的字符串
* */
Crypto.encrypt=function(encryptString, encoding, key, iv){
    key=CryptoJS.enc.Utf8.parse(key);
    iv=CryptoJS.enc.Utf8.parse(iv);
    var encoded=CryptoJS.DES.encrypt(encryptString,key,{iv:iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7});
    var encodedStr=encoded.toString();
    var base64EncodeStr=CryptoJS.enc.Base64.parse(encodedStr).toString(CryptoJS.enc.Base64);
    return base64EncodeStr;
};

/**
 *
 * @summary DES解密方法
 * @param decryptString {string} 需要解密的字符串
 * @param encoding {string} 字符编码格式 默认为值 'utf8'
 * @param key {string} 通过MD5Encrypt和odd函数对给定的key计算之后的值
 * @param iv {string} 初始给定的key值，初始加密向量
 * @return 解密之后的字符串
 * */
Crypto.decrypt=function(decryptString,encoding,key,iv){
    key=CryptoJS.enc.Utf8.parse(key);
    iv=CryptoJS.enc.Utf8.parse(iv);
    var decoded = CryptoJS.DES.decrypt(decryptString,key,{iv:iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7});
    var decodedStr=decoded.toString(CryptoJS.enc.Base64);
    var uft8DecodedStr=CryptoJS.enc.Base64.parse(decodedStr).toString(CryptoJS.enc.Utf8);
    return uft8DecodedStr;
};

/**
*
 * @summary 根据字符串得到字节数组
* */
function getBytesArray(str) {
    var bytes = [];
    var charArr = str.split('');
    for (var index in charArr) {
        var char = charArr[index];
        var code = char.charCodeAt(0);
        bytes.push(code);
    }
    return bytes;
}

module.exports=Crypto;