var DbConfigInfo = require('../Config');
var DbHelper = require('../lib/DbHelper');

var ConfigInfo = new DbConfigInfo();
var pool = new DbHelper(ConfigInfo.BusinessDB);
var moment = require('moment');
var async = require('async');
var Utility = require('../lib/Utility');
var utility = new Utility();
var TokenVerification = require('./tokenVerification');
var BasicSettings = ConfigInfo.BasicSettings;

//获取新闻列表
exports.GetNewsList = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        if (!utility.isValidData(params)) {
            res.send('缺少必须参数');
            return;
        }
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var pagination = params.pagination; //分页参数
        var sqlParams = [];
        var sql = "select * from v_b_news_evaluation_customer where search_engine <> 'bing_news_api_en' and news_title is not null";

        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.start_date)) {
            var utcTime = moment.utc(query.start_date).format();
            sql += " and report_date >= ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.end_date)) {
            var utcTime = moment.utc(query.end_date).add(1, 'days').format();
            sql += " and report_date < ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.news_title)) {
            sql += " and news_title like '%\\" + query.news_title + "%'";
        }
        if (utility.isValidData(query.status)) {//舆情状态 已处理、未处理
            sql += " and status = ?";
            sqlParams.push(query.status);
        }
        if (utility.isValidData(query.is_sensitive)) {//是否敏感
            sql += " and is_sensitive = ?";
            sqlParams.push(query.is_sensitive);
        }
        if (query.level != undefined) {//预警等级
            if (query.level == '1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
        }
        var queryCountSql = sql.replace("*", "count(0) 'count'");
        //排序
        var orderColumnCount = 0;
        sql += " order by ";
        for (var order in orderBy) {
            orderColumnCount++;
            sql += (order + " " + orderBy[order] + ",");
        }
        if (orderColumnCount == 0) {
            sql = sql.replace(" order by ", "");
        } else {
            sql = sql.substring(0, sql.length - 1); //移除最后一个逗号
        }
        if (pagination.pagesize != undefined && pagination.pageindex != undefined && !isNaN(pagination.pagesize) && !isNaN(pagination.pageindex)) {
            sql += " limit ?,?";
            sqlParams.push(parseInt(pagination.pagesize) * parseInt(pagination.pageindex));
            sqlParams.push(parseInt(pagination.pagesize));
        }
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var data = {
                success: true,
                totalcount: 0,
                rows: rows
            };
            pool.ExecuteQuery(queryCountSql, sqlParams, function (err, result) {
                console.log('查询到新闻总行数：' + result[0].count);
                data.totalcount = result[0].count;
                return res.send(data);
            });
        });
    });

};

function Hanlde() {
    this.b_id = '';
    this.status = 0;
    this.is_sensitive = 0;
    this.updated_by = '';
    this.updated_date = '';
    this.handle_id = '';
    this.handle_type = '';
    this.handle_remark = '';
    this.handle_date = '';
    this.handle_user = '';
}
//编辑新闻
exports.EditNewsByID = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //参数
        if (query.b_id == undefined) {
            res.send('缺少必须参数新闻ID');
            return;
        }
        var checkIsExistsSql = "select count(0) as counts from b_news_evaluation_handle where b_id = " + query.b_id;
        pool.ExecuteQuery(checkIsExistsSql, function (err, result) {
            if (err) {
                res.send("服务器出错");
            }
            else {
                if (result[0].counts > 0) {//已经存在，则修改
                    var sql = 'update b_news_evaluation_handle set updated_date= now()';
                    var sqlParams = [];
                    if (utility.isValidData(query.status)) {
                        sql += " ,status = ?";
                        sqlParams.push(query.status);
                        if (clientInfo != null && clientInfo != false) {
                            sql += " ,handle_user = ?";
                            sqlParams.push(clientInfo.UserID);
                            sql += " ,handle_date = now()";
                        }
                    }
                    if (query.is_sensitive != undefined) {
                        sql += " ,is_sensitive = ?";
                        sqlParams.push(query.is_sensitive);
                    }
                    if (query.handle_id != undefined) {
                        sql += " ,handle_id = ?";
                        sqlParams.push(query.handle_id);
                    }
                    if (query.handle_type != undefined) {
                        sql += " ,handle_type = ?";
                        sqlParams.push(query.handle_type);
                    }
                    if (query.handle_remark != undefined) {
                        sql += " ,handle_remark = ?";
                        sqlParams.push(query.handle_remark);
                    }
                    if (clientInfo != null && clientInfo != false) {
                        sql += " ,updated_by = ?";
                        sqlParams.push(clientInfo.UserID);
                    }
                    sql += " where b_id = ?";
                    sqlParams.push(query.b_id);
                    pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
                        var affectedRows = rows.affectedRows;
                        if (err) {
                            var msg = 'update error';
                            console.error(err);
                            res.send({
                                'code': 500,
                                'state': 'failure',
                                'msg': msg,
                                'data': null
                            });
                        }
                        res.send({
                            'code': 200,
                            'state': 'success',
                            'msg': '修改行数' + affectedRows,
                            'data': null
                        });
                    });
                }
                else {//不存在记录，则插入新数据
                    var insertSql = "insert into `b_news_evaluation_handle`(`b_id`,`STATUS`,`is_sensitive`,`updated_by`,`updated_date`,`handle_id`,`handle_type`,`handle_remark`,`handle_date`,`handle_user`)";
                    insertSql += "values (?,?,?,?,?,?,?,?,?,?)";
                    var obj = new Hanlde();
                    obj.b_id = query.b_id;
                    obj.status = query.status;
                    obj.is_sensitive = query.is_sensitive;
                    obj.updated_by = query.updated_by;
                    obj.updated_date = query.updated_date;
                    obj.handle_id = query.handle_id;
                    obj.handle_type = query.handle_type;
                    obj.handle_remark = query.handle_remark;
                    obj.handle_date = query.handle_date;
                    obj.handle_user = query.handle_user;
                    var insertSqlParams = [obj.b_id, obj.status, obj.is_sensitive, obj.updated_by, obj.updated_date, obj.handle_id, obj.handle_type, obj.handle_remark, obj.handle_date, obj.handle_user];
                    pool.ExecuteQuery(insertSql, insertSqlParams, function (err, rows) {
                        if (err) {
                            res.send("服务端错误");
                        }
                        else {
                            var affectedRows = rows.affectedRows;
                            if (affectedRows > 0) {
                                res.send({
                                    'code': 200,
                                    'state': 'success',
                                    'msg': '修改行数' + affectedRows,
                                    'data': null
                                });
                            }
                            else {
                                res.send('处理失败');
                            }
                        }
                    });
                }
            }
        });
    });
};

