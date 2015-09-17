
module.exports = DbConfigInfo;


function DbConfigInfo() {};


var ConnectionConfig = function(option) {
    this.host = option.host || '127.0.0.1';
    this.user = option.user || 'root';
    this.password = option.password || '1qaz@WSX';
    this.database = option.database || 'data_exchange_center_sit';
    this.connectionLimit = option.connectionLimit ||10;
};

DbConfigInfo.prototype.StagingDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '115.28.205.176',
    user: 'root',
    password: 'Pass@word1',
    database: 'SmallBiz_marketing_sit',
    multipleStatements: true
});

DbConfigInfo.prototype.BusinessDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '182.92.104.145',
    user: 'root',
    password: '07Apples',
    database: 'SmallBiz_marketing_sit',
    multipleStatements: true
});

DbConfigInfo.prototype.LocalDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: '07Apples',
    database: 'data_exchange_center_sit',
    multipleStatements: true
});

DbConfigInfo.prototype.DbTables ={
    db_group                : 'core_group',
    db_user                 : 'core_user',
    db_user_group           : 'core_user_group',
    db_acl                  : 'core_acl',
    db_group_subscription   : 'core_group_subscription',
    db_model                : 'core_model',
    db_api                  : 'core_api',
    db_model_subscription   : 'core_model_subscription',
    db_api_subscription     : 'core_api_subscription'
};

DbConfigInfo.prototype.TokenConfig={
    SkipVerification:['image',
        'img',
        'js',
        'css',
        'verification',
        'login',
        'apiLogin',
        'GetLastAppFile',
        'GetCityInfoSummary',
        'room14.html',
        'room9.html',
        'map.html',
        'login.html',
        'app',
        'favicon.ico',
        'segment.html',
        'maintain'
    ],
    TokenSaveDays:7,//用于配置在mySqlDB/Redis中token的过期时间，单位：天
    DefaultRedirectPage:"/map.html"
};
DbConfigInfo.prototype.RedisSettings = {
    host: "127.0.0.1",
    port: 6379,
    expires:1000*60*60*24*7//用于配置在Redis存储的数据本身过期时间，单位：毫秒
};
DbConfigInfo.prototype.BasicSettings = {
    positiveValue:3,//正面
    negativeValue:-3//负面
};

//通云平台prod环境配置信息
//DbConfigInfo.prototype.androidAppSettings = {
//    appId:"ff80808148bbb4390148c0318dfc0375",//通云平台提供的appId
//    secretKey:"72pxv2Sf",//通云平台提供的加密及解密公钥
//    SaasPlatformUrl:'http://211.141.29.81:50003/csop-apiserver/services/SaaS2AppService?wsdl'//通云平台的webservice地址
//};

//通云平台sit环境配置信息
DbConfigInfo.prototype.androidAppSettings = {
    appId:"ff80808148a6eb8a0148a6f060150002",//通云平台提供的appId
    secretKey:"I3ieRgZ3",//通云平台提供的加密及解密公钥
    SaasPlatformUrl:'http://211.141.29.81:20981/csop-apiserver/services/SaaS2AppService?wsdl'//通云平台的webservice地址
};

//兰州平台环境配置信息
DbConfigInfo.prototype.lanzhouAppSettings = {
    appId:"d3821a29cd7e4fee86c89cb894ae7495",//通云平台提供的appId
    secretKey:"SJT11250",//通云平台提供的加密及解密公钥
    SaasPlatformUrl:'http://172.16.3.150:10086/DataServer/services/SaaS2AppService?wsdl'//兰平台的webservice地址
};

//莆田平台环境配置信息
DbConfigInfo.prototype.putianAppSettings = {
    appId:"ff80808148a6eb8a0148a6f060150002",//通云平台提供的appId
    secretKey:"I3ieRgZ3",//通云平台提供的加密及解密公钥
    SaasPlatformUrl:'http://211.141.29.81:20981/csop-apiserver/services/SaaS2AppService?wsdl'//莆田平台的webservice地址
};

//烟台平台环境配置信息
DbConfigInfo.prototype.yantaiAppSettings = {
    appId:"ff80808148a6eb8a0148a6f060150002",//通云平台提供的appId
    secretKey:"I3ieRgZ3",//通云平台提供的加密及解密公钥
    SaasPlatformUrl:'http://211.141.29.81:20981/csop-apiserver/services/SaaS2AppService?wsdl'//烟台平台的webservice地址
};

//自用平台环境配置信息
DbConfigInfo.prototype.ziyongAppSettings = {
    appId:"ff80808148a6eb8a0148a6f060150002",//通云平台提供的appId
    secretKey:"I3ieRgZ3",//通云平台提供的加密及解密公钥
    SaasPlatformUrl:'http://211.141.29.81:20981/csop-apiserver/services/SaaS2AppService?wsdl'//自用平台的webservice地址
};

/**
 *
 * @summary 默认本地管理员用户信息配置
 * */
DbConfigInfo.prototype.defaultLocalAdminInfo= {
    adminName:"Admin",//租户初始管理员登陆名称
    adminPwd:"123456"//租户初始管理员登陆名称
};

DbConfigInfo.prototype.CurrentServiceInfo = {
    ip: '182.92.104.145'
}