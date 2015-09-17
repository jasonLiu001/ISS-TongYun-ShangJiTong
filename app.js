var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var secret = 'iMarketing';
var soap=require('soap'),
    http=require('http'),
    soapServicesForSaaS=require('./APIModule/soapServicesForSaaS.js');

var apiRouter = require('./APIModule/APIRouter.js');
var oauth2 = require('./APIModule/oauth2.js');
var authentication = require("./APIModule/authentication.js");

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser(secret));
app.use(session({secret: secret}));

//app.use(authentication.IsLogined);

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/samples'));

//app.use(express.static(__dirname + '/public/map/'));
app.use(express.static(__dirname + '/app/'));

app.use('/',apiRouter);
app.use(oauth2.errorHandler);

var xml = require('fs').readFileSync('App2SaaSService.wsdl', 'utf8');
// use http to create webServer in order to support the soap listen method.
var server=http.createServer(app).listen(1337,function () {
    console.log('Express server http://127.0.0.1:1337');
});
//通云平台调用webservice服务接口
var soapServer=soap.listen(server, '/WebServices/App2SaaSService', soapServicesForSaaS.webServicesForSaaS, xml);
//webservice调用日志记录
soapServer.log = function(type, data) {
    var date=new Date();
    var currentTime=date.toDateString()+' '+date.toLocaleTimeString();
    if(type==="received"){
        console.log("["+currentTime+"]:接收的请求消息内容:"+data+"\r\n");
    }
    if(type==="replied"){
        console.log("["+currentTime+"]:服务器响应消息内容:"+data+"\r\n");
    }
};