//获取微博列表
exports.GetWeiBoList = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var pagination = params.pagination; //分页参数
        var sqlParams = [];
        var sql = 'select * from v_b_weibo_evaluation_customer where status_text IS NOT NULL';
        var currentToken = null;
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.start_date)) {
            var utcTime = moment.utc(query.start_date).format();
            sql += " and created_date >= ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.end_date)) {
            var utcTime = moment.utc(query.end_date).add(1, 'days').format();
            sql += " and created_date < ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.status_text)) {
            sql += " and status_text like '%\\" + query.status_text + "%'";
        }
        if (query.status != undefined) {
            sql += " and status = ?";
            sqlParams.push(query.status);
        }
        if (query.is_sensitive != undefined) {
            sql += " and is_sensitive = ?";
            sqlParams.push(query.is_sensitive);
        }
        if (query.level != undefined) {//预警等级
            if (query.level == '1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
        }
        var queryCountSql = sql.replace("*", "count(0) 'count'");
        //排序
        var orderColumnCount = 0;
        sql += " order by ";
        for (var order in orderBy) {
            orderColumnCount++;
            sql += (order + " " + orderBy[order] + ",");
        }
        if (orderColumnCount == 0) {
            sql = sql.replace(" order by ", "");
        } else {
            sql = sql.substring(0, sql.length - 1); //移除最后一个逗号
        }
        if (pagination.pagesize != undefined && pagination.pageindex != undefined && !isNaN(pagination.pagesize) && !isNaN(pagination.pageindex)) {
            sql += " limit ?,?";
            sqlParams.push(parseInt(pagination.pagesize) * parseInt(pagination.pageindex));
            sqlParams.push(parseInt(pagination.pagesize));
        }
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var data = {
                success: true,
                totalcount: 0,
                rows: rows
            };
            pool.ExecuteQuery(queryCountSql, sqlParams, function (err, result) {
                console.log('查询到微博总行数：' + result[0].count);
                data.totalcount = result[0].count;
                res.send(data);
            });
        });
    });
};

//编辑微博
exports.EditWeiBoByID = function (req, res) {
//    GetTokenInformation(req,function (clientInfo) {
//    var params = utility.ParamsParse(req.body.params);
//    var query = params.query; //查询参数
//    if (query.b_id == undefined) {
//        res.send('缺少必须参数微博ID');
//        return;
//    }
//    var sql = 'update b_weibo_evaluation set updated_date= now()';
//    var sqlParams = [];
//    if (query.status != undefined) {
//        sql += " ,status = ?";
//        sqlParams.push(query.status);
//        if (clientInfo != null && clientInfo != false) {
//            sql += " ,handle_user = ?";
//            sqlParams.push(clientInfo.UserID);
//            sql += " ,handle_date=now()";
//        }
//    }
//    if (query.is_sensitive != undefined) {
//        sql += " ,is_sensitive = ?";
//        sqlParams.push(query.is_sensitive);
//    }
//    if (query.handle_id != undefined) {
//        sql += " ,handle_id = ?";
//        sqlParams.push(query.handle_id);
//    }
//    if (query.handle_type != undefined) {
//        sql += " ,handle_type = ?";
//        sqlParams.push(query.handle_type);
//    }
//    if (query.handle_remark != undefined) {
//        sql += " ,handle_remark = ?";
//        sqlParams.push(query.handle_remark);
//    }
//    if (clientInfo != null && clientInfo != false) {
//        sql += " ,updated_by = ?";
//        sqlParams.push(clientInfo.UserID);
//    }
//    sql += " where b_id = " + query.b_id + "";
//    console.log(sql);
//    pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
//        console.log(rows);
//        var affectedRows = rows.affectedRows;
//        if (err) {
//            var msg = 'update error';
//            console.error(err);
//            res.send({
//                'code': 500,
//                'state': 'failure',
//                'msg': msg,
//                'data': null
//            });
//            return;
//        }
//        res.send({
//            'code': 200,
//            'state': 'success',
//            'msg': '修改行数' + affectedRows,
//            'data': null
//        });
//    });
//    });
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //参数
        if (query.b_id == undefined) {
            res.send('缺少必须参数微博ID');
            return;
        }
        var checkIsExistsSql = "select count(0) as counts from b_weibo_evaluation_handle where b_id = " + query.b_id;
        pool.ExecuteQuery(checkIsExistsSql, function (err, result) {
            if (err) {
                res.send("服务器出错");
            }
            else {
                if (result[0].counts > 0) {//已经存在，则修改
                    var sql = 'update b_weibo_evaluation_handle set updated_date= now()';
                    var sqlParams = [];
                    if (utility.isValidData(query.status)) {
                        sql += " ,status = ?";
                        sqlParams.push(query.status);
                        if (clientInfo != null && clientInfo != false) {
                            sql += " ,handle_user = ?";
                            sqlParams.push(clientInfo.UserID);
                            sql += " ,handle_date = now()";
                        }
                    }
                    if (query.is_sensitive != undefined) {
                        sql += " ,is_sensitive = ?";
                        sqlParams.push(query.is_sensitive);
                    }
                    if (query.handle_id != undefined) {
                        sql += " ,handle_id = ?";
                        sqlParams.push(query.handle_id);
                    }
                    if (query.handle_type != undefined) {
                        sql += " ,handle_type = ?";
                        sqlParams.push(query.handle_type);
                    }
                    if (query.handle_remark != undefined) {
                        sql += " ,handle_remark = ?";
                        sqlParams.push(query.handle_remark);
                    }
                    if (clientInfo != null && clientInfo != false) {
                        sql += " ,updated_by = ?";
                        sqlParams.push(clientInfo.UserID);
                    }
                    sql += " where b_id = ?";
                    sqlParams.push(query.b_id);
                    pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
                        var affectedRows = rows.affectedRows;
                        if (err) {
                            var msg = 'update error';
                            console.error(err);
                            res.send({
                                'code': 500,
                                'state': 'failure',
                                'msg': msg,
                                'data': null
                            });
                            return;
                        }
                        res.send({
                            'code': 200,
                            'state': 'success',
                            'msg': '修改行数' + affectedRows,
                            'data': null
                        });
                    });
                }
                else {//不存在记录，则插入新数据
                    var insertSql = "insert into `b_weibo_evaluation_handle`(`b_id`,`STATUS`,`is_sensitive`,`updated_by`,`updated_date`,`handle_id`,`handle_type`,`handle_remark`,`handle_date`,`handle_user`)";
                    insertSql += "values (?,?,?,?,?,?,?,?,?,?)";
                    var obj = new Hanlde();
                    obj.b_id = query.b_id;
                    obj.status = query.status;
                    obj.is_sensitive = query.is_sensitive;
                    obj.updated_by = query.updated_by;
                    obj.updated_date = query.updated_date;
                    obj.handle_id = query.handle_id;
                    obj.handle_type = query.handle_type;
                    obj.handle_remark = query.handle_remark;
                    obj.handle_date = query.handle_date;
                    obj.handle_user = clientInfo.UserID;
                    var insertSqlParams = [obj.b_id, obj.status, obj.is_sensitive, obj.updated_by, obj.updated_date, obj.handle_id, obj.handle_type, obj.handle_remark, obj.handle_date, obj.handle_user];
                    pool.ExecuteQuery(insertSql, insertSqlParams, function (err, rows) {
                        if (err) {
                            res.send("服务端错误");
                            return;
                        }
                        else {
                            var affectedRows = rows.affectedRows;
                            if (affectedRows > 0) {
                                res.send({
                                    'code': 200,
                                    'state': 'success',
                                    'msg': '修改行数' + affectedRows,
                                    'data': null
                                });
                            }
                            else {
                                res.send('处理失败');
                            }

                        }
                    });
                }
            }
        });
    });
};

