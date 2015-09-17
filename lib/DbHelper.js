/**
 * Created by QingWang on 2014/7/21.
 * Useage:
 *  var DbConfigInfo            = require('../lib/DbConfigInfo');
 *  var DbHelper                = require('../lib/DbHelper');
 *
 *  var ConfigInfo              = new DbConfigInfo();
 *  var pool                    = new DbHelper(ConfigInfo.LocalDB);
 *  pool.Execute(....);
 *  pool.ExecuteQuery(....);
 *  pool.mysql.escape(field);
 *  and so on.
 *
*/

var mysql           = require("mysql");
var JsonResult		= require('./JsonResult');

module.exports = DbHelper;

function DbHelper(config){
    this.config = config;
    this.pool = mysql.createPool(config);
    this.mysql = mysql;
};

DbHelper.prototype.Execute = function(sqlparameter,callback) {
    var that = this;

    var jsonResult = new JsonResult();
    jsonResult.Result = false;

    that.pool.getConnection(function(err, connection) {
        if (err) {
            jsonResult.Data = err;
            jsonResult.Message = err;
            return callback(jsonResult);
        }

        // Use the connection
        connection.query(sqlparameter.Query, function (err, rows) {
            // And done with the connection.

            if (err) {
                jsonResult.Data = err;
                jsonResult.Message = err;
                return callback(jsonResult);
                //throw err;
            }

            jsonResult.Data = rows;
            jsonResult.Message = "";
            jsonResult.Result = true;

            connection.release();
            return callback(jsonResult);
        });
    });
};

DbHelper.prototype.ExecuteQuery = function(query,params,cb) {
    var that = this;

    console.log('*********************************************************************************');
    console.log({'SQL':query,'PARAMETER':params});
    console.log('*********************************************************************************');

    that.pool.getConnection(function (err, connection) {
        if (err) {
            console.log(err);
            cb(err);
            return ;
        }
        if (typeof(params) == 'function') {
            cb = params,
            params = [];
        }
        connection.query(query, params, function (err, res) {
            cb(err, res);
            connection.release();
        });
    });
};
