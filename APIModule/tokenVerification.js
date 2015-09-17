/**
 * Created by Wanji on 2014/8/1.
 */
var DbHelperClass = require('../lib/DbHelper.js');
var DbConfigInfo = require('../Config.js');
var DbHelper = new DbHelperClass(new DbConfigInfo().BusinessDB);
var TokenConfig = new DbConfigInfo().TokenConfig;
var moment = require('moment');
var crypto = require('crypto');
var Utility = require('../lib/Utility');
var utility = new Utility();

var RedisHelper = require('../lib/RedisHelper.js');
var redisHelper = new RedisHelper();

//保存Token
exports.SaveToken = function SaveTokens(req, token, expires, user, clientInfo, callback) {
    //数据准备
    var currentToken = token;
    var tokenExpires = moment(expires).utc().format('YYYY-MM-DD HH:mm:ss');
    var userId = user.id;
    var tenant = user.tenant;
    var ipAddress = req.host;
    var ipsProxy = req.ips.toString();
    var userAgent = req.get('User-Agent');
    var createTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
    //构造SQL命令
    var sqlCommand = "INSERT INTO `core_authorization` " +
        "(`currentToken`,`tokenExpires`,`userId`,`tenant`,`ipAddress`,`ipsProxy`," +
        "`userAgent`,`createTime`) " +
        "VALUES(?,?,?,?,?,?,?,?);";
    var sqlParameter = [currentToken, tokenExpires, userId, tenant, ipAddress, ipsProxy, userAgent, createTime];
    DbHelper.ExecuteQuery(sqlCommand, sqlParameter, function (err, res) {
        if (err) {
            console.log('tokenVerification_SaveToken error:' + err.message);
            return;
        }
        console.log('tokenVerification_SaveToken success: ' + res);
        callback(err, true);
    });
    //保存到Redis
    var userClient = {ipsProxy: ipsProxy, userAgent: userAgent,
        ipAddress: ipAddress, tokenExpires: tokenExpires, clientInfo: clientInfo};
    redisHelper.set(currentToken, JSON.stringify(userClient));
};
//验证Token
exports.VerifyToken = function (req, res, callback) {
    //获取客户端Token
    var currentToken = null;
    try {
        currentToken = req.cookies.clienttoken //点击了记住我
            //|| req.session.AuthenticationToken//未点击记住我
            || req.headers.authentication;//来自Mobile

        var clientInfo = utility.ParamToJson(currentToken);
        if (typeof(clientInfo) == "object") {
            currentToken = clientInfo.ClientToken;
        }
    }
    catch (e) {
        currentToken = currentToken;
    }
    console.log("VerifyToken:[%s],token comes from [%s]", currentToken, req.originalUrl);
    if (currentToken) {
        //验证
        var ipAddress = req.host;
        var ipsProxy = req.ips.toString();
        var userAgent = req.get('User-Agent');
        //redis 快速验证开始
        redisHelper.get(currentToken, function (value) {
            if (value!=null&&value!=false) {
                var userClient = JSON.parse(value);
                var currentTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                var expiresTime = moment(userClient.tokenExpires).utc().format('YYYY-MM-DD HH:mm:ss');
                if (moment(currentTime).isBefore(expiresTime)) {
                    var rt = ipAddress == userClient.ipAddress &&
                        ipsProxy == userClient.ipsProxy &&
                        userAgent == userClient.userAgent;
                    if (rt) {
                        console.log('Redis Verify Token(%s) Success!', currentToken);
                        callback(true);//验证通过
                    }
                    else {
                        callback(false);//用户客户端信息不匹配验证失败
                    }
                }
                else {
                    callback(false);//Token过期
                }
            }
            else{
                //redis 快速验证结束
                //构造SQL查询逻辑
                var sqlCommand = 'SELECT `Id`,`tokenExpires` ' +
                    'FROM `core_authorization` ' +
                    'where currentToken=? and ipAddress=? and ipsProxy=? and userAgent=?; ';
                var sqlParameters = [currentToken, ipAddress, ipsProxy, userAgent];
                DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, res) {
                    if (err) {
                        console.log('tokenVerification_VerifyToken error ' + err.message);
                        callback(false);
                    }
                    else {
                        if (res.length > 0) {
                            var result = res[0];
                            var currentTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                            var expiresTime = moment(result.tokenExpires).utc().format('YYYY-MM-DD HH:mm:ss');
                            if (moment(currentTime).isBefore(expiresTime)) {
                                callback(true);//验证通过
                            }
                            else {
                                callback(false);//Token过期
                            }
                        }
                        else {
                            callback(false);//数据库无此Token
                        }
                    }
                });
            }
        });
    }
    else {
        callback(false);//无客户端Token
    }
};
//通过Token获取用户信息
exports.GetUserInformationByToken = function GetUserInformationByToken(token, callback) {
    var currentToken = token;
    redisHelper.get(currentToken, function (value) {
        if(value!=null&&value!=false) {
            var redisInfo = JSON.parse(value);
            console.log("GetUserInformationByToken from Redis:[%s]", currentToken);
            callback(true, redisInfo.clientInfo);
        }
        else{
            var sqlCommand =
                "SELECT a.`Id`,a.`userId` as 'UserID',a.`tenant` as 'TenantID', a.currentToken as 'ClientToken', " +
                "u.username UserName,  " +
                "t.customer_names CustomName " +
                "FROM `core_authorization` a " +
                "left join core_user u " +
                "on a.userId=u.id " +
                "left join tenants_tenants t " +
                "on a.tenant=t.id " +
                "where a.currentToken=? " +
                "group by a.`userId`,a.`tenant` " +
                "limit 1; ";
            var sqlParameters = [currentToken];
            DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, res) {
                if (err) {
                    console.log('tokenVerification_GetUserInformationByToken error ' + err.message);
                    callback(false, err);
                }
                if (res.length > 0) {
                    var result = res[0];
                    var clientInfo = {ClientToken: result.ClientToken,
                        CustomName: result.CustomName,
                        TenantID: result.TenantID,
                        UserID: result.UserID,
                        UserName: result.UserName};
                    console.log("GetUserInformationByToken from DB:[%s]", currentToken);
                    callback(true, clientInfo);
                }
                else {
                    callback(false, err);
                }
            });
        }
    });
};

