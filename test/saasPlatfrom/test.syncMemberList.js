/**
 * Created by wang on 2014/10/31.
 */
var xmlReader = require('xmlreader');
var DbConfigInfo = require('./../../Config');
var ConfigInfo = new DbConfigInfo();
var DbHelper = require('./../../lib/DbHelper');
var pool = new DbHelper(ConfigInfo.BusinessDB);
var async = require('async');
var Chance = require('chance');
var Tenant = require('./../../lib/Model/Tenant');
var TenantUser = require('./../../lib/Model/User');
var crypto = require('crypto');
var adminName=ConfigInfo.defaultLocalAdminInfo.adminName,
    adminPwd=ConfigInfo.defaultLocalAdminInfo.adminPwd;
//业务库所有表
var businessDataTable={
    b_procurements:"b_procurements",
    b_procurements_key:"id",
    b_procurementsTags:"b_procurementstags",
    b_procurements_view:"b_procurements_table",
    b_expositions:"b_expositions",
    b_expositions_key:"id",
    b_expositionsTags:"b_expositionstags",
    b_expositions_view:"b_expositions_table",
    b_tags:"b_tags",
    b_user_mapping:"saas_user_mapping",
    b_sync_saas_user:"sync_saas_user",
    b_sync_saas_ecorderinfo:"sync_saas_ecorderinfo",
    b_sync_saas_openinfo:"sync_saas_openinfo",
    b_sync_saas_orderinfo:"sync_saas_orderinfo",
    b_sync_saas_ecinfo:"sync_saas_ecinfo"
};
var tablesForSaasPlatfrom = {
    saas_user:"sync_saas_user",//企业客户成员信息表
    saas_ecinfo:"sync_saas_ecinfo",
    saas_ecorderinfo:"sync_saas_ecorderinfo",
    saas_openinfo:"sync_saas_openinfo",
    saas_orderinfo:"sync_saas_orderinfo",
    saas_user_mapping:"saas_user_mapping"
};
//多条记录测试
var xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?><Msg><Body><MsgSN>APP00002</MsgSN><MemberList><MemberInfo><ID>1</ID><UserName>test</UserName><EcID>test</EcID><Name>01成员</Name><Phone>15512341001</Phone><Email>fsdaf@fdsf.ge</Email><FaxNum/><Addr>随便了啦</Addr><GroupID>ff8080814955c7cf01495fbe297b015d</GroupID><OPType>01</OPType><OprTime>20141030143100048</OprTime></MemberInfo><MemberInfo><ID>ff8080814955c7cf01495fbe99a70162</ID><UserName>15512341001</UserName><EcID>test</EcID><Name>01成员</Name><Phone>15512341001</Phone><Email>fsdaf@fdsf.ge</Email><FaxNum/><Addr>随便了啦</Addr><GroupID>ff8080814955c7cf01495fbe297b015d</GroupID><OPType>01</OPType><OprTime>20141030143100048</OprTime></MemberInfo></MemberList></Body></Msg>";
////单条记录测试
//var xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?><Msg><Body><MsgSN>APP00002</MsgSN><MemberList><MemberInfo><ID>ff8080814955c7cf01495fbe99a70162</ID><UserName>15512341001</UserName><EcID>ff8080814955c7cf01495fa4a5f80144</EcID><Name>01成员</Name><Phone>15512341001</Phone><Email>fsdaf@fdsf.ge</Email><FaxNum/><Addr>随便了啦</Addr><GroupID>ff8080814955c7cf01495fbe297b015d</GroupID><OPType>01</OPType><OprTime>20141030143100048</OprTime></MemberInfo></MemberList></Body></Msg>";

xmlReader.read(xml, function (err, xmlObj) {
   syncMemberList(xmlObj,function(err,result){
        if(err){
            console.error(err);
        }else{
            console.log(result);
        }
   });
});

//checkTypeByUserName('15512341001',function(err,result){
//    if(err){
//        console.error(err);
//    }else{
//        console.log(result);
//    }
//});

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
                                cb(new Error("本地系统中已存在该租户！"),null);
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
                        cb(new Error('本地系统中已存在该用户！'),null);
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
    //var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_user+" ("+fields.toString()+") SELECT "+params.toString()+" FROM dual WHERE not exists (select * from "+tablesForSaasPlatfrom.saas_user+" where "+tablesForSaasPlatfrom.saas_user+".ID = \'"+memberIdValue+"\')";
    return sql;
}

/**
*
* @summary 判断一个对象是否是array
* */
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

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
 * @summary 根据用户名检测登录用户类型
 * @param {String} userName 登录用户名
 * @param {Function} callback 回调方法
 * */
