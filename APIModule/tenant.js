﻿var Chance = require('chance');
var crypto = require('crypto');
var DbConfigInfo = require('../Config');
var DbHelper = require('../lib/DbHelper');
var Tenant = require('../lib/Model/Tenant');
var TenantUser = require('../lib/Model/User');
var async = require('async');
var CCAP = require('ccap'),
    ccap = new CCAP();
var fs = require('fs');
var Utility                 = require('../lib/Utility');
var utility                 = new Utility();

var ConfigInfo = new DbConfigInfo();
var mysqlHelper = new DbHelper(ConfigInfo.BusinessDB);

/*register tenant api method*/
exports.AddTenant = function (request, response) {

//    //generate the tenant directory
//    var path = "./samples/";
//    var tenantDomain = "123";
//    var pageName = "login.html";
//    GenerateTenantFolder(path, tenantDomain, pageName);
//
//    //Add verification code.
//    var verificationCode = request.body.verificationCode;
//    if (verificationCode !== undefined && verificationCode !== null) {
//        if (verificationCode.toLowerCase() !== request.session.VerificationCode.toLowerCase()) {
//            response.send({ success: false, data: {message: 'verification code is not correct.'}});
//            return;
//        }
//    }

    var tenant = new Tenant();
    tenant.name = request.body.tenantName;
    tenant.alias = request.body.alias;
    tenant.mappedDomain = request.body.mappedDomain;
    tenant.customerNames = request.body.customerNames;

    var chance = new Chance();
    //tenant user instance.
    var tenantUser = new TenantUser();
    //set tenant id to the tenantUser.
    tenantUser.id = chance.guid();
    tenantUser.username=request.body.admin;
    tenantUser.firstname = tenantUser.username;
    tenantUser.lastname = tenantUser.username;
    tenantUser.email = request.body.email;
    tenantUser.phone = request.body.phone;
    tenantUser.groupid = request.body.groupid;

    async.series([
        function (callback) {
            var sqlAddTenant = "insert into tenants_tenants(name,alias,mappeddomain,customer_names,version,language,trusteddomains,trusteddomainsenabled,creationdatetime) " +
                "values(?,?,?,?,?,?,?,?,now());";
            var sqlAddTenantParams = [tenant.name, tenant.alias, tenant.mappedDomain, tenant.customerNames, tenant.version, tenant.language, tenant.trustedDomains, tenant.trustedDomainsEnabled];
            mysqlHelper.ExecuteQuery(sqlAddTenant, sqlAddTenantParams, function (err, res) {
                if(res){
                    tenantUser.tenant = res.insertId;//save the tenant id
                }
                console.log(sqlAddTenant);
                console.log(sqlAddTenantParams);
                callback(err, res);
            });
        },
        function (callback) {
            var sqlAddAdminForCurTenant = "insert into core_user(id,tenant,username,firstname,lastname,sex,bithdate,status,activation_status,email,workfromdate,terminateddate,phone,removed,create_on,last_modified) " +
                "values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,now(),now())";
            var sqlAddAdminForCurTenantParams = [tenantUser.id, tenantUser.tenant, tenantUser.username, tenantUser.firstname, tenantUser.lastname, tenantUser.sex, tenantUser.bithdate, tenantUser.status, tenantUser.activation_status, tenantUser.email, tenantUser.workFromDate, tenantUser.terminatedDate, tenantUser.phone, tenantUser.removed];
            mysqlHelper.ExecuteQuery(sqlAddAdminForCurTenant, sqlAddAdminForCurTenantParams, function (err, res) {
                console.log(sqlAddAdminForCurTenant);
                console.log(sqlAddAdminForCurTenantParams);
                callback(err, res);
            });
        },
        function (callback) {
            var sha512 = crypto.createHash('sha512');
            var passWord = sha512.update(request.body.adminPwd).digest('hex');
            var sqlAdminPwdSecurity = "insert into core_usersecurity(tenant,userid,pwdhashsha512) values(?,?,?);";
            var sqlAdminPwdSecurityParams = [tenantUser.tenant, tenantUser.id, passWord];
            mysqlHelper.ExecuteQuery(sqlAdminPwdSecurity, sqlAdminPwdSecurityParams, function (err, res) {
                console.log(sqlAdminPwdSecurity);
                console.log(sqlAdminPwdSecurityParams);
                callback(err, res);
            });
        },
        function(callback){
            // add the UserGroup
            var insertUserGroupQuery = 'INSERT INTO ' + ConfigInfo.DbTables.db_user_group + '(userid,groupid,removed,last_modified)VALUES(?,?,0,now())';
            var insertUserGroupParams=[tenantUser.id, tenantUser.groupid];
            mysqlHelper.ExecuteQuery(insertUserGroupQuery,insertUserGroupParams, function (err, res) {
                console.log(insertUserGroupQuery);
                console.log(insertUserGroupParams);
                callback(err, res);
            });
        }
    ], function (err, res) {
        if (err) {
            console.error(err);
            response.json({success: false, data: err});
            return;
        }
        response.send({ success: true, data: {tenantId: tenantUser.tenant}});
    });
};