//获取英文新闻列表
exports.GetEnNewsList = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var pagination = params.pagination; //分页参数
        var sqlParams = [];
        var sql = "select * from v_b_news_evaluation_customer where search_engine = 'bing_news_api_en'";

        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.start_date)) {
            var utcTime = moment.utc(query.start_date).format();
            sql += " and report_date >= ?";
            sqlParams.push(utcTime);
        }
        if (query.end_date != undefined) {
            var utcTime = moment.utc(query.end_date).add(1, 'days').format();
            sql += " and report_date < ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.news_title)) {
            sql += " and LOWER(news_title) like '%" + query.news_title.toLowerCase() + "%'";
        }
        if (utility.isValidData(query.status)) {
            sql += " and status = ?";
            sqlParams.push(query.status);
        }
        if (query.is_sensitive != undefined) {
            sql += " and is_sensitive = ?";
            sqlParams.push(query.is_sensitive);
        }
        if (query.level != undefined) {//预警等级
            if (query.level == '1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
        }
        var queryCountSql = sql.replace("*", "count(0) 'count'");
        //排序
        var orderColumnCount = 0;
        sql += " order by ";
        for (var order in orderBy) {
            orderColumnCount++;
            sql += (order + " " + orderBy[order] + ",");
        }
        if (orderColumnCount == 0) {
            sql = sql.replace(" order by ", "");
        } else {
            sql = sql.substring(0, sql.length - 1); //移除最后一个逗号
        }
        if (pagination.pagesize != undefined && pagination.pageindex != undefined && !isNaN(pagination.pagesize) && !isNaN(pagination.pageindex)) {
            sql += " limit ?,?";
            sqlParams.push(parseInt(pagination.pagesize) * parseInt(pagination.pageindex));
            sqlParams.push(parseInt(pagination.pagesize));
        }
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var data = {
                success: true,
                totalcount: 0,
                rows: rows
            };
            pool.ExecuteQuery(queryCountSql, sqlParams, function (err, result) {
                console.log(result[0].count);
                data.totalcount = result[0].count;
                res.send(data);
            });
        });
    });
};

//获取热词（包括综合热词）
exports.GetHotWords = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'select word_name,MAX(word_count) AS mCount from b_brand_hotword where 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql += " and field_name = ?";
            sqlParams.push(query.field_name);
        }
        if (utility.isValidData(query.brand_name)) {
            sql += " and brand_name = ?";
            sqlParams.push(query.brand_name)
        }
        if (utility.isValidData(query.start_date)) {
            sql += " and date_id >= ?";
            sqlParams.push(parseInt(moment.utc(query.start_date).format('YYYYMMDD')));
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and date_id < ?";
            var utcTime = moment.utc(query.end_date).add(1, 'days').format('YYYYMMDD');
            sqlParams.push(parseInt(utcTime));
        }
        //极性 正面、负面、中性
        if (query.word_value != undefined) {
            if (query.word_value == '-1') {
                sql += " and word_value < 0";
            }
            else if (query.word_value == '0') {
                sql += " and word_value = 0";
            }
            else if (query.word_value == '1') {
                sql += " and word_value > 0";
            }
        }
        sql += " GROUP BY word_name order by mCount desc";
        if (query.topn != undefined && !isNaN(query.topn)) {
            sql += " limit ?";
            sqlParams.push(parseInt(query.topn));
        }
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var hotWords = [];
            for (var i = 0; i < rows.length; i++) {
                hotWords.push(rows[i].word_name);
            }
            var result = {
                success: true,
                data: hotWords
            };
            return res.send(result);
        });
    });
};

//获取舆情指数数据 二维
exports.GetSentimentLinear = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var granulityMinute = 10;//统计粒度 10分钟
        var subIndex = 11;
        var startTime, endTime, appendString;
        if (utility.isValidData(query.granulityMinute) && !isNaN(query.granulityMinute) && utility.isValidData(query.start_date) && utility.isValidData(query.end_date)) {
            //201406230829
            granulityMinute = query.granulityMinute;
            switch (granulityMinute) {
                case 60:
                    subIndex = 10;
                    startTime = moment.utc(moment.utc(query.start_date).format('YYYY-MM-DD HH'));
                    endTime = moment.utc(moment.utc(query.end_date).format('YYYY-MM-DD HH'));
                    appendString = "00";
                    break;
                case 1440://60*24
                    subIndex = 8;
                    startTime = moment.utc(moment.utc(query.start_date).format('YYYY-MM-DD'));
                    endTime = moment.utc(moment.utc(query.end_date).add(1, 'days').format('YYYY-MM-DD'));
                    appendString = "0000";
                    break;
                default:
                    startTime = moment.utc(moment.utc(query.start_date).format('YYYY-MM-DD HH:mm'));
                    endTime = moment.utc(moment.utc(query.end_date).format('YYYY-MM-DD HH:mm'));
                    appendString = "0";
                    break;
            }
        }
        else {
            res.send('缺少必须参数：指数粒度、时间区间。或者参数类型不对。');
            return;
        }
        var sql = 'SELECT ROUND(avg(score_index)) points,LEFT(date_id,' + subIndex + ') timepoint FROM `b_brand_evaluation` WHERE 1 = 1';
        var sqlParams = [];
        if (utility.isValidData(query.start_date)) {
            sql += " and date_id >=?";
            sqlParams.push(parseInt(moment(startTime).format('YYYYMMDDHHmm')));
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and date_id <?";
            sqlParams.push(parseInt(moment(endTime).format('YYYYMMDDHHmm')));
        }
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql += " and field_name = ?";
            sqlParams.push(query.field_name);
        }
        if (utility.isValidData(query.brand_name)) {
            sql += " and brand_name = ?";
            sqlParams.push(query.brand_name)
        }
        sql += ' GROUP BY LEFT(date_id,' + subIndex + ')';
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var propArray = [];
            var obj = {};
            for (var i = 0; i < rows.length; i++) {
                var prop = "timepoint_" + rows[i].timepoint;
                obj[prop] = rows[i].points;
                propArray.push(rows[i].timepoint);
            }
            while (startTime < endTime) {
                var timePoint = moment.utc(startTime).format('YYYYMMDDHHmm').substring(0, subIndex);
                var prop = "timepoint_" + timePoint;
                if (!obj.hasOwnProperty(prop)) {
                    propArray.push(timePoint);
                    obj[prop] = 100;
                }
                startTime = startTime.add(granulityMinute, 'minutes');
            }
            propArray.sort();
            var dataArray = [];
            for (var i = 0; i < propArray.length; i++) {
                //20140623015 or 2014062301 or 20140623
                var time = propArray[i] + appendString;
                var year = time.substring(0, 4);
                var month = time.substring(4, 6) - 1;
                var day = time.substring(6, 8);
                var hour = time.substring(8, 10);
                var minute = time.substring(10, 12);
                dataArray.push([Date.UTC(year, month, day, hour, minute), obj["timepoint_" + propArray[i]]]);
            }
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取新闻舆情饼状分布图
exports.GetNewsSentimentPie = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'SELECT brand_name,COUNT(0) AS news_count FROM v_b_news_evaluation WHERE 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql += " and field_name = ?";
            sqlParams.push(query.field_name);
        }
        if (utility.isValidData(query.start_date)) {
            sql += " and report_date >= ?";
            var Time = moment.utc(query.start_date).format();
            sqlParams.push(Time);
        }
        if (utility.isValidData(query.end_date)) {
            var Time = moment.utc(query.end_date).add(1, 'days').format();
            sql += " and report_date < ?";
            sqlParams.push(Time);
        }
        //正负极性
        if (query.level != undefined) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " GROUP BY brand_name";
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var dataArray = [];
            for (var j = 0; j < rows.length; j++) {
                dataArray.push([rows[j].brand_name, rows[j].news_count]);
            }
            console.log(dataArray);
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取新闻和微博舆情饼状分布图
exports.GetNewsAndWeiBoSentimentPie = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql1 = 'SELECT brand_name,COUNT(0) AS news_count FROM v_b_news_evaluation WHERE 1 = 1';
        var sql2 = 'SELECT brand_name,COUNT(0) AS news_count FROM v_b_weibo_evaluation WHERE 1 = 1';
        var sqlParams1 = [];
        var sqlParams2 = [];
        if (clientInfo != null && clientInfo != false) {
            sql1 += " and customer_name = ?";
            sql2 += " and customer_name = ?";
            sqlParams1.push(clientInfo.CustomName);
            sqlParams2.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql1 += " and field_name = ?";
            sql2 += " and field_name = ?";
            sqlParams1.push(query.field_name);
            sqlParams2.push(query.field_name);
        }
        if (utility.isValidData(query.start_date)) {
            sql1 += " and report_date >= ?";
            sql2 += " and created_date >= ?";
            var Time = moment.utc(query.start_date).format();
            sqlParams1.push(Time);
            sqlParams2.push(Time);
        }
        if (utility.isValidData(query.end_date)) {
            var Time = moment.utc(query.end_date).add(1, 'days').format();
            sql1 += " and report_date < ?";
            sql2 += " and created_date < ?";
            sqlParams1.push(Time);
            sqlParams2.push(Time);
        }
        //正负极性
        if (query.level != undefined) {
            if (query.level == '1') {
                sql1 += " and score > 3";
                sql2 += " and score > 3";
            }
            else if (query.level == '0') {
                sql1 += " and score >=-3 and score <= 3";
                sql2 += " and score >=-3 and score <= 3";
            }
            else if (query.level == '-1') {
                sql1 += " and score < -3";
                sql2 += " and score < -3";
            }
        }
        sql1 += " GROUP BY brand_name";
        sql2 += " GROUP BY brand_name";

        var sql = "select brand_name,sum(news_count) as news_count from(" + sql1 + " UNION ALL " + sql2 + ") as a group by a.brand_name";
        var sqlParams = sqlParams1.concat(sqlParams2);
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var dataArray = [];
            for (var j = 0; j < rows.length; j++) {
                dataArray.push([rows[j].brand_name, rows[j].news_count]);
            }
            console.log(dataArray);
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取新闻舆情月度分布图
exports.GetNewsSentimentMonth = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = "SELECT DATE_FORMAT(report_date,'%m') months,COUNT(0) AS news_count FROM v_b_news_evaluation_customer where 1 = 1";
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and report_date >= ?";
            sqlParams.push(moment.utc(query.start_date).format());
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and report_date <= ?";
            sqlParams.push(moment.utc(query.end_date).format());
        }
        //正负极性
        if (query.level != undefined) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " GROUP BY DATE_FORMAT(report_date,'%m')";
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var dataArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (var j = 0; j < rows.length; j++) {
                //dataArray.push([rows[j].months,rows[j].news_count]);
                dataArray[parseInt(rows[j].months) - 1] = rows[j].news_count;
            }
            console.log(dataArray);
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取新闻舆情每日分布图
exports.GetNewsSentimentDay = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var sqlQuery = parserSentimentDay(clientInfo, params, "v_b_news_evaluation_customer", "report_date");
        sentimentDayExecute(sqlQuery, res);
    });
};