function checkTypeByUserName(userName,callback){
    var sql = "select u.ID from "+tablesForSaasPlatfrom.saas_user+" u where u.UserName=?";
    var sqlParams = [];
    sqlParams.push(userName);
    var userType=0;//默认为企业客户登录
    pool.ExecuteQuery(sql, sqlParams, function (err,result) {
        if(err){
            callback(err, null);
        }else{
            if(result.length==0){//没有找到相关记录
                callback(null, userType);
            }else{
                userType=1;//企业客户成员；
                callback(null, userType);
            }
        }
    });
}

////xml信息
//var xml = require('fs').readFileSync('data.txt', 'utf8');
//
//// 企业客户订购信息同步
//xmlReader.read(xml, function (err, xmlObj) {
//    syncEcOrderInfo(xmlObj,function(err,result){
//        if(err){
//            console.error(err);
//        }else{
//            console.log(result);
//        }
//    });
//});

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
    async.series([
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

                var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_ecorderinfo+"(OPType,OPNote,EcID) SELECT ?,?,? FROM dual " +
                    "WHERE not exists (select * from "+tablesForSaasPlatfrom.saas_ecorderinfo+" where "+tablesForSaasPlatfrom.saas_ecorderinfo+".EcID = '') ";
                var sqlParams=[];
                sqlParams.push(OPType);
                sqlParams.push(OPNote);
                sqlParams.push(EcID);
                pool.ExecuteQuery(sql, sqlParams,function(err,result){
                    cb(err, result);
                });
            }else{
                cb(new Error('EcOrderInfo data is empty.'),null);
            }
        },
        function(cb){
            saveEcOrderInfoData(EcOrderInfo,EcOrderInfo.EcInfo,tablesForSaasPlatfrom.saas_ecinfo,'EcInfo data is empty.',cb);
        },
        function(cb){
            saveEcOrderInfoData(EcOrderInfo,EcOrderInfo.OrderInfo,tablesForSaasPlatfrom.saas_orderinfo,'OrderInfo data is empty.',cb);
        },
        function(cb){
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
                                    var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_openinfo+"(EcID,"+fields.toString()+") SELECT \'"+EcID+"\',"+params.toString()+" FROM dual " +
                                        "WHERE not exists (select * from "+tablesForSaasPlatfrom.saas_openinfo+" where "+tablesForSaasPlatfrom.saas_openinfo+".EcID = '') ";
                                    pool.ExecuteQuery(sql, fieldValues,function(err,result){
                                        if(err){
                                            cb(err, null);//如果插入遇到错误时，立即调用回调返回
                                        }else{
                                            if (pos == openInfoEntry.length - 1) {
                                                cb(null, result);//全部执行完成时，调用回调返回
                                            }
                                        }
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
                        var sql="INSERT INTO "+tablesForSaasPlatfrom.saas_openinfo+"(EcID,"+fields_single.toString()+") SELECT \'"+EcID+"\',"+params.toString()+" FROM dual " +
                            "WHERE not exists (select * from "+tablesForSaasPlatfrom.saas_openinfo+" where "+tablesForSaasPlatfrom.saas_openinfo+".EcID = '') ";
                        pool.ExecuteQuery(sql, fieldValues_single,function(err,result){
                            callback(err, result);
                        });
                    }
                }
            }else{
                cb(new Error('OpenInfoList data is empty.'),null);
            }
        }
    ],function(err,results){
        callback(err, results);
    });
}

/**
 *
 * @summary 保存数据到数据库
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
        var userName='';//企业客户登录名
        for(var index in OrderInfo){
            var orderInfoEntry=OrderInfo[index];
            if(typeof orderInfoEntry=="object"){
                if(existsPropertyValue("text",orderInfoEntry)){
                    fields.push(index);//字段名称
                    fieldValues.push(orderInfoEntry.text());//字段值
                    if(index=="AdminName"){
                        userName=orderInfoEntry.text();
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
            var sql="INSERT INTO "+tableName+"(EcID,"+fields.toString()+") SELECT \'"+EcID+"\',"+params.toString()+" FROM dual " +
                "WHERE not exists (select * from "+tableName+" where "+tableName+".EcID = '') ";
            pool.ExecuteQuery(sql, fieldValues,function(err,result){
                if(err){
                    callback(err,null);
                }else{
                    autoMappingUserInfo(EcID,userName,'FFE8BD72-EE10-590F-B3D3-2D1ED9F56D9F','beijing',function(err,mappingResult){
                        callback(err, mappingResult);
                    });
                }
            });
        }
    }else{
        callback(new Error(errMessage),null);
    }
}