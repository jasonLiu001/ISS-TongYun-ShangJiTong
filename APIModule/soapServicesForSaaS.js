/**
 * Created by wang on 2014/9/28.
 */
var DbConfigInfo = require('../Config');
var ConfigInfo = new DbConfigInfo();
var xmlReader = require('xmlreader'),
    crypterModule = require('../lib/Crypto.js'),
    secretKey =ConfigInfo.androidAppSettings.secretKey,
    appId =ConfigInfo.androidAppSettings.appId;
var async = require('async');
var DbHelper = require('../lib/DbHelper');
var pool = new DbHelper(ConfigInfo.BusinessDB);
var Tenant = require('../lib/Model/Tenant');
var TenantUser = require('../lib/Model/User');
var crypto = require('crypto');
var adminName=ConfigInfo.defaultLocalAdminInfo.adminName,
    adminPwd=ConfigInfo.defaultLocalAdminInfo.adminPwd;

/**
*
 * todo:存储通云平台同步数据业务表 需要在此添加
* */
var tablesForSaasPlatfrom = {
    saas_user:"sync_saas_user",//企业客户成员信息表
    saas_ecinfo:"sync_saas_ecinfo",
    saas_ecorderinfo:"sync_saas_ecorderinfo",
    saas_openinfo:"sync_saas_openinfo",
    saas_orderinfo:"sync_saas_orderinfo",
    saas_user_mapping:"saas_user_mapping"
};

/**
 *
 * @summary: 每个公开的服务对应一个Webservice服务，服务中的方法则对应着webservice中的方法 *
 * */
exports.webServicesForSaaS = {
    App2SaaSServiceService: {
        App2SaaSService: {
            execute: function (args, callback) {
                var msgBuilder = new messageBuilder();
                var resErrorHeader = msgBuilder.GetResponseHeader('');
                var reqXML;
                var resMsg;
                var resBody;

                if (args) {
                    for(var index in args){
                        reqXML=args[index];
                    }
                    if (reqXML) {
                        xmlReader.read(reqXML, function (err, xmlDoc) {
                            if (err) {
                                console.error(err);
                                resBody = "<ResultCode>0102</ResultCode><ResultDesc>" + err.message + "</ResultDesc>";
                                resMsg = msgBuilder.GetResponseMessage(resErrorHeader, resBody);
                            } else {
                                var body = xmlDoc.Msg.Body.text();
                                var code = xmlDoc.Msg.Head.Code.text();
                                switch (code) {
                                    case 'APP00001'://企业客户业务受理接口
                                        resMsg = dataSynchronization(code, body, msgBuilder,callback);
                                        break;
                                    case 'APP00002'://企业客户成员信息同步接口
                                        resMsg = dataSynchronization(code, body, msgBuilder,callback);
                                        break;
                                    case 'APP00004'://企业群组信息同步
                                        resMsg = dataSynchronization(code, body, msgBuilder,callback);
                                        break;
                                }
                            }
                        });
                    } else {
                        resBody = "<ResultCode>0102</ResultCode><ResultDesc>An illegal XML message.The param requestXML do not exist.</ResultDesc>";
                        resMsg = msgBuilder.GetResponseMessage(resErrorHeader, resBody);
                        callback({executeReturn: resMsg});
                    }
                } else {
                    resBody = "<ResultCode>0102</ResultCode><ResultDesc>An illegal XML message.</ResultDesc>";
                    resMsg = msgBuilder.GetResponseMessage(resErrorHeader, resBody);
                    callback({executeReturn: resMsg});
                }
            }
        }
    }
};

/**
 *
 * @summary 同步通云平台数据
 * @param code {string} 类型编码   参见：通云平台接口说明文档
 * @param body {string} 通云平台请求消息   参见：通云平台接口说明文档
 * @param msgBuilder {Object} 请求及响应消息构造器
 * @param callback {Function} 回调方法
 * @return {string} 返回同步结果字符串
 * */