//延期Token（指定过期日期）
exports.DelayToken = function (req, res, token, expires) {
    var sqlCommand = 'UPDATE `core_authorization` ' +
        'SET `tokenExpires` = ? ' +
        'WHERE `currentToken` = ?;';
    var sqlParameters = [token, expires];
    sqlCommand = "call DelayToken(?,?);";
    DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, result) {
        if (err) {
            console.log('tokenVerification_DelayToken error ' + err.message);
            return;
        }
        //res.json({AffectRowCount: result.affectedRows});
        res.json(result);
    });
};
//延期Token（配置时间）
exports.ClientRequestDelayToken = function (req) {
    var token = GetTokenFromRequest(req);
    var now = moment().add(TokenConfig.TokenSaveDays, 'day');
    var expiresFromNow = now.utc().format('YYYY-MM-DD HH:mm:ss');
    //刷新MysqlDB token过期时间
    var sqlCommand = 'UPDATE `core_authorization` ' +
        'SET `tokenExpires` = ? ' +
        'WHERE `currentToken` = ?;';
    var sqlParameters = [token, expiresFromNow];
    sqlCommand = "call DelayToken(?,?);";
    DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, result) {
        if (err) {
            console.log('tokenVerification_DelayToken error ' + err.message);
            return;
        }
        //res.json({AffectRowCount: result.affectedRows});
        res.json(result);
    });
    //刷新Redis token过期时间
    redisHelper.get(token, function (value) {
        var ci = JSON.parse(value);
        ci.tokenExpires = expiresFromNow;
        redisHelper.set(token, ci);
    });
};
//删除Token
exports.DeleteToken = function (token, callback) {
    getUserInformationByToken(token, function (noerr, result) {
        if (noerr) {
            var sqlCommand = 'Delete from `core_authorization` ' +
                'WHERE `Id` = ?;';
            var sqlParameters = [result.Id];
            DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, result) {
                if (err) {
                    console.log('tokenVerification_DelayToken error ' + err.message);
                }
                callback(err, result.affectedRows);
            });
        }
    });
};
//刷新Token
exports.RefreshToken = function (req, res) {
    //数据准备
    var now = moment().add(7, 'day');
    var expiresFromNow = now.utc().format('YYYY-MM-DD HH:mm:ss');

    var oldToken = GetTokenFromRequest(req);
    console.log(oldToken);
    getUserInformationByToken(oldToken, function (noerr, result) {
        if (noerr) {
            generateRandomToken(function (err, token) {
                var id = result.Id;
                var currentToken = token;
                var tokenExpires = expiresFromNow;
                var userId = result.userId;
                var tenant = result.tenant;
                var ipAddress = req.host;
                var ipsProxy = req.ips.toString();
                var userAgent = req.get('User-Agent');
                var lastToken = oldToken;
                var createTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                //构造SQL语句
                var sqlCommand = "INSERT INTO `core_authorization` " +
                    "(`currentToken`,`tokenExpires`,`userId`,`tenant`,`ipAddress`,`ipsProxy`," +
                    "`userAgent`,`lastToken`,`createTime`) " +
                    "VALUES(?,?,?,?,?,?,?,?,?);";
                var sqlParameters = [currentToken, tokenExpires, userId, tenant, ipAddress, ipsProxy,
                    userAgent, lastToken, createTime];
                //插入
                DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, result) {
                    if (err) {
                        console.log('tokenVerification_RefreshToken error ' + err.message);
                        return res.json({RefreshToken: false});
                    }
                    try {
                        if (req.signedCookies.AuthenticationToken)
                            res.cookie('AuthenticationToken', token, {
                                signed: true,
                                expires: new Date(expiresFromNow),
                                httpOnly: true
                            });
                    }
                    catch (ex) {
                        req.session.AuthenticationToken = token;
                    }
                    DbHelper.ExecuteQuery('delete from core_authorization where Id=?',
                        [id], function (err, result) {
                            console.log(result);
                        });
                    return res.json({RefreshToken: true});
                });
            });
        }
        else {
            console.log('4');
            return res.json({RefreshToken: false});
        }
    });
};