/*Update tenant api method*/
exports.UpdateTenant = function (request, response) {
    var tenant = new Tenant();
    tenant.id = request.body.tenantId;
    tenant.name = request.body.tenantName;
    tenant.alias = request.body.alias;
    tenant.mappedDomain = request.body.mappedDomain;
    tenant.phone = request.body.phone;
    tenant.email = request.body.email;

    async.series([
        function (callback) {
            var sqlUpdateTenant = "update tenants_tenants set name=?,alias=?,mappeddomain=? where id=?";
            var sqlUpdateTenantParams = [tenant.name, tenant.alias, tenant.mappedDomain, parseInt(tenant.id)];
            mysqlHelper.ExecuteQuery(sqlUpdateTenant, sqlUpdateTenantParams, function (err, res) {
                console.log(sqlUpdateTenant);
                console.log(sqlUpdateTenantParams);
                callback(err, res);
            });
        },
        function (callback) {
            var sqlUpdateTenantAdmin = "update core_user set phone=?,email=? where username='Admin' and tenant=?";
            var sqlUpdateTenantAdminParams = [tenant.phone, tenant.email, parseInt(tenant.id)];
            mysqlHelper.ExecuteQuery(sqlUpdateTenantAdmin, sqlUpdateTenantAdminParams, function (err, res) {
                console.log(sqlUpdateTenantAdmin);
                console.log(sqlUpdateTenantAdminParams);
                callback(err, res);
            });
        }
    ], function (err, res) {
        if (err) {
            console.error(err);
            response.json({success: false, data: err});
            return;
        }
        response.send({success: true, data: res[1]});
    });
};

exports.DeleteTenant = function(req,res){
    var tenantId = req.body.id;
    var deleteTenantQuery = 'DELETE FROM tenants_tenants WHERE id='+mysqlHelper.mysql.escape(tenantId);
    var deleteUserQuery = 'DELETE FROM core_user WHERE tenant='+mysqlHelper.mysql.escape(tenantId);
    var deleteUserSecurityQuery = 'DELETE FROM core_usersecurity WHERE tenant='+mysqlHelper.mysql.escape(tenantId);
    async.parallel({
            tenant: function (cb) {
                mysqlHelper.ExecuteQuery(deleteTenantQuery, function (err, data) {
                    console.log(deleteTenantQuery);
                    cb(err, data);
                });
            },
            user: function (cb) {
                mysqlHelper.ExecuteQuery(deleteUserQuery, function (err, data) {
                    console.log(deleteUserQuery);
                    cb(err, data);
                });
            },
            userSecurity: function (cb) {
                mysqlHelper.ExecuteQuery(deleteUserSecurityQuery, function (err, data) {
                    console.log(deleteUserSecurityQuery);
                    cb(err, data);
                });
            }
        },
        function(err,result) {
            var resultObj = '';
            if(result.tenant&&result.user&&result.userSecurity){
                resultObj = utility.jsonResult('', '删除成功！');
            }else{
                resultObj = utility.jsonResult(err, result);
            }

            res.json(resultObj);
        }
    );

};


//get tenant list api method
exports.GetTenantList = function (request, response) {
    var params = utility.ParamsParse(req.body.params);
    var orderBy = params.orderby;//排序
    var query = params.query;//查询参数
    var pagination = params.pagination;//分页参数
    var sqlGetTenantList = 'select * from tenants_tenants where 1=1';
    //query params.
    if(query.start_date){
        sqlGetTenantList=sqlGetTenantList.concat(" and creationdatetime>="+mysqlHelper.mysql.escape(query.start_date));
    }else if(query.end_date){
        sqlGetTenantList=sqlGetTenantList.concat(" and creationdatetime<="+mysqlHelper.mysql.escape(query.end_date));
    }
    //total count.
    var sqlTotalCount= sqlGetTenantList.replace("*", "count(0) 'count'");

    //order by.
    if(orderBy){

    }
    //pagination.
    //sqlGetTenantList=sqlGetTenantList.concat(" limit "+parseInt(pagination.pagesize)*parseInt(pagination.pageindex)+","+parseInt(pagination.pagesize));

    var data = { success: false, totalcount: 0, rows: null };

    async.series([
      function(callback){
          mysqlHelper.ExecuteQuery(sqlTotalCount,function(err,rows){
              if(rows){
                  data.totalcount=rows[0].count;
              }
              callback(err,rows);
          });
      },
        function(callback){
          mysqlHelper.ExecuteQuery(sqlGetTenantList,function(err,rows){
              if(rows){
                  data.rows=rows;
                  data.success=true;
              }
              callback(err,rows);
          });
        }
    ],function(err,res){
         if(err){console.log(err);}
         response.send(data);
    });
};