function dataSynchronization(code, body, msgBuilder,callback) {
    var msg;
    var resBody;//响应消息体
    var resHeader = msgBuilder.GetResponseHeader(code);
    //移除字符串中所有的换行符
    body = body.replace(/\n/g, '');
    var decryptBodyString = crypterModule.decryptSSOPlain(body, secretKey);
    console.log('解密后的body体的请求消息：'+decryptBodyString);
    var xmlString = msgBuilder.GetXmlMessage(decryptBodyString);

    async.waterfall([
        function (callback) {
            xmlReader.read(xmlString, function (err, xmlObj) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, xmlObj);
                }
            });
        },
        function (arg1, callback) {
            if (arg1) {
                //存储信息到实际数据库
                saveSyncData(code,arg1,function(err,res){
                    if(err){
                        callback(err, null);
                    }else{
                        resBody = msgBuilder.GetSuccessResponseBody(code, 'success');
                        msg = msgBuilder.GetResponseMessage(resHeader, resBody);
                        callback(null, res);
                    }
                });
            } else {
                callback(new Error('The data of the response message is empty.'), null);
            }
        }
    ], function (err, result) {
        if (err) {
            console.error(err);
            resHeader = msgBuilder.GetResponseHeader(code);
            resBody = msgBuilder.GetErrorResponseBody(code, err.message);
            msg = msgBuilder.GetResponseMessage(resHeader, resBody);
        }
        callback({executeReturn: msg});
    });
}

/**
*
 * @summary 保存通云平台的同步数据信息到mysql数据库
 * @param {String} code 业务类型编码 参见：通云平台接口说明文档
 *@param {Object} xmlObj 解析的xml对象
 *@param {Function} callback 回调方法
* */
function saveSyncData(code, xmlObj, callback) {
    switch (code) {
        case 'APP00001'://企业客户业务受理
            syncEcOrderInfo(xmlObj,callback);
            break;
        case 'APP00002'://企业客户成员信息同步
            syncMemberList(xmlObj,callback);
            break;
        case 'APP00004'://企业群组信息同步
            syncEcGroupList(xmlObj,callback);
            break;
    }
}

/**
 *
 * @summary 企业客户业务受理信息同步
 * @param {Object} xmlObj 解析的xml对象
 * @param {Function} callback 回调方法
 * */