var generateRandomToken = function (callback) {
    crypto.randomBytes(256, function (err, buffer) {
        if (err) return callback(err);
        var token = crypto
            .createHash('sha1')
            .update(buffer)
            .digest('hex');

        callback(false, token);
    });
};
function getUserInformationByToken(token, callback) {
    var sqlCommand = 'SELECT *  ' +
        'FROM `core_authorization` ' +
        'WHERE currentToken=?;';
    var sqlParameters = [token];
    DbHelper.ExecuteQuery(sqlCommand, sqlParameters, function (err, res) {
        if (err) {
            console.log('tokenVerification_GetUserInformationByToken error ' + err.message);
            return;
        }
        if (res.length > 0) {
            var result = res[0];
            return callback(true, result);
        }
        callback(false, res);
    });
};
function GetTokenFromRequest(req) {
    var currentToken = null;
    try {
        currentToken = req.signedCookies.AuthenticationToken //点击了记住我
            || req.session.AuthenticationToken//未点击记住我
            || req.headers.authentication;//来自Mobile

        var clientInfo = utility.ParamToJson(currentToken);
        if (typeof(clientInfo) == "object") {
            currentToken = clientInfo.ClientToken;
        }
    }
    catch (e) {
        currentToken = currentToken;
    }
    return currentToken;
}