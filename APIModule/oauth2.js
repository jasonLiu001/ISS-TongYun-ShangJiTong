/**
 * Created by Wanji on 2014/7/28.
 */
var oauthserver = require('oauth2-server');
var oauth = oauthserver({
    model:require('./oauth2_server_mysql_model'),
    grants: ['password'],
    debug: true,
    continueAfterResponse:true,
    accessTokenLifetime:(60*60*24)*7//one week
});

//设置错误Handler
exports.errorHandler=oauth.errorHandler();

//授权、生成Token、保存Token
exports.grant=oauth.grant();

//权限验证
exports.authorise=oauth.authorise();

//验证成功返回消息
exports.AfterAuthorise=function (req, res) {
    res.send('Secret area');
};