function syncEcOrderInfo(xmlObj,callback){
    var EcID='';//企业客户ID
    var EcOrderInfo=xmlObj.Msg.Body.EcOrderInfo;
    if(existsPropertyValue("text",EcOrderInfo.EcID)){
        EcID=EcOrderInfo.EcID.text();
    }
    async.waterfall([
        function(cb){
            if(EcOrderInfo){
                var OPType='';
                var OPNote='';
                if(existsPropertyValue("text",EcOrderInfo.OPType)){
                    OPType=EcOrderInfo.OPType.text();
                }
                if(existsPropertyValue("text",EcOrderInfo.OPNote)){
                    OPNote=EcOrderInfo.OPNote.text();
                }
                var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_ecorderinfo+"(OPType,OPNote,EcID) values(?,?,?)";
                var sqlParams=[];
                sqlParams.push(OPType);
                sqlParams.push(OPNote);
                sqlParams.push(EcID);

                async.waterfall([
                    function(innerCallBack){
                        deleteDataRowByKey("EcID",EcID,tablesForSaasPlatfrom.saas_ecorderinfo,function(err,res){
                            innerCallBack(err,res);
                        });
                    },
                    function(arg1,innerCallBack){
                        pool.ExecuteQuery(sql, sqlParams,function(err,res){
                            innerCallBack(err, res);
                        });
                    }
                ],function(err,res){
                    cb(err,res);
                });
            }else{
                cb(new Error('EcOrderInfo data is empty.'),null);
            }
        },
        function(arg1,cb){
            saveEcOrderInfoData(EcOrderInfo,EcOrderInfo.EcInfo,tablesForSaasPlatfrom.saas_ecinfo,'EcInfo data is empty.',cb);
        },
        function(arg1,cb){
            saveEcOrderInfoData(EcOrderInfo,EcOrderInfo.OrderInfo,tablesForSaasPlatfrom.saas_orderinfo,'OrderInfo data is empty.',cb);
        },
        function(arg1,cb){
            var OpenInfoList=xmlObj.Msg.Body.EcOrderInfo.OpenInfoList;
            if(OpenInfoList){
                var OpenInfo=OpenInfoList.OpenInfo;
                if(OpenInfo){
                    var fields_single = [];//属性字段集合
                    var fieldValues_single = [];//属性值集合
                    for(var index in OpenInfo){
                        var openInfoEntry=OpenInfo[index];
                        //一次同步多个开通信息
                        if(isArray(openInfoEntry)){
                            openInfoEntry.forEach(function(openInfo,pos){
                                var fields = [];//属性字段集合
                                var fieldValues = [];//属性值集合
                                for(var fieldName in openInfo){
                                    var singleEntry=openInfo[fieldName];
                                    if(typeof singleEntry=="object"){
                                        if(existsPropertyValue("text",singleEntry)){
                                            fields.push(fieldName);//字段名称
                                            fieldValues.push(singleEntry.text());//字段值
                                        }
                                    }
                                }

                                if(fieldValues.length>0){
                                    var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_openinfo+"(EcID,"+fields.toString()+") values(\'"+EcID+"\',"+params.toString()+")";

                                    async.waterfall([
                                        function(innerCallBack){
                                            deleteDataRowByKey("EcID",EcID,tablesForSaasPlatfrom.saas_openinfo,function(err,res){
                                                innerCallBack(err, res);
                                            });
                                        },
                                        function(arg1,innerCallBack){
                                            pool.ExecuteQuery(sql, fieldValues,function(err,result){
                                                if(err){
                                                    innerCallBack(err, null);//如果插入遇到错误时，立即调用回调返回
                                                }else{
                                                    if (pos == openInfoEntry.length - 1) {
                                                        innerCallBack(null, result);//全部执行完成时，调用回调返回
                                                    }
                                                }
                                            });
                                        }
                                    ],function(err,res){
                                        cb(err, res);
                                    });
                                }
                            });
                        }else{//一次只同步一个开通信息
                            if(typeof openInfoEntry=="object"){
                                if(existsPropertyValue("text",openInfoEntry)){
                                    fields_single.push(index);//字段名称
                                    fieldValues_single.push(openInfoEntry.text());//字段值
                                }
                            }
                        }
                    }
                    if(fieldValues_single.length>0){
                        var params = [];
                        for (var i in fieldValues_single) {
                            params.push("?");
                        }
                        var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_openinfo+"(EcID,"+fields_single.toString()+") values(\'"+EcID+"\',"+params.toString()+")";

                        async.waterfall([
                            function(innerCallback){
                                deleteDataRowByKey("EcID",EcID,tablesForSaasPlatfrom.saas_openinfo,function(err,res){
                                    innerCallback(err, res);
                                });
                            },
                            function(arg1,innerCallback){
                                pool.ExecuteQuery(sql, fieldValues_single,function(err,result){
                                    innerCallback(err, result);
                                });
                            }
                        ],function(err,res){
                            cb(err, res);
                        });
                    }
                }else{
                    cb(null, null);//openinfo在退订或者其他操作时，可能为空
                }
            }else{
                cb(null,null);//OpenInfoList在同步时，存在为空的情况
            }
        },
        function(arg1,cb){
            var saasUser=getSaasAdminUserEntity(EcID,EcOrderInfo);
            //创建通云用户对应的本地用户
            createLocalUserBySaasUser('0',saasUser,function(err,res){
                cb(err, res);
            });
        },
        function(arg1,cb){
            var EcInfo=EcOrderInfo.EcInfo;
            //企业客户登录名
            var saasUserName='';
            if(existsPropertyValue("text",EcInfo.AdminAccount)){
                saasUserName=EcInfo.AdminAccount.text();
            }
            autoMappingUserInfo(EcID,saasUserName,arg1.id,arg1.username,arg1.tenant,function(err,res){
                cb(err, res);
            });
        }
    ],function(err,result){
        callback(err, result);
    });
}