//get tenant's user list api method
exports.GetUserListByTenant = function (req, res) {
    //var tenantID=req.body.id;
    var tenantID = req.query.id;
    if (tenantID === undefined || tenantID === null || tenantID === '') {
        res.send("请输入租户ID");
    }
    else {
        var sqlSearchString = 'SELECT * FROM core_user where tenant=' + mysqlHelper.mysql.escape(tenantID) + ';';
        mysqlHelper.ExecuteQuery(sqlSearchString, function (error, result) {

            if (error) {
                res.json({success: false, data: error});
                return;
            }
            res.send({ success: true, data: result });
        });
    }
};

//add tenant's user api method
exports.AddTenantUser = function (req, res) {
    var chance = new Chance();
    var tenantUser = new TenantUser();
    tenantUser.id = chance.guid();
    tenantUser.tenant = req.body.id;
    tenantUser.username = req.body.username;
    tenantUser.firstname = req.body.firstname;
    tenantUser.lastname = req.body.lastname;
    tenantUser.email = req.body.email;

    var sqlAddTenantUser = "insert into core_user(tenant,id,username,firstname,lastname,sex,bithdate,status,activation_status,email,workfromdate,terminateddate,phone_activation,removed,create_on,last_modified) " +
        "values(" + mysqlHelper.mysql.escape(tenantUser.tenant) + "," + mysqlHelper.mysql.escape(tenantUser.id) + "," + mysqlHelper.mysql.escape(tenantUser.username) + "," + mysqlHelper.mysql.escape(tenantUser.firstname) + "," + mysqlHelper.mysql.escape(tenantUser.lastname) + "," + mysqlHelper.mysql.escape(tenantUser.sex) + "," + mysqlHelper.mysql.escape(tenantUser.bithdate) + "," + mysqlHelper.mysql.escape(tenantUser.status) + "," + mysqlHelper.mysql.escape(tenantUser.activation_status) + "," + mysqlHelper.mysql.escape(tenantUser.email) + "," + mysqlHelper.mysql.escape(tenantUser.workFromDate) + "," + mysqlHelper.mysql.escape(tenantUser.terminatedDate) + "," + mysqlHelper.mysql.escape(tenantUser.phone_activation) + "," + mysqlHelper.mysql.escape(tenantUser.removed) + ",now(),now())";

    mysqlHelper.ExecuteQuery(sqlAddTenantUser, function (error, result) {
        if (error) {
            res.json({success: false, data: error});
            return;
        }
        res.send({ success: true });
    });
};

//delete tenant's user api method
exports.DeleteUserByUserID = function (req, res) {
    var userID = req.query.id;
    if (userID == null || userID == undefined || userID == "") {
        throw "userID can not empty!";
    }
    var sqlDeleteTenantUser = "delete from core_user where id=" + mysqlHelper.mysql.escape(userID) + ";";
    mysqlHelper.ExecuteQuery(sqlDeleteTenantUser, function (error, result) {
        if (error) {
            res.json({success: false, data: error});
            return;
        }
        res.send({ success: true });
    });
};

//get group of tenant api method
exports.GetGroupByTenant = function (req, res) {
    var tenantID = req.query.id;
    if (tenantID == null || tenantID == undefined || tenantID == "") {
        throw "tenantID can not empty!";
    }
    var sqlGetGroup = "SELECT * FROM core_group where tenant=" + mysqlHelper.mysql.escape(tenantID);
    mysqlHelper.ExecuteQuery(sqlGetGroup, function (error, result) {
        if (error) {
            res.json({success: false, data: error});
            return;
        }
        res.send({ success: true, data: result });
    });
};