//获取新闻舆情小时，分钟，秒力度分布图
exports.GetNewsSentiment = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var timeType = req.params.TimeType;
        var sqlQuery = parserSentiment(clientInfo, params, "v_b_news_evaluation_customer", "report_date", req, timeType);
        sentimentExecute(sqlQuery, res, timeType);
    });
};

//获取微博舆情饼状分布图
exports.GetWeiBoSentimentPie = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'SELECT brand_name,COUNT(0) AS weibo_count FROM v_b_weibo_evaluation WHERE 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql += " and field_name = ?";
            sqlParams.push(query.field_name);
        }
        if (utility.isValidData(query.start_date)) {
            sql += " and created_date >= ?";
            sqlParams.push(moment.utc(query.start_date).format());
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and created_date <= ?";
            var utcTime = moment.utc(query.end_date).add(1, 'days').format();
            sqlParams.push(utcTime);
        }
        //正负极性
        if (query.level != undefined) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " GROUP BY brand_name";
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var dataArray = [];
            for (var j = 0; j < rows.length; j++) {
                dataArray.push([rows[j].brand_name, rows[j].weibo_count]);
            }
            console.log(dataArray);
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取微博舆情月度分布图
exports.GetWeiBoSentimentMonth = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = "SELECT DATE_FORMAT(created_date,'%m') months,COUNT(0) AS weibo_count FROM v_b_weibo_evaluation_customer where 1 = 1";
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and created_date >= ?";
            sqlParams.push(moment.utc(query.start_date).format());
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and created_date <= ?";
            sqlParams.push(moment.utc(query.end_date).format());
        }
        //正负极性
        if (query.level != undefined) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " GROUP BY DATE_FORMAT(created_date,'%m')";
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var dataArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (var j = 0; j < rows.length; j++) {
                dataArray[parseInt(rows[j].months) - 1] = rows[j].weibo_count;
            }
            console.log(dataArray);
            var result = {
                success: true,
                data: dataArray
            };
            return res.send(result);
        });
    });
};

//获取微博舆情每日分布图
exports.GetWeiBoSentimentDay = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var sqlQuery = parserSentimentDay(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date");

        sentimentDayExecute(sqlQuery, res);
    });
};

//获取微博舆情小时，分钟，秒分布图
exports.GetWeiBoSentiment = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var timeType = req.params.TimeType;
        var sqlQuery = parserSentiment(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", req, timeType);

        sentimentExecute(sqlQuery, res, timeType)
    });
};

//获取微博舆情和新闻每日分布图
exports.GetWeiBoAndNewsSentimentDay = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var weiboQuery = parserSentimentDay(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", req),
            newsQuery = parserSentimentDay(clientInfo, params, "v_b_news_evaluation_customer", "report_date", req);

        var sqlQuery = 'SELECT days,sum(cnt) cnt FROM ((' + weiboQuery + ') UNION ALL (' + newsQuery + ') ) tb GROUP BY days'

        sentimentDayExecute(sqlQuery, res)
    });
};

//获取微博舆情和新闻小时，分钟，秒分布图
exports.GetWeiBoAndNewsSentiment = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var timeType = req.params.TimeType;
        var weiboQuery = parserSentiment(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", req, timeType),
            newsQuery = parserSentiment(clientInfo, params, "v_b_news_evaluation_customer", "report_date", req, timeType);

        var sqlQuery = 'SELECT ' + timeType + ',sum(cnt) cnt FROM ((' + weiboQuery + ') UNION ALL (' + newsQuery + ') ) tb GROUP BY ' + timeType + '';

        sentimentExecute(sqlQuery, res, timeType)
    });
};

//获取微博舆情和新闻每日分布图
exports.GetWeiBoAndNewsSentimentScoreDay = function (req, res) {
    var params = utility.ParamsParse(req.body.params);
    var weiboQuery = parserSentimentScoreDay(params, "v_b_weibo_evaluation_customer", "created_date"),
        newsQuery = parserSentimentScoreDay(params, "v_b_news_evaluation_customer", "report_date");

    var sqlQuery = 'SELECT score1 as score,sum(cnt) cnt FROM ((' + weiboQuery + ') UNION ALL (' + newsQuery + ') ) tb GROUP BY score'

    pool.ExecuteQuery(sqlQuery, function (err, rows) {
        if (err) {

            console.log(err);
            res.send(500, err);
            return;
        }
        console.log(sqlQuery);
        var result = {
            success: true,
            data: rows
        };
        return res.send(result);
    });
};