/**
*
 * @summary 返回通云平台管理员用户实体
 * @param {String} EcID 企业客户ID
 * @param {Object} EcOrderInfo 企业客户对象
* */
function getSaasAdminUserEntity(EcID,EcOrderInfo){
    var EcInfo=EcOrderInfo.EcInfo;
    var saasUser=new Object();
    saasUser.EcID=EcID;
    saasUser.EcName='';
    saasUser.AdminAccount='';
    saasUser.AdminName='';
    saasUser.LinkmanEmail='';
    saasUser.AdminPhone='';
    if(existsPropertyValue("text",EcInfo.EcName)){
        saasUser.EcName=EcInfo.EcName.text();
    }
    if(existsPropertyValue("text",EcInfo.AdminAccount)){
        saasUser.AdminAccount=EcInfo.AdminAccount.text();
    }
    if(existsPropertyValue("text",EcInfo.AdminName)){
        saasUser.AdminName=EcInfo.AdminName.text();
    }
    if(existsPropertyValue("text",EcInfo.LinkmanEmail)){
        saasUser.LinkmanEmail=EcInfo.LinkmanEmail.text();
    }
    if(existsPropertyValue("text",EcInfo.AdminPhone)){
        saasUser.AdminPhone=EcInfo.AdminPhone.text();
    }
    return saasUser;
}

/**
*
 * @summary 企业客户成员信息同步
 * @param {Object} xmlObj 解析的xml对象
 * @param {Function} callback 回调方法
* */
function syncMemberList(xmlObj, callback) {
    var MemberList = xmlObj.Msg.Body.MemberList;
    if (MemberList) {
        var MemberInfo = MemberList.MemberInfo;
        if (MemberInfo) {
            var fields_single = [];//属性字段集合
            var fieldValues_single = [];//属性值集合
            for (var index in MemberInfo) {
                var MemberField = MemberInfo[index];
                //一次同步多个企业客户成员
                if (isArray(MemberField)) {
                    MemberField.forEach(function (member, pos) {
                        var fields = [];//属性字段集合
                        var fieldValues = [];//属性值集合
                        for (var fieldName in member) {
                            var filedObj = member[fieldName];
                            if (typeof filedObj == "object") {
                                if (existsPropertyValue("text", filedObj)) {
                                    fields.push(fieldName);//字段名称
                                    fieldValues.push(filedObj.text());//字段值
                                }
                            }
                        }

                        if (fieldValues.length > 0) {
                            var saasUser=getSaasUserEntity(member);
                            var sql=getMembersInsertSql(saasUser.ID,fields,fieldValues);

                            async.waterfall([
                                function(cb){
                                    deleteDataRowByKey("ID",saasUser.ID,tablesForSaasPlatfrom.saas_user,function(err,res){
                                        cb(err, res);
                                    });
                                },
                                function(arg1,cb){
                                    pool.ExecuteQuery(sql, fieldValues, function (err, res) {
                                        cb(err, res);
                                    });
                                },
                                function(arg1,cb){
                                    createLocalUserBySaasUser('1',saasUser,function(err,res){
                                        cb(err, res);
                                    });
                                },
                                function(arg1,cb){
                                    autoMappingUserInfo(saasUser.ID, saasUser.UserName,arg1.id,arg1.username,arg1.tenant,function(err,res){
                                        if(err){
                                            cb(err, null);//如果插入遇到错误时，立即调用回调返回
                                        }else{
                                            if (pos == MemberField.length - 1) {
                                                cb(null, res);//全部执行完成时，调用回调返回
                                            }
                                        }
                                    });
                                }
                            ],function(err,result){
                                callback(err,result);
                            });
                        }

                    });
                } else {//一次只同步一个企业客户成员
                    if (typeof MemberField == "object") {
                        if (existsPropertyValue("text", MemberField)) {
                            fields_single.push(index);//字段名称
                            fieldValues_single.push(MemberField.text());//字段值
                        }
                    }
                }

            }
            if (fieldValues_single.length > 0) {
                var saasUser=getSaasUserEntity(MemberInfo);
                var sql=getMembersInsertSql(saasUser.ID,fields_single,fieldValues_single);
                async.waterfall([
                    function(cb){
                        deleteDataRowByKey("ID",saasUser.ID,tablesForSaasPlatfrom.saas_user,function(err,res){
                            cb(err, res);
                        });
                    },
                    function(arg1,cb){
                        pool.ExecuteQuery(sql, fieldValues_single, function (err, result) {
                            cb(err, result);
                        });
                    },
                    function(arg1,cb){
                        createLocalUserBySaasUser('1',saasUser,function(err,res){
                            cb(err, res);
                        });
                    },
                    function(arg1,cb){
                        autoMappingUserInfo(saasUser.ID, saasUser.UserName,arg1.id,arg1.username,arg1.tenant,function(err,res){
                            cb(err,res);
                        });
                    }
                ],function(err,result){
                    callback(err, result);
                });
            }
        }
    } else {
        callback(new Error("MemberList data is empty."), null);
    }
}