//get group of tenant's user api method
exports.GetGroupByTUser = function (req, res) {
    var userID = req.query.userid;
    if (userID == null || userID == undefined || userID == "") {
        throw "userID can not empty!";
    }
    var sql = "select g.* from core_group g,core_user_group u where g.id=u.groupid and u.userid=" + mysqlHelper.mysql.escape(userID);
    mysqlHelper.ExecuteQuery(sql, function (error, result) {
        if (error) {
            res.json({success: false, data: error});
            return;
        }
        res.send({ success: true, data: result });
    });
};

/*Get tenant Details api method*/
exports.GetTenantDetailsById = function (request, response) {
    var tenantId = request.query.tenantId;

    var sqlGetTenantDetails = "select t.name,t.alias,t.mappeddomain,u.phone,u.email from tenants_tenants t left join core_user u on t.id=u.tenant where u.username='Admin' and t.id=" + mysqlHelper.mysql.escape(parseInt(tenantId));
    mysqlHelper.ExecuteQuery(sqlGetTenantDetails, function (error, rows) {
        if (error) {
            response.json({success: false, data: error});
            return;
        }

        if (rows.length > 0) {
            response.send(rows[0]);
        } else {
            response.send(rows);
        }

        console.log(sqlGetTenantDetails);
    });
};

/*Get Verification Code*/
exports.GetVerificationCode = function (request, response) {
    var ary = ccap.get();
    var verificationCode = ary[0];
    var buf = ary[1];
    request.session.VerificationCode = verificationCode;
    response.end(buf);
};

/*Get Domain by tenantId
 * @param {String} tenantId
 * @return {Json}
 * @api public
 * */
exports.GetDomainByTenantId = function (request, response) {
    var tenantId = request.query.tenantId;

    var sqlGetDomainSql = "select mappeddomain from tenants_tenants where id=" + mysqlHelper.mysql.escape(parseInt(tenantId)) + ";";

    mysqlHelper.ExecuteQuery(sqlGetDomainSql, function (error, rows) {
        if (error) {
            response.json({success: false, data: error});
            return;
        }

        if (rows.length > 0) {
            response.send({success: true, data: rows[0]});
            console.log(sqlGetDomainSql);
        } else {
            response.send({success: true, data: null});
        }
    });
};

/*Get Domain by tenant user id
 * @param {String} userId
 * @return {Json}
 * @api public
 * */
exports.GetDomainByTenantUserId = function (request, response) {
    var userId = request.query.userId;

    var sqlGetDomainByUserId = "select t.mappeddomain from tenants_tenants t left join core_user u on t.id=u.tenant where u.id=" + mysqlHelper.mysql.escape(userId) + ";";

    mysqlHelper.ExecuteQuery(sqlGetDomainByUserId, function (error, rows) {
        if (error) {
            response.json({success: false, data: error});
            return;
        }

        if (rows.length > 0) {
            response.send({success: true, data: rows[0]});
            console.log(sqlGetDomainByUserId);
        } else {
            response.send({success: true, data: null});
        }
    });
};

/*Get Tenant info by user id*/
exports.GetTenantByUserId = function (request, response) {
    var userId = request.query.userId;

    var sqlGetTenantByUserId = "select t.* from tenants_tenants t left join core_user u on t.id=u.tenant where u.id=" + mysqlHelper.mysql.escape(userId) + ";";

    mysqlHelper.ExecuteQuery(sqlGetTenantByUserId, function (error, rows) {
        if (error) {
            response.json({success: false, data: error});
            return;
        }

        if (rows.length > 0) {
            response.send({success: true, data: rows[0]});
            console.log(sqlGetTenantByUserId);
        } else {
            response.send({success: true, data: null});
        }
    });
};

/*生成租户目录*/
function GenerateTenantFolder(path, tenantDomain, pageName) {
    var folderPath = "./samples/" + tenantDomain;
    var longinFilePath = "./samples/login.html";

    async.waterfall([
        function(callback){
            fs.exists(folderPath,function(exists){
                callback(null,exists);
            });
        },
        function(exists,callback){
            if(!exists)
            {
                fs.mkdir(folderPath,function(e){
                    callback(e);
                });
            }else
            {
                callback(null);
            }
        },
        function(callback){
            fs.readFile(longinFilePath, function (err, data){
                callback(err,data);
            });
        },
        function(data,callback){
            fs.writeFile(folderPath + ConfigInfo.TokenConfig.DefaultRedirectPage, data, function (err) {
               callback(err,true);
            });
        }
    ],function(err,res){
        if(err)
        {
            console.error(err);
            return false;
        }
        return res;
    });
}