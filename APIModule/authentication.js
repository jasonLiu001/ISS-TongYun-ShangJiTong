//var DbHelpModel = require('./dbHelp');
var DbHelperClass = require('../lib/DbHelper.js');
var manage = require('./manage.js');
var DbConfigInfo = require('../Config.js');

var crypto = require('crypto');
//var sessionConfig = new DbConfigInfo().SessionConfig;
//var SessionStore = require('express-mysql-session');
//var session = new SessionStore(sessionConfig);
var DbHelper = new DbHelperClass(new DbConfigInfo().BusinessDB);
var TokenConfig = new DbConfigInfo().TokenConfig;
var TokenVerification = require('./tokenVerification');
var moment = require('moment');
var async = require('async');

function User(user) {
    this.userName = user.username;
    this.userPwd = user.userpwd;
    this.tenantId = user.tenantId;
    this.customerName = user.customerName;
}

//根据用户名得到用户数量：返回值用户名数量
User.prototype.CheckUserByName = function CheckUserByName(callback) {
    //默认
    var etUserByName_Sql = "select count(*) as 'UserCount' from core_user where LOWER(username) = LOWER(?)";
    var etUserByName_SqlParameters = [this.userName];
    //有customerName
    if (Boolean(this.customerName == 'null' ? null : this.customerName)) {
        etUserByName_Sql = "select count(0) as 'UserCount' from core_user u " +
            "left join tenants_tenants t " +
            "on u.tenant=t.id " +
            "where LOWER(username) = LOWER(?) and LOWER(customer_names)=LOWER(?) " +
            "limit 1;";
        etUserByName_SqlParameters = [this.userName, this.customerName];
    }
    //有tenantID
    if (Boolean(this.tenantId == 'null' ? null : this.tenantId)) {
        etUserByName_Sql = "select count(*) as 'UserCount' from core_user where LOWER(username) = LOWER(?) and tenant=?";
        etUserByName_SqlParameters = [this.userName, this.tenantId];
    }

    DbHelper.ExecuteQuery(etUserByName_Sql, etUserByName_SqlParameters, function (err, result) {
        if (err) {
            console.log(err);
        }
        else {
            if(result[0]) {
                returnUserCount = result[0].UserCount;
                callback(returnUserCount);
            }
            else{
                callback(-1);
            }
        }
    });
};

/**
*
 * @summary 为商机通android提供的专用登录入口
* */
User.prototype.androidLogin = function Login(callback) {
    var self = this;
    self.CheckUserByName(function (returnUserCount) {
        if (returnUserCount >= 0) {
            //获取用户名和密码，密码加密
            var passWord = self.userPwd;
            var userName = self.userName;
            var tenantId = self.tenantId;
            var customerName = self.customerName;
            //构造用户名密码匹配SQL命令
            var login_Sql =
                " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                " from core_usersecurity s " +
                " left join core_user u " +
                " on s.userid=u.id " +
                " left join tenants_tenants t" +
                " on s.tenant=t.id" +
                " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? " +
                " limit 1; ";
            var login_SqlParameters = [userName, passWord];
            //有customerName
            if (Boolean(customerName == 'null' ? null : customerName)) {
                login_Sql =
                    " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                    " from core_usersecurity s " +
                    " left join core_user u " +
                    " on s.userid=u.id " +
                    " left join tenants_tenants t" +
                    " on s.tenant=t.id" +
                    " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? and t.customer_names=? " +
                    " limit 1; ";
                login_SqlParameters = [userName, passWord, customerName];
            }
            //有tenantID
            if (Boolean(tenantId == 'null' ? null : tenantId)) {
                login_Sql =
                    " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                    " from core_usersecurity s " +
                    " left join core_user u " +
                    " on s.userid=u.id " +
                    " left join tenants_tenants t" +
                    " on s.tenant=t.id" +
                    " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? and u.tenant=? " +
                    " limit 1; ";
                login_SqlParameters = [userName, passWord, tenantId];
            }
            DbHelper.ExecuteQuery(login_Sql, login_SqlParameters, function (err, result) {
                if (err) {
                    console.log(err.message);
                }
                if (result.length > 0) {
                    if (result[0].status.toString() == '1') {
                        callback(1, result[0]);//用户登录成功
                    }
                    else {
                        callback(-3, result[0]);//用户未启用
                    }
                }
                else {
                    callback(0);//用户密码错误
                }
            });
        }
        else {
            //用户不存在
            (Boolean(self.tenantId == 'null' ? null : self.tenantId) ||
                Boolean(self.customerName == 'null' ? null : self.customerName)) ?
                callback(-4) ://全局用户不存在
                callback(-1);//租户下用户不存在
        }
    });
};