/**
*
 * @summary 根据主键删除对应的行记录
 * @param {String} primaryKey 记录主键
 * @param {String} primaryKeyValue 主键值
 * @param {String} tableName 对应表名
 * @param {Function} callback 回调函数
* */
function deleteDataRowByKey(primaryKey,primaryKeyValue,tableName,callback){
    var sql="delete from "+tableName+" where "+primaryKey+"=?";
    var sqlParams=[];
    sqlParams.push(primaryKeyValue);
    pool.ExecuteQuery(sql, sqlParams,function(err,res){
        callback(err, res);
    });
}

/**
*
 * @summary 返回通云平台企业客户成员实体
 * @param {Object} member 企业客户成员对象
* */
function getSaasUserEntity(member){
    var saasUser=new Object();//企业客户成员实体对象
    saasUser.ID='';//企业客户成员ID值
    saasUser.EcID="";
    saasUser.Name="";
    saasUser.UserName='';
    saasUser.Email='';
    saasUser.Phone='';

    if(existsPropertyValue("text",member.ID)){
        saasUser.ID=member.ID.text();
    }
    if(existsPropertyValue("text",member.EcID)){
        saasUser.EcID=member.EcID.text();
    }
    if(existsPropertyValue("text",member.Name)){
        saasUser.Name=member.Name.text();
    }
    if(existsPropertyValue("text",member.UserName)){
        saasUser.UserName=member.UserName.text();
    }
    if(existsPropertyValue("text",member.Email)){
        saasUser.Email=member.Email.text();
    }
    if(existsPropertyValue("text",member.Phone)){
        saasUser.Phone=member.Phone.text();
    }
    return saasUser;
}

/**
*
 * @summary 根据通云平台用户创建本地系统用户
 * @param {String} userType 通云平台登录用户类型： 0：企业客户 1：企业客户成员
 * @param {Object} saasUser 通云平台中的企业客户或者企业客户完整信息
 * @param {Function} callback 回调函数
* */
function createLocalUserBySaasUser(userType,saasUser,callback){
    switch (userType){
        case "0"://企业客户
            var tenant = new Tenant();
            tenant.name = saasUser.EcName;
            tenant.alias = saasUser.AdminAccount;
            tenant.mappedDomain = saasUser.AdminName;
            tenant.customerNames = saasUser.EcName;

            //tenant user instance.
            var tenantUser = new TenantUser();
            //set tenant id to the tenantUser.
            tenantUser.id = saasUser.EcID;
            tenantUser.username=adminName;//默认管理员账户
            tenantUser.firstname = adminName;
            tenantUser.lastname = adminName;
            tenantUser.email = saasUser.LinkmanEmail;
            tenantUser.phone = saasUser.AdminPhone;

            var sqlAddTenant = "insert into tenants_tenants(name,alias,mappeddomain,customer_names,version,language,trusteddomains,trusteddomainsenabled,creationdatetime) " +
                "values(?,?,?,?,?,?,?,?,now());";
            var sqlAddTenantParams = [tenant.name, tenant.alias, tenant.mappedDomain, tenant.customerNames, tenant.version, tenant.language, tenant.trustedDomains, tenant.trustedDomainsEnabled];
            async.waterfall([
                function(cb){
                    pool.ExecuteQuery(sqlAddTenant,sqlAddTenantParams,function(err,res){
                        if(err){
                            if(err.code=='ER_DUP_ENTRY'){//主键重复错误
                                cb(new Error("本地系统中已存在该租户！用户映射操作完成！"),null);
                            }else{
                                cb(err,null);
                            }
                        }else{
                            tenantUser.tenant = res.insertId;//save the tenant id
                            cb(null, res.insertId);
                        }
                    });
                },
                function(tenantId,cb){
                    addUser(tenantId,tenantUser,function(err,res){
                        cb(err, res);
                    });
                }
            ],function(err,result){
                callback(err, result);
            });
            break;
        case "1"://企业客户成员
            //tenant user instance.
            var tenantUser = new TenantUser();
            //set tenant id to the tenantUser.
            tenantUser.id = saasUser.ID;
            tenantUser.username=saasUser.UserName;
            tenantUser.firstname = saasUser.Name;
            tenantUser.lastname = saasUser.Name;
            tenantUser.email = saasUser.Email;
            tenantUser.phone = saasUser.Phone;

            async.waterfall([
                function(cb){
                    //根据EcID去mapping表中查找对应租户信息
                    var EcId=saasUser.EcID;//所属企业客户ID
                    var sql="select m.local_tenantid from "+tablesForSaasPlatfrom.saas_user_mapping+" m where m.saas_userid=?";
                    var sqlParams=[];
                    sqlParams.push(EcId);
                    pool.ExecuteQuery(sql, sqlParams,function(err,res){
                        if(err){
                            cb(err, null);
                        }else{
                            if(res.length>0){
                                tenantUser.tenant=res[0].local_tenantid;
                                cb(null, res[0].local_tenantid);
                            }else{
                                cb(new Error('该企业客户成员所属的企业客户信息不存在！'),null);
                            }
                        }
                    });
                },
                function(tenantId,cb){
                    addUser(tenantId,tenantUser,function(err,res){
                        cb(err,res);
                    });
                }
            ],function(err,result){
                callback(err, result);
            });
            break;
    }
}

