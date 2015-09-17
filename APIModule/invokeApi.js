/**
 * Created by wxliud on 2014/11/24.
 */
var http = require('http');
var iconv = require('iconv-lite');
var Url = require('url');
var BufferHelper =require('bufferhelper');

module.exports = function invokeApiForHttp(url,callback){
    url = Url.parse(url);
    http.get(url,function(res){
        var bufferHelper = new BufferHelper();
        res.on('data', function (chunk) {
            bufferHelper.concat(chunk);
        });
        res.on('end',function(){
            callback(iconv.decode(bufferHelper.toBuffer(),'utf-8'));
        });
    }).on('error',function(e){
        console.log("Got error: "+ e.message);
        callback(e);
    });
}