var DbHelperClass = require('../lib/DbHelper.js');
var DbConfigInfo = require('../Config.js');
var DbHelp = new DbHelperClass(new DbConfigInfo().BusinessDB);
var model = module.exports;
var crypto = require('crypto');

// 获得用户AccessToken
model.getAccessToken = function (bearerToken, callback) {
    var sqlCommand = "select accessToken,accessTokenExpires 'expires',clientId,userId " +
        "from oauth_client " +
        "where accessToken=?;";
    var sqlCommandParameters = [bearerToken];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if (result.length == 1) {
            var oauthclient = result[0]
            return callback(false, oauthclient);
        }
        else {
            callback(false, false);
        }
    });
};
// 获得用户RefresToken
model.getRefreshToken = function (bearerToken, callback) {
    var sqlCommand = "select refreshToken,refreshTokenExpires 'expires',clientId,userId " +
        "from oauth_client " +
        "where refreshToken=?;";
    var sqlCommandParameters = [bearerToken];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if (result.length == 1) {
            var oauthclient = result[0];
            return callback(false, oauthclient);
        }
        else {
            callback(false, false);
        }
    });
};

//从oauth_client获取client
model.getClient = function (clientId, clientSecret, callback) {
    var sqlCommand = 'select clientId,clientScret,redirectUri ' +
        'from oauth_client ' +
        'where clientId=? and clientScret=?;';
    var sqlCommandParameters = [clientId, clientSecret];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if (result.length == 1) {
            var client = result[0]
            return callback(false, client);
        }
        else {
            callback(false, false);
        }
    });
};
//检查client是授权类型是否被允许
model.grantTypeAllowed = function (clientId, grantType, callback) {
    var sqlCommand = "select count(*) 'isAllow' " +
        "from oauth_client " +
        "where clientId=? and find_in_set(?,grantType);";
    var sqlCommandParameters = [clientId, grantType];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if (result.length == 1) {
            var client = result[0].isAllow>0;
            return callback(false, true);
        }
        else {
            callback(false, false);
        }
    });
};

//保存AccessToken
model.saveAccessToken = function (accessToken, clientId, expires, user, callback) {
    var sqlCommand = "UPDATE `oauth_client` " +
        "SET " +
        "`accessToken` = ?, "+
        "`accessTokenExpires` = cast(? as datetime) "+
        "WHERE `clientId` = ? and `userId` = ?;";
    var sqlCommandParameters = [accessToken, expires.format('yyyy-MM-dd hh:mm:ss'),clientId,user.id];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if(err){
            callback(true);
        }
        else{
            callback(false);
        }
    });
};
//保存RefreshToken
model.saveRefreshToken = function (refreshToken, clientId, expires, userId, callback) {
    if(expires==null){
        expires=new Date();
    }
    var sqlCommand = "UPDATE `oauth_client` " +
        "SET " +
        "`refreshToken` = ?, "+
        "`refreshTokenExpires` = cast(? as datetime) "+
        "WHERE `clientId` = ? and `userId` = ?;";
    var sqlCommandParameters = [accessToken, expires.format('yyyy-MM-dd hh:mm:ss'),clientId,user.id];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if(err){
            callback(true);
        }
        else{
            callback(false);
        }
    });
};

//验证用户信息
/*
    用于采用密码授权方式,授权客户端可以采用Plaintext password或者crypto password 传递密码进行验证，
    如果非明文传递密码需保证加密方式和iMarketing OAuth2.0 server的加密方式一致（sha512 hex）128位
 */
model.getUser = function (username, password, callback) {
    if(password.length<128) {
        var sha512 = crypto.createHash('sha512');
        password = sha512.update(password).digest('hex');
    }
    var sqlCommand = " select u.id 'id',u.username 'username',s.pwdhashsha512 'password' " +
        " from core_usersecurity s " +
        " left join core_user u " +
        " on s.userid=u.id " +
        " where u.username=? and s.pwdhashsha512=? ";
    var sqlCommandParameters = [username, password];
    DbHelp.ExecuteQuery(sqlCommand, sqlCommandParameters,function (err, result) {
        if (result.length == 1) {
            var user = result[0];
            return callback(false, user);
        }
        else {
            callback(false, false);
        }
    });
};
Date.prototype.format = function(format){
    var o = {
        "M+" : this.getMonth()+1, //month
        "d+" : this.getDate(), //day
        "h+" : this.getHours(), //hour
        "m+" : this.getMinutes(), //minute
        "s+" : this.getSeconds(), //second
        "q+" : Math.floor((this.getMonth()+3)/3), //quarter
        "S" : this.getMilliseconds() //millisecond
    };

    if(/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }

    for(var k in o) {
        if(new RegExp("("+ k +")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
        }
    }
    return format;
};