/**
*
 * @summay 添加用户
 * @param {String} tenantId 租户ID
 * @param {Object} tenantUser  用户实体
 * @param {Function} callback 回调函数
* */
function addUser(tenantId,tenantUser,callback){
    tenantUser.tenant=tenantId;
    async.waterfall([
        function(cb){
            var sqlAddAdminForCurTenant = "insert into core_user(id,tenant,username,firstname,lastname,sex,bithdate,status,activation_status,email,workfromdate,terminateddate,phone,removed,create_on,last_modified) " +
                "values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,now(),now())";
            var sqlAddAdminForCurTenantParams = [tenantUser.id, tenantId, tenantUser.username, tenantUser.firstname, tenantUser.lastname, tenantUser.sex, tenantUser.bithdate, tenantUser.status, tenantUser.activation_status, tenantUser.email, tenantUser.workFromDate, tenantUser.terminatedDate, tenantUser.phone, tenantUser.removed];
            pool.ExecuteQuery(sqlAddAdminForCurTenant,sqlAddAdminForCurTenantParams,function(err,res){
                if(err){
                    if(err.code=='ER_DUP_ENTRY'){//主键重复错误
                        cb(new Error('本地系统中已存在该用户！用户映射操作完成！'),null);
                    }else{
                        cb(err, null);
                    }
                }else{
                    cb(err, res);
                }
            });
        },
        function(arg1,cb){
            var sha512 = crypto.createHash('sha512');
            var passWord = sha512.update(adminPwd).digest('hex');
            var sqlAdminPwdSecurity = "insert into core_usersecurity(tenant,userid,pwdhashsha512) values(?,?,?);";
            var sqlAdminPwdSecurityParams = [tenantId, tenantUser.id, passWord];
            pool.ExecuteQuery(sqlAdminPwdSecurity,sqlAdminPwdSecurityParams,function(err,res){
                cb(err, res);
            });
        }
    ],function(err,result){
        callback(err, tenantUser);
    });

}

/**
 *
 * @summary 自动映射通云用户到本地数据库表：saas_user_mapping
 * @param {String} saasUserId 通云平台中的企业客户或者企业客户成员ID
 * @param {String} saasUsername 通云平台中的企业客户或者企业客户成员登录名
 * @param {String} localUserId 本地系统租户或租户下用户ID
 * @param {String} localUserName  本地系统租户或者租户下用户的登录名
 * @param {String} localTenantID  本地租户ID
 * @param {Function} callback  回调函数
 * */
