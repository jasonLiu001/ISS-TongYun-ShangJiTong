/// <reference path="../jquery.cookie.js" />
/// <reference path="../common/tools.js" />
/*与API交互接口*/
(function () {
    var domain = "";
    window.baseTools = {
        getSecurityCode: function () {//获取验证码
            var self = this;
            var url = domain + "/api/authentication/verification?" + Math.random();
            return url;
        },
        checkLogin: function (parameters, callback) {//检验登录
            var self = this;
            var url = domain + "/api/authentication/login";
            self.LoginFun(url, parameters, callback);
        },
        loginOut: function (parameters, callback) {
            var self = this;
            var url = domain + "/api/authentication/logout";
            location.href = url;
        },
        getMoudlle: function (parameters, callback) {//获取权限
            var self = this;
            var url = domain + "/api/manage/GetPermission";
            self.getData(url, parameters, callback);
        },
        getUserById: function (parameters, callback) {//获取用户
            var self = this;
            var url = domain + "/api/manage/GetUserById";
            self.getData(url, parameters, callback);
        },
        getUserList: function (parameters, callback) {//获取用户列表
            var self = this;
            var url = domain + "/api/manage/GetUserList";
            parameters = { params: parameters };
            self.getData(url, parameters, callback);
        },
        addUser: function (parameters, callback) {//添加用户
            var self = this;
            var path = "/api/manage/SaveUser";
            self.editData(path, parameters, callback);
        },
        editUser: function (parameters, callback) {//编辑用户
            var self = this;
            var path = "/api/manage/SaveUser";
            self.editData(path, parameters, callback, "put");
        },
        updatePassword: function (parameters, callback) {//修改密码
            var self = this;
            var path = "/api/manage/UpdatePassword";
            self.editData(path, parameters, callback);
        },
        resetPassword: function (parameters, callback) {//修改密码
            var self = this;
            var path = "/api/manage/ResetPassword";
            self.editData(path, parameters, callback);
        },
        updateUserInformation: function (parameters, callback) {//修改密码
            var self = this;
            var path = "/api/manage/UpdateUserInformation";
            self.editData(path, parameters, callback);
        },
        deleteUser: function (parameters, callback) {//删除用户
            var self = this;
            var path = "/api/manage/SaveUser";
            self.editData(path, parameters, callback, "delete");
        },
        getGrouptById: function (parameters, callback) {//获取组
            var self = this;
            var url = domain + "/api/manage/GetGroupById";
            self.getData(url, parameters, callback);
        },
        getGroupbyCondition: function (parameters, callbac) {//获取组通过查询条件
            var self = this;
            var url = domain + "/api/manage/GetGroupByCondition";
            parameters = { params: parameters };
            self.getData(url, parameters, callback);
        },
        getGroupList: function (parameters, callback) {//获取用户
            var self = this;
            var url = domain + "/api/manage/GetGroupList";
            parameters = { params: parameters };
            self.getData(url, parameters, callback);
        },
        addGroup: function (parameters, callback) {//添加用户
            var self = this;
            var path = "/api/manage/SaveGroup";
            self.editData(path, parameters, callback);
        },
        editGroup: function (parameters, callback) {//编辑组
            var self = this;
            var path = "/api/manage/SaveGroup";
            self.editData(path, parameters, callback, "put");
        },
        deleteGroup: function (parameters, callback) {//删除组
            var self = this;
            var path = "/api/manage/SaveGroup";
            self.editData(path, parameters, callback, "delete");
        },
        getNews: function (parameters, callback) {//获取新闻舆情
            var self = this;
            var url = domain + "/api/midware/GetNewsList";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        getEnNews: function (parameters, callback) {//获取En新闻舆情
            console.log('获取En新闻舆情');
            var self = this;
            var url = domain + "/api/midware/GetEnNewsList";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        getWeibo: function (parameters, callback) {//获取微博舆情
            console.log('获取微博舆情');
            var self = this;
            var url = domain + "/api/midware/GetWeiBoList";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        getWeixin: function (parameters, callback) {//获取微信舆情
            console.log('获取微博舆情');
            var self = this;
            var url = domain + "/api/midware/GetWeiXinList";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        editNews: function (parameters, callback) {//编辑新闻
            var self = this;
            var path = "/api/midware/EditNewsByID";
            parameters = { params: JSON.stringify(parameters) };
            self.editData(path, parameters, callback);
        },
        editWeiBo: function (parameters, callback) {//编辑微博
            var self = this;
            var path = "/api/midware/EditWeiBoByID";
            parameters = { params: JSON.stringify(parameters) };
            self.editData(path, parameters, callback);
        },
        editWeixin: function (parameters, callback) {//编辑微信
            var self = this;
            var path = "/api/midware/EditWeiXinByID";
            parameters = { params: JSON.stringify(parameters) };
            self.editData(path, parameters, callback);
        },
        addEmergency: function (parameters, callback) {//添加应急方案
            var self = this;
            var path = "/api/midware/AddEmergencyPlan";
            self.editData(path, parameters, callback);
        },
        deleteEmergency: function (parameters, callback) {//删除应急方案
            var self = this;
            var path = "/api/midware/DeleteEmergencyPlanByID";
            self.editData(path, parameters, callback, "get");
        },
        editEmergency: function (parameters, callback) {//编辑应急方案
            var self = this;
            var path = "/api/midware/UpdateEmergencyPlan";
            self.editData(path, parameters, callback);
        },
        getEmergency: function (parameters, callback) {//获取应急预案
            var self = this;
            var url = domain + "/api/midware/GetEmergencyPlanByCondition";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        getPermission: function (parameters, callback) {//获取权限
            var self = this;
            var url = domain + "/api/manage/GetModulePermissionByToken";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback, 'get');
        },
        getSentimentReport: function (parameters, callback) {//舆情汇总报表
            var self = this;
            var url = domain + "/api/midware/GetWeiBoAndNewsSentimentReport";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        //room14
        getHotWords: function (parameters, callback) {//热词
            var self = this;
            var url = domain + "/api/midware/GetHotWords";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        getSentimentLinear: function (parameters, callback, timeoutCallback) {//指数 
            var self = this;
            var url = domain + "/api/midware/GetSentimentLinear";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback, null, timeoutCallback);
        },
        GetNewsSentimentPie: function (parameters, callback) {//新闻饼图 
            var self = this;
            var url = domain + "/api/midware/GetNewsSentimentPie";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetNewsAndWeiBoSentimentPie: function (parameters, callback) {//新闻和微博饼图 
            var self = this;
            var url = domain + "/api/midware/GetNewsAndWeiBoSentimentPie";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetWeiBoSentimentPie: function (parameters, callback) {//微博饼图 
            var self = this;
            var url = domain + "/api/midware/GetWeiBoSentimentPie";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetNewsSentimentMonth: function (parameters, callback) {//新闻月度统计图 
            var self = this;
            var url = domain + "/api/midware/GetNewsSentimentMonth";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetWeiBoSentimentMonth: function (parameters, callback) {//微博月度统计图 
            var self = this;
            var url = domain + "/api/midware/GetWeiBoSentimentMonth";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetNewsSentimentMonitor: function (parameters, callback) {//新闻监听 
            var self = this;
            var url = domain + "/api/midware/GetNewsSentimentMonitor";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetWeiBoSentimentMonitor: function (parameters, callback) {//微博监听
            var self = this;
            var url = domain + "/api/midware/GetWeiBoSentimentMonitor";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetWeiBoSentimentPublish: function (parameters, callback) {//微博发布
            var self = this;
            var url = domain + "/api/midware/GetWeiBoSentimentPublish";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },

        GetWeiBoAndNewsSentiment: function (parameters, callback) {//首页获取负面趋势（小时）
            var self = this;
            var url = domain + "/api/midware/GetWeiBoAndNewsSentiment/hour";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        GetWeiBoHot: function (parameters, callback) {//热点播报
            var self = this;
            var url = domain + "/api/midware/GetWeiBoHot";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },

        GetWeiBoAndNewsSentimentDay: function (parameters, callback) {//关注度曲线（首页获取负面趋势（周））
            var self = this;
            var url = domain + "/api/midware/GetWeiBoAndNewsSentimentDay";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },

        editData: function (path, parameters, callback, type) {//编辑数据
            var self = this;
            var url = domain + path;
            self.setData(url, parameters, callback, type);
        },
        getData: function (url, options, callback, type, timeoutCallback) {//获取数据
            try {
                CheckCookies();

                //$(document).queue(function () { 
                var jqXhr = $.ajax({
                    url: url,
                    dataType: "json",
                    async: true,
                    cache: false,
                    timeout: 1 * 60 * 1000,
                    data: options || { pageIndex: 1, pageSize: 5 },
                    type: type || 'post',
                    beforeSend: function(req){
                        var token=$.cookie("authentication");
                        if(token){
                            req.setRequestHeader("authentication",token);
                        }
                    },
                    success: function (result) {
                        if (result) {
                            callback(result);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        //  alert('error:' + textStatus + ',' + errorThrown);
                    },
                    complete: function (XMLHttpRequest, status) { //请求完成后最终执行参数
                        if (status == 'timeout') {//超时,status还有success,error等值的情况
                            if (timeoutCallback != null) {
                                console.log(status);
                                timeoutCallback();
                            }
                        }
                    }
                });
                if (jqXhr) {
                    //jqXhr.abort();
                }
                //$(this).dequeue();
                // });
            } catch (e) {
                alert(e.message);
            }
        },

        /*网站管理(数据源管理)*/
        GetDatasource: function (parameters,callback) {//获取数据源列表
            var self = this;
            var url = domain + "/api/midware/";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url,parameters,callback);
        },
        EditDatasourceById: function () {//编辑数据源列表
            var self = this;
            var url = domain + "/api/midware/";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },
        DelDatasourceById: function () {//删除数据源列表
            var self = this;
            var url = domain + "/api/midware/";
            parameters = { params: JSON.stringify(parameters) };
            self.getData(url, parameters, callback);
        },


        LoginFun: function (url, options, callback, type, timeoutCallback) {//获取数据
            try {
                //$(document).queue(function () { 
                var jqXhr = $.ajax({
                    url: url,
                    dataType: "json",
                    async: true,
                    cache: false,
                    timeout: 1 * 60 * 1000,
                    data: options || { pageIndex: 1, pageSize: 5 },
                    type: type || 'post',
                    success: function (result) {
                        if (result) {
                            callback(result);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        //  alert('error:' + textStatus + ',' + errorThrown);
                    },
                    complete: function (XMLHttpRequest, status) { //请求完成后最终执行参数
                        if (status == 'timeout') {//超时,status还有success,error等值的情况
                            if (timeoutCallback != null) {
                                console.log(status);
                                timeoutCallback();
                            }
                        }
                    }
                });
                if (jqXhr) {
                    //jqXhr.abort();
                }
                //$(this).dequeue();
                // });
            } catch (e) {
                alert(e.message);
            }
        },
        setData: function (url, options, callback, type) {//设置数据
            try {
                $.ajax({
                    url: url,
                    dataType: "json",
                    data: options || {},
                    type: type || 'post',
                    jsonpCallback: 'callback',
                    success: function (result) {
                        if (result && callback) {
                            callback(result);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        alert('error:' + textStatus + ',' + errorThrown);
                    }
                });
            } catch (e) {
                alert(e.message);
            }
        },
        translateWeiBoSource: function (str) {//微博转换
            var result = "";
            switch (str) {
                case "sina_weibo":
                    result = "新浪";
                    break;
                case "163_weibo":
                    result = "网易";
                    break;

            }
            return result;
        }
    };

    window.global = {
        UserInfo: {
            UserName: $.cookie(cookieInfo.uname) || "",
            CustomerName: $.cookie(cookieInfo.cname) || "",
            UserID: $.cookie(cookieInfo.uid) || "",
            ClientToken: $.cookie(cookieInfo.token) || "",
            TokenId: null
        },
        CustormerLogo: {
            "昆山": "昆山市",
            "洪泽": "洪泽县",
            "南通": "南通市",
            "无锡": "无锡市",
            "盐城": "盐城市",
            "哈尔滨": "哈尔滨市",
            "烟台": "烟台市",
            "佛山": "佛山市",
            "东莞": "东莞市",
            "北京": "北京市",
            "软通动力": "软通动力"
            //"昆山": "/img/default/LogoImg/logo.png",
            //"洪泽": "/img/default/LogoImg/logo.png",
            //"南通": "/img/default/LogoImg/logo.png",
            //"无锡": "/img/default/LogoImg/logo.png",
            //"盐城": "/img/default/LogoImg/logo.png",
            //"哈尔滨": "/img/default/LogoImg/logo.png",
            //"烟台": "/img/default/LogoImg/logo.png",
            //"佛山": "/img/default/LogoImg/logo.png"
        }
    };
})();
//验证登录超时（UI）
function CheckCookies() {
    var token = $.cookie(cookieInfo.token);
    var userid = $.cookie(cookieInfo.uid);
    if (token == null || userid == null) {
        window.location.href = "/login.html";
    }
}