//登录方法
User.prototype.Login = function Login(callback) {
    var self = this;
    self.CheckUserByName(function (returnUserCount) {
        if (returnUserCount >= 0) {
            //获取用户名和密码，密码加密
            var sha512 = crypto.createHash('sha512');
            var passWord = sha512.update(self.userPwd).digest('hex');
            var userName = self.userName;
            var tenantId = self.tenantId;
            var customerName = self.customerName;
            //构造用户名密码匹配SQL命令
            var login_Sql =
                " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                " from core_usersecurity s " +
                " left join core_user u " +
                " on s.userid=u.id " +
                " left join tenants_tenants t" +
                " on s.tenant=t.id" +
                " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? " +
                " limit 1; ";
            var login_SqlParameters = [userName, passWord];
            //有customerName
            if (Boolean(customerName == 'null' ? null : customerName)) {
                login_Sql =
                    " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                    " from core_usersecurity s " +
                    " left join core_user u " +
                    " on s.userid=u.id " +
                    " left join tenants_tenants t" +
                    " on s.tenant=t.id" +
                    " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? and t.customer_names=? " +
                    " limit 1; ";
                login_SqlParameters = [userName, passWord, customerName];
            }
            //有tenantID
            if (Boolean(tenantId == 'null' ? null : tenantId)) {
                login_Sql =
                    " select u.id,s.tenant,u.username,s.pwdhashsha512,t.customer_names custName,u.status " +
                    " from core_usersecurity s " +
                    " left join core_user u " +
                    " on s.userid=u.id " +
                    " left join tenants_tenants t" +
                    " on s.tenant=t.id" +
                    " where LOWER(u.username)=LOWER(?) and s.pwdhashsha512=? and u.tenant=? " +
                    " limit 1; ";
                login_SqlParameters = [userName, passWord, tenantId];
            }
            DbHelper.ExecuteQuery(login_Sql, login_SqlParameters, function (err, result) {
                if (err) {
                    console.log(err.message);
                }
                if (result.length > 0) {
                    if (result[0].status.toString() == '1') {
                        callback(1, result[0]);//用户登录成功
                    }
                    else {
                        callback(-3, result[0]);//用户未启用
                    }
                }
                else {
                    callback(0);//用户密码错误
                }
            });
        }
        else {
            //用户不存在
            (Boolean(self.tenantId == 'null' ? null : self.tenantId) ||
                Boolean(self.customerName == 'null' ? null : self.customerName)) ?
                callback(-4) ://全局用户不存在
                callback(-1);//租户下用户不存在
        }
    });
};
//Post登录
exports.PostLogin = function (req, res) {
    var userName = req.body.userName;
    var userPwd = req.body.userPwd;
    var isRem = req.body.isRem;
    var tenantId = req.body.tid;
    var customerName = req.body.cname;

    var returnUrl = req.body.returnUrl;
    req.signedCookies.ReturnURL;
    try {
        res.cookie('ReturnURL', returnUrl, {
            signed: true,
            expires: 0,
            httpOnly: true,
            path: '/',
            domain: req.host
        });
    }
    catch (ex) {
        res.cookie('ReturnURL', returnUrl, {
            signed: true,
            expires: 0,
            httpOnly: true,
            path: '/'
        });
    }


    var verificationCode = req.body.verificationCode;
    if (verificationCode == null || verificationCode == 'undefined') {
        return res.json({loginStatus: -2});//验证码不存在或者不正确
    }

    if (Boolean(req.session.VerificationCode)) {
        if (!VerificationMatch(verificationCode, req.session.VerificationCode, true)) {
            return res.json({loginStatus: -2});//验证码不存在或者不正确
        }
    }
    var user = new User({username: userName.toLowerCase(),
        userpwd: userPwd, tenantId: tenantId, customerName: customerName});
    //数据准备
    var now = moment().add(TokenConfig.TokenSaveDays, 'day');
    var expiresFromNow = now.utc().format('YYYY-MM-DD HH:mm:ss');
    console.log('LocalCookie Expire Date:' + new Date(expiresFromNow));
    user.Login(function (loginStatus, result) {
        console.log({loginStatus: loginStatus});
        if (loginStatus === 1) {
            //设置Session
            generateRandomToken(function (err, token) {
                //封装token+custom_name
                var clientInfo = {ClientToken: token,
                    CustomName: result.custName,
                    TenantID: result.tenant,
                    UserID: result.id,
                    UserName: user.userName};
                if (isRem == 'true') {
                    //设置客户端Session
                    var ck = req.signedCookies.AuthenticationToken;
                    try {
                        res.cookie('AuthenticationToken', clientInfo, {
                            signed: true,
                            expires: new Date(expiresFromNow),
                            httpOnly: true,
                            path: '/',
                            domain: req.host
                        });
                    } catch (ex) {
                        res.cookie('AuthenticationToken', clientInfo, {
                            signed: true,
                            expires: new Date(expiresFromNow),
                            httpOnly: true,
                            path: '/'
                        });
                    }
                }
                else {
                    var ck = req.signedCookies.AuthenticationToken;
                    try {
                        res.cookie('AuthenticationToken', clientInfo, {
                            signed: true,
                            expires: 0,
                            httpOnly: true,
                            path: '/',
                            domain: req.host
                        });
                        console.log('>>'+req.signedCookies.AuthenticationToken);
                    } catch (ex) {
                        res.cookie('AuthenticationToken', clientInfo, {
                            signed: true,
                            expires: 0,
                            httpOnly: true,
                            path: '/'
                        });
                    }
                    //req.session.AuthenticationToken = clientInfo;
                }
                //保存token信息到服务器
                TokenVerification.SaveToken(req, token, expiresFromNow, result,clientInfo, function (err) {
                    //发送结果
                     res.json({loginStatus: loginStatus, clientInfo: clientInfo});
                });
            });
        }
        else {
             res.json({loginStatus: loginStatus});
        }
    });
};