function autoMappingUserInfo(saasUserId,saasUsername,localUserId,localUserName,localTenantID,callback){
    var sqlParams=[];
    sqlParams.push(saasUserId);
    sqlParams.push(saasUsername);
    sqlParams.push(localUserId);
    sqlParams.push(localUserName);
    sqlParams.push(localTenantID);
    //插入时检查重复值依据
    sqlParams.push(saasUserId);
    var mappingSql="INSERT INTO "+tablesForSaasPlatfrom.saas_user_mapping+"(saas_userid,saas_username,local_userid,local_username,local_tenantid) values(?,?,?,?,?)";
    async.waterfall([
        function(innerCallBack){
            deleteDataRowByKey("saas_userid",saasUserId,tablesForSaasPlatfrom.saas_user_mapping,function(err,res){
                innerCallBack(err, res);
            });
        },
        function(arg1,innerCallBack){
            pool.ExecuteQuery(mappingSql,sqlParams,function(err,result){
                innerCallBack(err, result);
            });
        }
    ],function(err,res){
        callback(err, res);
    });
}

/**
 *
 * @summary 保存客户信息数据到数据库
 * @param  {Object} EcOrderInfo xml对象
 * @param {Object} OrderInfo xml对象
 * @param {String} tableName 对应物理表名称
 * @param {String} errMessage 错误提示消息
 * @param {Function} callback 回调函数
 * */
function saveEcOrderInfoData(EcOrderInfo,OrderInfo,tableName,errMessage,callback){
    if(OrderInfo){
        var fields=[];
        var fieldValues=[];
        var OrderID='';//企业客户订单ID
        var AdminName='';//企业客户登录名
        for(var index in OrderInfo){
            var orderInfoEntry=OrderInfo[index];
            if(typeof orderInfoEntry=="object"){
                if(existsPropertyValue("text",orderInfoEntry)){
                    fields.push(index);//字段名称
                    fieldValues.push(orderInfoEntry.text());//字段值
                    if(index=="OrderID"){
                        OrderID=orderInfoEntry.text();
                    }
                    if(index=="AdminName"){
                        AdminName=orderInfoEntry.text();
                    }
                }
            }
        }
        if(fieldValues.length>0){
            var EcID='';
            if(existsPropertyValue("text",EcOrderInfo.EcID)){
                EcID=EcOrderInfo.EcID.text();
            }
            var params = [];
            for (var i in fieldValues) {
                params.push("?");
            }
            var sql="INSERT INTO "+tableName+"(EcID,"+fields.toString()+") values(\'"+EcID+"\',"+params.toString()+")";

            if(AdminName!=''){
                async.waterfall([
                    function(innerCallback){
                        deleteDataRowByKey("EcID",EcID,tablesForSaasPlatfrom.saas_ecinfo,function(err,res){
                            innerCallback(err, res);
                        });
                    },
                    function(arg1,innerCallback){
                        pool.ExecuteQuery(sql, fieldValues,function(err,result){
                            innerCallback(err, result);
                        });
                    }
                ],function(err,res){
                    callback(err,res);
                });
            }

            if(OrderID!=''){
                async.waterfall([
                    function(innerCallback){
                        deleteDataRowByKey("OrderID",OrderID,tablesForSaasPlatfrom.saas_orderinfo,function(err,res){
                            innerCallback(err, res);
                        });
                    },
                    function(arg1,innerCallback){
                        pool.ExecuteQuery(sql, fieldValues,function(err,result){
                            innerCallback(err, result);
                        });
                    }
                ],function(err,res){
                    callback(err, res);
                });
            }
        }
    }else{
        callback(new Error(errMessage),null);
    }
}

/**
 *
 * @summary 生成插入sql语句
 * @param {String} memberIdValue  企业成员ID，用于检测是否存在重复值
 * @param {Array} fields 数据库字段数组
 * @param {Array} fieldValues 数据库字段值数组
 * */
function getMembersInsertSql(memberIdValue,fields,fieldValues){
    var params = [];
    for (var i in fieldValues) {
        params.push("?");
    }
    var sql="insert into "+tablesForSaasPlatfrom.saas_user+"("+fields.toString()+") values("+params.toString()+")";
    return sql;
}

/**
 *
 * @summary 企业群组信息同步
 * @param {Object} xmlObj 解析的xml对象
 * @param {Function} callback 回调方法
 * */
function syncEcGroupList(xmlObj,callback){
   var EcGroupList=xmlObj.Msg.Body.EcGroupList;
   if(EcGroupList){
       //目前不需要处理群组信息
       callback(null,EcGroupList);
   }else{
       callback(new Error('EcGroupList data is empty.'),null);
   }
}