//获取新闻舆情监听
exports.GetNewsSentimentMonitor = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var sql = 'select news_title,report_date,news_url,score,report_sites as source from v_b_news_evaluation_customer where 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and report_date >= ?";
            sqlParams.push(query.start_date);
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and report_date <= ?";
            sqlParams.push(query.end_date);
        }
        //正负极性
        if (utility.isValidData(query.level)) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " order by report_date desc ";
        if (utility.isValidData(query.topn) && !isNaN(query.topn)) {
            sql += " limit ?";
            sqlParams.push(parseInt(query.topn));
        }
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var result = {
                success: true,
                data: rows
            };
            return res.send(result);
        });
    });
};

//获取微博舆情监听
exports.GetWeiBoSentimentMonitor = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'select status_text as news_title,created_date as report_date, url as news_url,score,user_name as source from v_b_weibo_evaluation_customer where 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and created_date >= ?";
            sqlParams.push(query.start_date);
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and created_date <= ?";
            sqlParams.push(query.end_date);
        }
        //正负极性
        if (utility.isValidData(query.level)) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " order by created_date desc ";
        if (utility.isValidData(query.topn) && !isNaN(query.topn)) {
            sql += " limit ?";
            sqlParams.push(parseInt(query.topn));
        }
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var result = {
                success: true,
                data: rows
            };
            return res.send(result);
        });
    });
};

//获取微博舆情发布
exports.GetWeiBoSentimentPublish = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'select status_text as news_title,created_date as report_date, url as news_url,comments_count,reposts_count from v_b_weibo_evaluation_customer where 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and created_date >= ?";
            sqlParams.push(query.start_date);
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and created_date <= ?";
            sqlParams.push(query.end_date);
        }
        //正负极性
        if (utility.isValidData(query.level)) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " order by created_date desc ";
        if (utility.isValidData(query.topn) && !isNaN(query.topn)) {
            sql += " limit ?";
            sqlParams.push(parseInt(query.topn));
        }
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var result = {
                success: true,
                data: rows
            };
            return res.send(result);
        });
    });
};

//获取微博舆情转发TopN
exports.GetWeiBoHot = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //查询参数
        var sql = 'select status_text as news_title,created_date as report_date, url as news_url,comments_count,reposts_count,score,user_name as source from v_b_weibo_evaluation_customer where 1 = 1';
        var sqlParams = [];
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
//    if (utility.isValidData(query.field_name)) {
//        sql += " and field_name = ?";
//        sqlParams.push(query.field_name);
//    }
//    if (utility.isValidData(query.brand_name)) {
//        sql += " and brand_name = ?";
//        sqlParams.push(query.brand_name)
//    }
        if (utility.isValidData(query.start_date)) {
            sql += " and created_date >= ?";
            sqlParams.push(query.start_date);
        }
        if (utility.isValidData(query.end_date)) {
            sql += " and created_date <= ?";
            sqlParams.push(query.end_date);
        }
        //正负极性
        if (utility.isValidData(query.level)) {
            if (query.level == '1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
        }
        sql += " order by reposts_count desc ";
        if (utility.isValidData(query.topn) && !isNaN(query.topn)) {
            sql += " limit ?";
            sqlParams.push(parseInt(query.topn));
        }
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
                return;
            }
            var result = {
                success: true,
                data: rows
            };
            return res.send(result);
        });
    });

};

//获取微信列表
exports.GetWeiXinList = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var pagination = params.pagination; //分页参数
        var sqlParams = [];
        var sql = 'select * from v_b_weixin_evaluation_customer where 1 = 1';
        var currentToken = null;
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name = ?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.start_date)) {
            var utcTime = moment.utc(query.start_date).format();
            sql += " and post_date >= ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.end_date)) {
            var utcTime = moment.utc(query.end_date).add(1, 'days').format();
            sql += " and post_date < ?";
            sqlParams.push(utcTime);
        }
        if (utility.isValidData(query.article_title)) {
            sql += " and article_title like '%\\" + query.article_title + "%'";
        }
        if (query.status != undefined) {
            sql += " and status = ?";
            sqlParams.push(query.status);
        }
        if (query.is_sensitive != undefined) {
            sql += " and is_sensitive = ?";
            sqlParams.push(query.is_sensitive);
        }
        if (query.level != undefined) {//预警等级
            if (query.level == '1') {
                sql += " and score < " + BasicSettings.negativeValue;
            }
            else if (query.level == '0') {
                sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
            }
            else if (query.level == '-1') {
                sql += " and score > " + BasicSettings.positiveValue;
            }
        }
        var queryCountSql = sql.replace("*", "count(0) 'count'");
        //排序
        var orderColumnCount = 0;
        sql += " order by ";
        for (var order in orderBy) {
            orderColumnCount++;
            sql += (order + " " + orderBy[order] + ",");
        }
        if (orderColumnCount == 0) {
            sql = sql.replace(" order by ", "");
        } else {
            sql = sql.substring(0, sql.length - 1); //移除最后一个逗号
        }
        if (pagination.pagesize != undefined && pagination.pageindex != undefined && !isNaN(pagination.pagesize) && !isNaN(pagination.pageindex)) {
            sql += " limit ?,?";
            sqlParams.push(parseInt(pagination.pagesize) * parseInt(pagination.pageindex));
            sqlParams.push(parseInt(pagination.pagesize));
        }
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send(err);
            }
            var data = {
                success: true,
                totalcount: 0,
                rows: rows
            };
            pool.ExecuteQuery(queryCountSql, sqlParams, function (err, result) {
                console.log('查询到微信总行数：' + result[0].count);
                data.totalcount = result[0].count;
                res.send(data);
            });
        });
    });
};

//编辑微信
exports.EditWeiXinByID = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var query = params.query; //参数
        if (query.b_id == undefined) {
            res.send('缺少必须参数微信ID');
            return;
        }
        var checkIsExistsSql = "select count(0) as counts from b_weixin_evaluation_handle where b_id = " + query.b_id;
        pool.ExecuteQuery(checkIsExistsSql, function (err, result) {
            if (err) {
                res.send("服务器出错");
            }
            else {
                if (result[0].counts > 0) {//已经存在，则修改
                    var sql = 'update b_weixin_evaluation_handle set updated_date= now()';
                    var sqlParams = [];
                    if (utility.isValidData(query.status)) {
                        sql += " ,status = ?";
                        sqlParams.push(query.status);
                        if (clientInfo != null && clientInfo != false) {
                            sql += " ,handle_user = ?";
                            sqlParams.push(clientInfo.UserID);
                            sql += " ,handle_date = now()";
                        }
                    }
                    if (query.is_sensitive != undefined) {
                        sql += " ,is_sensitive = ?";
                        sqlParams.push(query.is_sensitive);
                    }
                    if (query.handle_id != undefined) {
                        sql += " ,handle_id = ?";
                        sqlParams.push(query.handle_id);
                    }
                    if (query.handle_type != undefined) {
                        sql += " ,handle_type = ?";
                        sqlParams.push(query.handle_type);
                    }
                    if (query.handle_remark != undefined) {
                        sql += " ,handle_remark = ?";
                        sqlParams.push(query.handle_remark);
                    }
                    if (clientInfo != null && clientInfo != false) {
                        sql += " ,updated_by = ?";
                        sqlParams.push(clientInfo.UserID);
                    }
                    sql += " where b_id = ?";
                    sqlParams.push(query.b_id);
                    pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
                        var affectedRows = rows.affectedRows;
                        if (err) {
                            var msg = 'update error';
                            console.error(err);
                            res.send({
                                'code': 500,
                                'state': 'failure',
                                'msg': msg,
                                'data': null
                            });
                            return;
                        }
                        res.send({
                            'code': 200,
                            'state': 'success',
                            'msg': '修改行数' + affectedRows,
                            'data': null
                        });
                    });
                }
                else {//不存在记录，则插入新数据
                    var insertSql = "insert into `b_weixin_evaluation_handle`(`b_id`,`STATUS`,`is_sensitive`,`updated_by`,`updated_date`,`handle_id`,`handle_type`,`handle_remark`,`handle_date`,`handle_user`)";
                    insertSql += "values (?,?,?,?,?,?,?,?,?,?)";
                    var obj = new Hanlde();
                    obj.b_id = query.b_id;
                    obj.status = query.status;
                    obj.is_sensitive = query.is_sensitive;
                    obj.updated_by = query.updated_by;
                    obj.updated_date = query.updated_date;
                    obj.handle_id = query.handle_id;
                    obj.handle_type = query.handle_type;
                    obj.handle_remark = query.handle_remark;
                    obj.handle_date = query.handle_date;
                    obj.handle_user = clientInfo.UserID;
                    var insertSqlParams = [obj.b_id, obj.status, obj.is_sensitive, obj.updated_by, obj.updated_date, obj.handle_id, obj.handle_type, obj.handle_remark, obj.handle_date, obj.handle_user];
                    pool.ExecuteQuery(insertSql, insertSqlParams, function (err, rows) {
                        if (err) {
                            res.send("服务端错误");
                            return;
                        }
                        else {
                            var affectedRows = rows.affectedRows;
                            if (affectedRows > 0) {
                                res.send({
                                    'code': 200,
                                    'state': 'success',
                                    'msg': '修改行数' + affectedRows,
                                    'data': null
                                });
                            }
                            else {
                                res.send('处理失败');
                            }

                        }
                    });
                }
            }
        });
    });
};
/*about emergencyplan*/