/**
*
 * @summary 为商机通android提供的本地用户映射登录入口
* */
exports.androidLogin=function(req,res){
    var bodyParams=req.body.query;
    //企业客户ID
    //var EcID=bodyParams.EcID;暂时改为用用户名做映射
    var EcID;
    var userName=bodyParams.userName;

    async.waterfall([function(callback){
        //根据企业客户查用户id或者用户名
        var sqlSelect="select m.local_userid,m.local_username from saas_user_mapping m where 1=1 ";
        var sqlSelectParam=[];
        if(EcID){
            sqlSelect+=" and m.saas_userid=?";
            sqlSelectParam.push(EcID);
        }else{
            sqlSelect+=" and m.saas_username=?";
            sqlSelectParam.push(userName);
        }

        DbHelper.ExecuteQuery(sqlSelect,sqlSelectParam,function(err,userInfo){
            if(err){
                callback(err, null);
            }else{
                if(userInfo.length>0){
                    callback(null, userInfo[0].local_userid,userInfo[0].local_username);//传递本地用户id和用户名
                }else{
                    callback(new Error("Cann't find query value in table saas_user_mapping, please add user mapping manually."),null,null);
                }
            }
        });
    },function(userid,username,callback){
        if(userid){
            var sql="select s.pwdhashsha512 from core_usersecurity s " +
                "left join core_user u " +
                "on s.userid=u.id where LOWER(u.id)=LOWER(?)";
            var sqlParams=[];
            sqlParams.push(userid);
            DbHelper.ExecuteQuery(sql,sqlParams,function(err,pwd){
                if(err){
                    callback(err, null);
                }else{
                    if(pwd.length>0){
                        callback(null, username, pwd[0].pwdhashsha512);//传递本地用户名和密码
                    }
                }
            });
        }else{
            callback(new Error('Can not find the local_userid in the table saas_user_mapping.'),null);
        }
    }
    ],function(err,username,userpwd){
        if(err){
            console.error(err);
            return res.json({loginStatus: 0,errorMsg:err});
        }
        var user = new User({username: username.toLowerCase(), userpwd: userpwd});
        //数据准备
        var now = moment().add(TokenConfig.TokenSaveDays, 'day');
        var expiresFromNow = now.utc().format('YYYY-MM-DD HH:mm:ss');
        user.androidLogin(function (loginStatus, result) {
            console.log({loginStatus: loginStatus});
            if (loginStatus === 1) {
                //设置Session
                generateRandomToken(function (err, token) {
                    //封装token+custom_name
                    var clientInfo = {ClientToken: token,
                        CustomName: result.custName,
                        TenantID: result.tenant,
                        UserID: result.id,
                        UserName: user.userName};
                    //保存token信息到服务器
                    TokenVerification.SaveToken(req, token, expiresFromNow, result,clientInfo, function (err) {
                        //发送结果
                        return res.json({loginStatus: loginStatus, clientInfo: clientInfo});
                    });
                });
            }
            else {
                return res.json({loginStatus: loginStatus});
            }
        });
    });

};

