/**
 * Created by wang on 2014/11/6.
 */
var DbConfigInfo = require('../../Config');
var ConfigInfo = new DbConfigInfo();
var xmlReader = require('xmlreader'),
    crypterModule = require('../../lib/Crypto.js'),
    secretKey =ConfigInfo.androidAppSettings.secretKey,
    appId =ConfigInfo.androidAppSettings.appId;
var async = require('async');
var DbHelper = require('../../lib/DbHelper');
var pool = new DbHelper(ConfigInfo.BusinessDB);
var Chance = require('chance');
var Tenant = require('../../lib/Model/Tenant');
var TenantUser = require('../../lib/Model/User');
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

////创建企业客户对应用户
//var saasUser=new Object();
//saasUser.EcName='test3';
//saasUser.AdminAccount='test3';
//saasUser.AdminName='test3';
//saasUser.LinkmanEmail="test3";
//saasUser.AdminPhone="test3";
//createLocalUserBySaasUser('0',saasUser,function(err,res){
//    if(err){
//        console.error(err);
//    }else{
//        console.log("add success!");
//    }
//});

//创建企业成员对应账户
var saasUser=new Object();
saasUser.EcID="test";
saasUser.Name="test";
saasUser.UserName='test';
saasUser.Email="test";
saasUser.Phone="test";
createLocalUserBySaasUser('1',saasUser,function(err,res){
    if(err){
        console.error(err);
    }else{
        console.log("add success!");
    }
});

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

            var chance = new Chance();
            //tenant user instance.
            var tenantUser = new TenantUser();
            //set tenant id to the tenantUser.
            tenantUser.id = chance.guid();
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
                            cb(err,null);
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
            var chance = new Chance();
            //tenant user instance.
            var tenantUser = new TenantUser();
            //set tenant id to the tenantUser.
            tenantUser.id = chance.guid();
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
                                cb(new Error('该企业客户用户对应的企业客户信息不存在！'),null);
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
                cb(err, res);
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