/*emergencyplan object*/
function EmergencyPlan() {
    this.id = 0;
    this.name = '';
    this.title = '';
    this.phone = '';
    this.content = '';
    this.url = '';
    this.contacts = '';
    this.createDt = '';
    this.updateBy = '';
    this.updateDt = '';
    this.state = '';
    this.classify = 1;
    this.polarity = 0;
    this.customer_name = '';
    this.field_name = '';
    this.brand_name = '';

};

/*get EmergencyPlan by id API method(get)*/
exports.GetEmergencyPlanById = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        if (!utility.isValidData(req.query.id)) {
            var msg = "please pass the emergencyPlan id!";
            console.error(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        var id = req.query.id;
        var sql = "select * from b_emergency_plan where is_deleted=0 and id=? and customer_name=?";
        var sql_params = [id, clientInfo.CustomName];
        pool.ExecuteQuery(sql, sql_params, function (error, result) {
            if (error) {
                console.log(error);
                res.send({
                    success: false,
                    msg: error
                });
                return;
            }
            if (result.length == 0) {
                var msg = 'did not find the data';
                console.log(msg);
                res.send({
                    success: false,
                    msg: msg
                });
                return;
            } else {
                res.send({
                    success: true,
                    data: result
                });
            }
        });
    });

};

/*get EmergencyPlan By Condition API method(post)*/
exports.GetEmergencyPlanByCondition = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var orderBy = params.orderby; //排序
        var query = params.query; //查询参数
        var pagination = params.pagination; //分页参数

        var sql = "select * from b_emergency_plan where is_deleted = 0 ";
        var sqlParams = [];
        if (utility.isValidData(query.title)) {
            sql += "and title like('%\\" + query.title + "%') ";
        }
        if (utility.isValidData(query.content)) {
            sql += "and content like('%\\" + query.content + "%') ";
        }
        if (utility.isValidData(query.contacts)) {
            sql += "and contacts like('%\\" + query.contacts + "%') ";
        }
        if (utility.isValidData(query.classify)) {
            sql += "and classify=?";
            sqlParams.push(query.classify);
        }
        if (utility.isValidData(query.polarity)) {
            sql += " and polarity =?";
            sqlParams.push(query.polarity);
        }
        if (clientInfo != null && clientInfo != false) {
            sql += " and customer_name =?";
            sqlParams.push(clientInfo.CustomName);
        }
        if (utility.isValidData(query.field_name)) {
            sql += " and field_name = ?";
            sqlParams.push(query.field_name);
        }
        if (utility.isValidData(query.brand_name)) {
            sql += " and brand_name = ?";
            sqlParams.push(query.brand_name);
        }
        var queryCountSql = sql.replace("*", "count(0) 'count'");
        //排序
        var orderColumnCount = 0;
        sql += " order by ";
        for (var order in orderBy) {
            orderColumnCount++;
            sql += (order + " " + orderBy[order] + ",");
        }
        if (orderColumnCount = 0) {
            sql = sql.replace(" order by ", "");
        } else {
            sql = sql.substring(0, sql.length - 1); //移除最后一个逗号
        }
        sql += " limit " + parseInt(pagination.pagesize) * parseInt(pagination.pageindex) + "," + pagination.pagesize;
        console.log(sql);
        pool.ExecuteQuery(sql, sqlParams, function (err, rows) {
            if (err) {
                console.error(err);
                res.send({
                    success: false,
                    msg: err
                });
                return;
            }
            var data = {
                success: true,
                totalcount: 0,
                rows: rows
            };
            pool.ExecuteQuery(queryCountSql, sqlParams, function (error, result) {
                if (error) {
                    console.log(error);
                    res.send({
                        succsss: false,
                        msg: error
                    });
                    return;
                }
                console.log(result[0].count);
                data.totalcount = result[0].count;
                res.send(data);
            });
        });
    });
};

/*add emergencyPlan API method(post)*/
exports.AddEmergencyPlan = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        if (req.body.title == undefined || req.body.title == "" || req.body.title == null) {
            var msg = "title can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        if (req.body.classify == undefined || req.body.classify == "" || req.body.classify == null) {
            var msg = "classify can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        if (req.body.polarity == undefined || req.body.polarity == "" || req.body.polarity == null) {
            var msg = "polarity can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        var obj = new EmergencyPlan();
        obj.title = req.body.title;
        obj.phone = req.body.phone;
        obj.content = req.body.content;
        obj.url = req.body.url;
        obj.contacts = req.body.contacts;
        obj.classify = req.body.classify;
        obj.polarity = req.body.polarity;
        if (utility.isValidData(req.body.field_name)) {
            obj.field_name = req.body.field_name;
        }
        if (utility.isValidData(req.body.brand_name)) {
            obj.brand_name = req.body.brand_name;
        }
        if (clientInfo != null && clientInfo != false) {
            obj.customer_name = clientInfo.CustomName;
        }
        var sql = "insert into b_emergency_plan(title,work_phone,content,url,contacts,createDt,classify,polarity,field_name,brand_name,customer_name) values(?,?,?,?,?,now(),?,?,?,?,?);";
        var sql_params = [obj.title, obj.phone, obj.content, obj.url, obj.contacts, obj.classify, obj.polarity, obj.field_name, obj.brand_name, obj.customer_name];
        console.log(sql);
        pool.ExecuteQuery(sql, sql_params, function (error, result) {
            if (error) {
                console.log(error);
                res.send({
                    success: false,
                    msg: error
                });
                return;
            }
            res.send({
                success: true
            });
        });
    });
};

