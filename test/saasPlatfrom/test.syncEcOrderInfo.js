/**
 * Created by wang on 2014/11/3.
 */
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
var tablesForSaasPlatfrom = {
    saas_user:"sync_saas_user",//企业客户成员信息表
    saas_ecinfo:"sync_saas_ecinfo",
    saas_ecorderinfo:"sync_saas_ecorderinfo",
    saas_openinfo:"sync_saas_openinfo",
    saas_orderinfo:"sync_saas_orderinfo",
    saas_user_mapping:"saas_user_mapping"
};
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

//xml信息
var xml = require('fs').readFileSync('data.txt', 'utf8');

//// 企业客户订购信息同步
xmlReader.read(xml, function (err, xmlObj) {
    syncEcOrderInfo(xmlObj,function(err,result){
        if(err){
            console.error(err);
        }else{
            console.log(result);
        }
    });
});



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
                }
            }else{
                cb(new Error('OpenInfoList data is empty.'),null);
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
    var sql = "select u.ID from "+businessDataTable.b_sync_saas_user+" u where u.UserName=?";
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


/**
 *
 *@summary 根据用户名检查产品的订购信息
 * @param {String} userName 用户登录名
 * @param {Function} callback 回调函数
 * */
function checkUserOrderInfo(userName,callback){
    var sql;
    var sqlParams = [];
    sqlParams.push(userName);
    checkTypeByUserName(userName, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            if (result == 1) {
                //企业客户成员
                sql = "select e.OPType from " + businessDataTable.b_sync_saas_user + " u left join  " + businessDataTable.b_sync_saas_ecorderinfo + " e on  u.EcId=e.EcID where u.UserName=?";
            } else {
                //企业客户
                sql = "select e.OPType from " + businessDataTable.b_user_mapping + " m left join " + businessDataTable.b_sync_saas_ecorderinfo + " e on m.saas_userid=e.EcID where m.saas_username=?";
            }
            executeUserOrderInfoQuery(sql, sqlParams,function(err,opType){
                callback(err, opType);
            });
        }
    });
}

/**
*
 * @summary 从数据库中查询
 * @param {String} sql  查询sql
 * @param {Array} sqlParams 查询参数
 * @param {Function} callback  回调函数
* */
function executeUserOrderInfoQuery(sql,sqlParams,callback){
    pool.ExecuteQuery(sql, sqlParams,function(err,opType){
        if(err){
            callback(err, null);
        }else{
            if(opType.length==0){//没有记录
                callback(null, null);//回调函数中直接返回null值
            }else{
                callback(null, opType[0].OPType);
            }
        }
    });
}

//autoMappingUserInfo('saasPlatfrom','saasPlatfrom','local','local',function(err,result){
//    if(err){
//        console.error(err);
//    }else{
//        console.log(result);
//    }
//});

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