exports.ApiLogin = function (req, res) {
    var userName = req.body.userName;
    var bodyParams=typeof(req.body.query)=="object"?req.body.query:JSON.parse(req.body.query);

    if(!userName){
        userName=bodyParams.userName;
    }
    var userPwd = req.body.userPwd;
    if(!userPwd){
        userPwd=bodyParams.userPwd;
    }
    var isRem = req.body.isRem;
    var user = new User({username: userName.toLowerCase(), userpwd: userPwd});
    //数据准备
    var now = moment().add(TokenConfig.TokenSaveDays, 'day');
    var expiresFromNow = now.utc().format('YYYY-MM-DD HH:mm:ss');
    user.Login(function (loginStatus, result) {
        console.log({loginStatus: loginStatus});
        if (loginStatus === 1) {
            //设置Session
            generateRandomToken(function (err, token) {
                //封装token+custom_name
                var clientInfo = {ClientToken: token,
                    CustomName: result.custName,
                    TenantID: result.tenant,
                    UserID: result.id,
                    UserName: user.userName};
                //保存token信息到服务器
                TokenVerification.SaveToken(req, token, expiresFromNow, result,clientInfo, function (err) {
                    //发送结果
                    return res.json({loginStatus: loginStatus, clientInfo: clientInfo});
                });
            });
        }
        else {
            return res.json({loginStatus: loginStatus});
        }
    });
};
//登出
exports.Logout = function (req, res) {
    //var clientInfo = req.cookies.clienttoken;
    var currentToken = req.cookies.clienttoken || false;
    if (currentToken) {
        TokenVerification.DeleteToken(currentToken, function (err, affectRowCount) {
            if (err) {
                console.log('Authentication Logout Error: ' + err.message);
            }
            if (affectRowCount == 1) {
                console.log('Authentication Logout Success(Token Deleted from DB!)');
            }
            try {
                //req.session.AuthenticationToken = null;
                req.signedCookies.AuthenticationToken = null;
                res.clearCookie('AuthenticationToken');
                console.log('Authentication Logout Success(Token Deleted from cookie!)');
            }
            catch (ex) {
                console.log('Authentication Logout Exception: ' + ex);
            }
            //res.redirect('/login.html');
            res.redirect(TokenConfig.DefaultRedirectPage);
        });
    }
    else {
        //res.redirect('/login.html');
        res.redirect(TokenConfig.DefaultRedirectPage);
    }
};
//检查在线状态
exports.IsLogined = function (req, res, next) {
    var url = req.originalUrl.toString();
    var returnUrl = req.signedCookies.ReturnURL || "/index.html#news";
    var isSkip = IsSkip(url);
    var islogin = url.search(TokenConfig.DefaultRedirectPage) > 0;
    if (isSkip) {
        next();
    }
    else {
        TokenVerification.VerifyToken(req, res, function (isVerified) {
            if(!isVerified){
                if(!islogin){
                    //res.redirect('/login.html');
                    res.redirect(TokenConfig.DefaultRedirectPage);
                }
            }
            next();
        });
    }
};
//获取Token
exports.GetClientInfo = function (req, res) {
    var clientInfo = req.signedCookies.AuthenticationToken || req.session.AuthenticationToken;
    res.json({clientInfo: clientInfo});
};
// 获取记住密码信息
//exports.GetRememberCredencial = function (req, res) {
//    var authenticationId = req.signedCookies.AuthenticationToken;
//    var sessionStorageData = session.get(authenticationId, function (err, result) {
//        if (result) {
//            var expires = new Date(result.expires);
//            var now = new Date();
//            if (expires >= now)
//                return res.jsonp(result);
//        }
//      res.end();
//    });
//};
//生成验证图片
exports.GenerateVerificationCode = function (req, res) {
    var ccap = require('ccap')({
        width: 130,
        height: 50,
        offset: 30,
        fontsize: 50,
        quality: 100,
        generate: function () {
            return generateVerificationCode(4);
        }
    });
    var ary = ccap.get();
    var verificationCode = ary[0];
    var buf = ary[1];
    req.session.VerificationCode = verificationCode;
    res.end(buf);
};
//生成验证码
function generateVerificationCode(num) {
    var codeSource = [//'1','2','3','4','5','6','7','8','9',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    var codeText = '';
    for (var i = 0; i < num; i++) {
        var random = Number((Math.random() * 49).toFixed(0));
        codeText += codeSource[random];
    }
    return codeText;
}
/**
 * Internal random token generator
 *
 * @param  {Function} callback
 */
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
function VerificationMatch(clientCode, serverCode, isFuzzy) {
    if (!isFuzzy) {
        return clientCode == serverCode;
    }
    else {
        return clientCode.toLowerCase() == serverCode.toLowerCase()
    }
}

function IsSkip(orgUrl) {
    var returnValue = null;
    var skipArry = TokenConfig.SkipVerification;
    var urlArr=orgUrl.split('/');
    for(var index in urlArr){
        var urlParam=urlArr[index];
        for (var i = 0; i < skipArry.length; i++) {
            if(urlParam.search(skipArry[i])>=0){
                returnValue=true;
                break;
            }
        }
    }

//    for (var i = 0; i < skipArry.length; i++) {
//        if(orgUrl.search(skipArry[i])>0){
//            returnValue=true;
//            break;
//        }
//    }
    return returnValue;
}