/*delete emergencyPlan by id API method(get)*/
exports.DeleteEmergencyPlanByID = function (req, res) {
    var id = req.query.id;
    if (id == undefined || id == null || id == "") {
        var msg = "please chose the emergency_plan which you want to delete";
        console.log(msg);
        res.send({
            success: false,
            msg: msg
        });
        return;
    }
    var sql = "update b_emergency_plan set is_deleted=1 where id=?";
    var sql_params = id;
    pool.ExecuteQuery(sql, sql_params, function (error, result) {
        if (error) {
            console.log(error);
            res.send({
                success: false,
                msg: error
            });
            return;
        }
        res.send({
            success: true
        });
    });
};

/*update emergencyPlan API method(post)*/
exports.UpdateEmergencyPlan = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        if (!utility.isValidData(req.body.id)) {
            var msg = "please chose the update EmergencyPlan id!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        if (!utility.isValidData(req.body.title)) {
            var msg = "title can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        if (!utility.isValidData(req.body.classify)) {
            var msg = "classify can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        if (!utility.isValidData(req.body.polarity)) {
            var msg = "polarity can not empty!";
            console.log(msg);
            res.send({
                success: false,
                msg: msg
            });
            return;
        }
        var obj = new EmergencyPlan();
        var sqlParams = [];
        obj.id = req.body.id;
        obj.title = req.body.title;
        if (utility.isValidData(req.body.phone)) {
            obj.phone = req.body.phone;
        }
        if (utility.isValidData(req.body.content)) {
            obj.content = req.body.content;
        }
        obj.url = req.body.url;
        obj.contacts = req.body.contacts;
        obj.classify = req.body.classify;
        obj.polarity = req.body.polarity;
        obj.updateBy = clientInfo.CustomName;

        var sql = "update b_emergency_plan set title=?,work_phone=?,content=?,url=?,contacts=?,classify=?,polarity=?,updateDt=now(),updateBy=? where is_deleted=0 and id=?";
        var sql_params = [obj.title, obj.phone, obj.content, obj.url, obj.contacts, obj.classify, obj.polarity, obj.updateBy, obj.id ];
        pool.ExecuteQuery(sql, sql_params, function (error, result) {
            if (error) {
                console.log(error);
                res.send({
                    success: false,
                    msg: error
                });
                return;
            }
            res.send({
                success: true
            });
        });
    });

};

/*
 * 舆情结果汇总
 */