/**
 *
 * @summary: 响应体构造类
 * */
function messageBuilder() {
}

/**
 *
* @summary 数据同步成功时，发送给通云平台的body内容
 *@param code {string} 类型编码 参见：通云平台接口说明文档
 *@param message {string} 自定义的消息内容
 *@return {string} 数据同步成功时后，返回通云平台的body内容字符串
* */
messageBuilder.prototype.GetSuccessResponseBody = function (code, message) {
    var resBody;
    switch (code) {
        case 'APP00001'://企业客户业务受理接口
            resBody = "<MsgSN></MsgSN><SyncFlag>00</SyncFlag><ResultCode>0000</ResultCode><ResultDesc>" + message + "</ResultDesc><AppUrl></AppUrl><AppPath></AppPath>";
            break;
        case 'APP00002'://企业客户成员信息同步接口
            resBody = "<ResultCode>0000</ResultCode><ResultDesc>" + message + "</ResultDesc>";
            break;
        case 'APP00004'://企业群组信息同步
            resBody = "<ResultCode>0000</ResultCode><ResultDesc>" + message + "</ResultDesc>";
            break;
    }

    return resBody;
};

/**
 *
 *@summary 数据同步错误时，发送给通云平台的body内容
 *@param code {string} 类型编码 参见：通云平台接口说明文档
 *@param errorMessage {string} 自定义的错误消息内容
 *@return {string} 数据同步错误后，返回通云平台的body内容字符串
 * */
messageBuilder.prototype.GetErrorResponseBody = function (code, errorMessage) {
    var resBody;
    switch (code) {
        case 'APP00001'://企业客户业务受理接口
            resBody = "<MsgSN></MsgSN><SyncFlag>00</SyncFlag><ResultCode>0102</ResultCode><ResultDesc>" + errorMessage + "</ResultDesc><AppUrl></AppUrl><AppPath></AppPath>";
            break;
        case 'APP00002'://企业客户成员信息同步接口
            resBody = "<ResultCode>0102</ResultCode><ResultDesc>" + errorMessage + "</ResultDesc>";
            break;
        case 'APP00004'://企业群组信息同步
            resBody = "<ResultCode>0102</ResultCode><ResultDesc>" + errorMessage + "</ResultDesc>";
            break;
    }

    return resBody;
};

/**
 *
 *@summary 发送给通云平台的响应消息头  参见：通云平台接口说明文档
 *@param code {string} 类型编码 参见：通云平台接口说明文档
 *@return {string} 返回通云平台的响应消息头字符串
 * */
messageBuilder.prototype.GetResponseHeader = function (code) {
    var resHeader = "<Code>" + code + "</Code><CTID></CTID><STID></STID><AppID>" + appId + "</AppID><RequestTime></RequestTime><ResponseTime></ResponseTime><Version></Version><Priority></Priority><Status></Status>";
    return resHeader;
};

/**
 *
 *@summary 发送给通云平台的整个xml消息
 *@param resHeader {string} 通云平台的响应消息头
 *@param resBody {string} 通云平台的响应消息体
 *@return {string} 返回通云平台的整个xml消息字符串
 * */
messageBuilder.prototype.GetResponseMessage = function (resHeader, resBody) {
    var body = crypterModule.encryptSSOPlain(resBody, secretKey);
    var msg = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Msg><Head>" + resHeader + "</Head><Body>" + body + "</Body></Msg>";
    return msg;
};

/**
 *
 *@summary 组装xml格式的字符串
 *@param msg {string} 需要组装的xml格式的字符串
 *@return {string} 返回组装xml格式的字符串
 * */
messageBuilder.prototype.GetXmlMessage = function (msg) {
    var msg = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Msg><Body>" + msg + "</Body></Msg>";
    return msg;
};

/**
 *
 * @summary 检查对象中是否存在该属性
 * @param {string} propertyString  属性值名称
 * @param {Object} obj 需要检查的对象
 * */
function existsPropertyValue(propertyString,obj){
    if(obj){
        if(propertyString in obj){
            return true;
        }
    }

    return false;
}

/**
 *
 * @summary 判断一个对象是否是array
 * */
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}