exports.GetWeiBoAndNewsSentimentReport = function (req, res) {
    GetTokenInformation(req, function (clientInfo) {
        var params = utility.ParamsParse(req.body.params);
        var weiboQuery = parserSentimentReport(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", "COUNT(1)", "", "", req, []),
            newsQuery = parserSentimentReport(clientInfo, params, "v_b_news_evaluation_customer", "report_date", "COUNT(1)", "", "", req, [], " and search_engine<>'bing_news_api_en' "),
            newwEnQuery = parserSentimentReport(clientInfo, params, "v_b_news_evaluation_customer", "report_date", "COUNT(1)", "", "", req, [], " and search_engine='bing_news_api_en' ");

        var countQuery = "SELECT (" + newsQuery + ") AS count_news,(" + weiboQuery + ") AS count_weibo,(" + newwEnQuery + ") AS count_newsen";

        var scoreQuery = "SELECT (" + weiboQuery + " AND score>" + BasicSettings.positiveValue + ")+(" + newsQuery + "  AND score>" + BasicSettings.positiveValue + ") AS POSCount,(" + weiboQuery + " AND score<" + BasicSettings.negativeValue + ")+(" + newsQuery + " AND score<" + BasicSettings.negativeValue + ") AS NegCount";

        var scoreFiled1 = "sourcetype,report_sites,totalScore, reportCount, url",
            scoreFiled2 = "'新闻' AS sourcetype, report_sites, SUM(negative_count) AS totalScore,SUM(1) reportCount,  MIN(news_url) AS url",
            scoreFiled3 = "'微博' AS sourcetype, user_name AS report_sites, SUM(negative_count) AS totalScore,SUM(1) reportCount,  MIN(url) AS url",
            scoreGroupOrder = " GROUP BY report_sites ORDER BY totalScore DESC LIMIT 10 ",
            scoreCondition = " AND score<" + BasicSettings.negativeValue;
        var weiboScoreQuery = parserSentimentReport(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", scoreFiled3, scoreCondition, scoreGroupOrder, req, ["user_name"]),
            newsScoreQuery = parserSentimentReport(clientInfo, params, "v_b_news_evaluation_customer", "report_date", scoreFiled2, scoreCondition, scoreGroupOrder, req, ["report_sites"]);

        var mediaQuery = "SELECT " + scoreFiled1 + " FROM (" + newsScoreQuery + ") a UNION ALL SELECT " + scoreFiled1 + " FROM (" + weiboScoreQuery + ") a";

        var sensitiveField1 = "sourcetype,report_date,report_sites,title, content, url",
            sensitiveField2 = "'新闻' AS sourcetype,report_date, report_sites,news_title AS title,summary AS content,news_url AS url",
            sensitiveField3 = "'微博' AS sourcetype, created_date AS report_date,user_name AS report_sites, '' AS title,status_text AS content ,url",
            sensitiveCondition = " AND is_sensitive = 1 ",
            sensitiveGroupOrderWb = " ORDER BY created_date DESC LIMIT 50 ",
            sensitiveGroupOrderNew = " ORDER BY report_date DESC LIMIT 50 ";

        var weiboSensitiveQuery = parserSentimentReport(clientInfo, params, "v_b_weibo_evaluation_customer", "created_date", sensitiveField3, sensitiveCondition, sensitiveGroupOrderWb, req, []),
            newsSensitiveQuery = parserSentimentReport(clientInfo, params, "v_b_news_evaluation_customer", "report_date", sensitiveField2, sensitiveCondition, sensitiveGroupOrderNew, req, []);

        var sensitiveQuery = "SELECT " + sensitiveField1 + " FROM (" + newsSensitiveQuery + ") a UNION ALL SELECT " + sensitiveField1 + " FROM (" + weiboSensitiveQuery + ") a";

        async.parallel({
                count: function (cb) {
                    QueryExecute(countQuery, cb);
                },
                score: function (cb) {
                    QueryExecute(scoreQuery, cb);
                },
                media: function (cb) {
                    QueryExecute(mediaQuery, cb);
                },
                sensitive: function (cb) {
                    QueryExecute(sensitiveQuery, cb);
                }
            },
            function (err, result) {
                var resultObj = utility.jsonResult(err, {count: result.count, score: result.score, media: result.media, sensitive: result.sensitive});
                res.json(resultObj);
            }
        );
    });

};

var path = require('path');
exports.GetLastAppFile = function (req, res) {
    var version = req.body.versionCode;
    var appPath = path.normalize(__dirname + '/..') + '\\app\\android';
    var domainUrl = req.get("Host");
    if (domainUrl && domainUrl.indexOf("http：//") < 0) {
        domainUrl = "http://" + domainUrl;
    }
    utility.GetLastAppFile(appPath, version, domainUrl, function (err, result) {
        console.log(result);
        res.json(result);
    });
};

function parserSentimentReport(clientInfo, params, table, createdate, filed, condition, groupby, req, notNullFieldArray, search_engine) {
    var query = params.query; //查询参数
    var sql = "SELECT " + filed + " FROM " + table + " where 1 = 1";

    if (clientInfo != null && clientInfo != false) {
        sql += " and customer_name =" + pool.mysql.escape(clientInfo.CustomName);
    }
    if (notNullFieldArray) {
        for (var item in notNullFieldArray) {
            sql += " and " + notNullFieldArray[item] + "<>'[]' ";
        }
    }

    if (search_engine) {
        sql += search_engine;
    }
    //sql += " and  customer_name='昆山'";

    if (query.start_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d') >=DATE_FORMAT(" + pool.mysql.escape(query.start_date) + ",'%Y-%m-%d')";
    }
    if (query.end_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d')<=DATE_FORMAT(" + pool.mysql.escape(query.end_date) + ",'%Y-%m-%d')";
    }
    sql += condition + groupby;

    return sql;
}

function parserSentimentDay(clientInfo, params, table, createdate, req) {
    var query = params.query; //查询参数
    var sql = "SELECT DATE_FORMAT(" + createdate + ",'%Y-%m-%d') days,COUNT(0) AS cnt FROM " + table + " where 1 = 1";
    var sqlParams = [];
    if (clientInfo != null && clientInfo != false) {
        sql += " and customer_name =" + pool.mysql.escape(clientInfo.CustomName);
    }
    if (query.field_name && query.field_name != undefined) {
        sql += " and field_name =" + pool.mysql.escape(query.field_name);
    }
    if (query.brand_name && query.brand_name != undefined) {
        sql += " and brand_name =" + pool.mysql.escape(query.brand_name);
    }
    if (query.start_date && query.start_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d') >=DATE_FORMAT(" + pool.mysql.escape(query.start_date) + ",'%Y-%m-%d')";
    }
    if (query.end_date && query.end_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d') <=DATE_FORMAT(" + pool.mysql.escape(query.end_date) + ",'%Y-%m-%d')";
    }
    //正负极性
    if (utility.isValidData(query.level)) {
        if (query.level == '1') {
            sql += " and score > " + BasicSettings.positiveValue;
        }
        else if (query.level == '0') {
            sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
        }
        else if (query.level == '-1') {
            sql += " and score < " + BasicSettings.negativeValue;
        }
    }
    sql += " GROUP BY DATE_FORMAT(" + createdate + ",'%Y-%m-%d')";

    return sql;
}

//小时，分钟和秒力度
function parserSentiment(clientInfo, params, table, createdate, req, timeType) {
    var query = params.query; //查询参数
    var dFormat = "%Y-%m-%d-%H"; //小时
    switch (timeType) {
        case "hour":
            dFormat = "%Y-%m-%d-%H";
            break;
        case "minute":
            dFormat = "%Y-%m-%d-%H-%i";
            break;
        case "second":
            dFormat = "%Y-%m-%d-%H-%i-%s";
            break;
        default:
            break;
    }

    var sql = "SELECT DATE_FORMAT(" + createdate + ",'" + dFormat + "') " + timeType + ",COUNT(0) AS cnt FROM " + table + " where 1 = 1";
    if (clientInfo != null && clientInfo != false) {
        sql += " and customer_name =" + pool.mysql.escape(clientInfo.CustomName);
    }
    if (query.field_name && query.field_name != undefined) {
        sql += " and field_name =" + pool.mysql.escape(query.field_name);
    }
    if (query.brand_name && query.brand_name != undefined) {
        sql += " and brand_name =" + pool.mysql.escape(query.brand_name);
    }
    if (query.start_date && query.start_date != undefined) {
        var start_date = moment(query.start_date).format();
        sql += " and DATE_FORMAT(" + createdate + ",'" + dFormat + "') >=DATE_FORMAT(" + pool.mysql.escape(start_date) + ",'" + dFormat + "')";
    }
    if (query.end_date && query.end_date != undefined) {
        var end_date = moment(query.end_date).format();
        sql += " and DATE_FORMAT(" + createdate + ",'" + dFormat + "') <=DATE_FORMAT(" + pool.mysql.escape(end_date) + ",'" + dFormat + "')";
    }
    //正负极性
    if (utility.isValidData(query.level)) {
        if (query.level == '1') {
            sql += " and score > " + BasicSettings.positiveValue;
        }
        else if (query.level == '0') {
            sql += " and score >=" + BasicSettings.negativeValue + " and score <= " + BasicSettings.positiveValue;
        }
        else if (query.level == '-1') {
            sql += " and score < " + BasicSettings.negativeValue;
        }
    }
    sql += " GROUP BY DATE_FORMAT(" + createdate + ",'" + dFormat + "')";

    return sql;
}

function parserSentimentScoreDay(params, table, createdate) {
    var query = params.query; //查询参数
    var sql = "SELECT if(score > 0,1,(if(score = 0, 0, - 1))) score1,COUNT(0) AS cnt FROM " + table + " where 1 = 1";

    if (query.customer_name && query.customer_name != undefined) {
        sql += " and customer_name =" + pool.mysql.escape(query.customer_name);
    }
    if (query.start_date && query.start_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d') >=DATE_FORMAT(" + pool.mysql.escape(query.start_date) + ",'%Y-%m-%d')";
    }
    if (query.end_date && query.end_date != undefined) {
        sql += " and DATE_FORMAT(" + createdate + ",'%Y-%m-%d') <=DATE_FORMAT(" + pool.mysql.escape(query.end_date) + ",'%Y-%m-%d')";
    }

    sql += " GROUP BY score1";

    return sql;
}

function sentimentDayExecute(sqlQuery, res) {
    console.log(sqlQuery);
    pool.ExecuteQuery(sqlQuery, function (err, rows) {
        if (err) {
            console.log(err);
            res.send(500, err);
        }
        else {
            var dataArray = [];
            for (var j = 0; j < rows.length; j++) {
                var time = rows[j].days.split('-');
                var year = time[0];
                var month = time[1] - 1;
                var day = time[2];

                dataArray.push([Date.UTC(year, month, day), rows[j].cnt]);
            }

            var result = {
                success: true,
                data: dataArray
            };
            res.send(result);
        }
    });
}

function sentimentExecute(sqlQuery, res, timeType) {
    console.log(sqlQuery);
    pool.ExecuteQuery(sqlQuery, function (err, rows) {
        if (err) {
            console.log(err);
            res.send(500, err);
            return;
        }

        var dataArray = [];
        for (var j = 0; j < rows.length; j++) {
            var time = rows[j][timeType].split('-');
            var year = time[0];
            var month = time[1] - 1;
            var day = time[2];
            var hour = 0,
                minute = 0,
                second = 0;
            switch (timeType) {
                case "hour":
                    hour = time[3];
                    break;
                case "minute":
                    hour = time[3];
                    minute = time[4];
                    break;
                case "second":
                    hour = time[3];
                    minute = time[4];
                    second = time[5];
                    break;
                default:
                    break;
            }
            var date = new Date(year + '-' + (month + 1) + '-' + day + ' ' + hour + ':' + minute + ':' + second);
            dataArray.push([Date.parse(date), rows[j].cnt]);
        }
        var result = {
            success: true,
            data: dataArray
        };
        return res.send(result);
    });
}

function QueryExecute(sqlQuery, cb) {
    pool.ExecuteQuery(sqlQuery, function (err, data) {
        console.log(sqlQuery);
        var re = utility.jsonResult(err, data);
        cb(err, re);
    });
}

function GetTokenInformation(req, next) {
    var clientInfo = req.cookies.clienttoken //点击了记住我
        //|| req.session.AuthenticationToken//未点击记住我
        || req.headers.authentication;//来自Mobile

    if (typeof(clientInfo) == 'object') {
        next(clientInfo);
    }
    else if (typeof (clientInfo) == "string") {
        TokenVerification.GetUserInformationByToken(clientInfo, function (isFetch, clientInfo) {
            if (isFetch) {
                next(clientInfo);
            }
        });
    }
}