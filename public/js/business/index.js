﻿/// <reference path="base.js" />
/// <reference path="../jQuery.js" />
/// <reference path="../iChart.js" />
var homeIntervalTime = 1000 * 60 * 5;
var intervalHot;
var intervalData;

$(function () {

    GetAllData();
    ClearDataTimer();
    intervalData = setInterval(function () {
        GetAllData();
        UpdateNewsAndWeiboDate();
    }, homeIntervalTime);

    homeDataTimer.push(intervalData);

    NewsMonitor();
    WeiboMonitor();
    $(".index_title span a").click(function () {
        GoTargetPage($(this).attr("href"));
    });
});
function GetAllData() {
    TodayUpdate();
    TodayDownSide();
    WeekDownSide();
    TodayHotWeibo();
}
//今日更新
function TodayUpdate() {

    var today = new Date();
    var parameters = {
        query: {
            start_date: formatDate(today),
            end_date: formatDate(today)
        }
    };
    $("#today_negative,#today_update").html("加载中...");
    window.baseTools.getSentimentReport(parameters, function (result) {

        if (result && result.Result) {
            var newsCount = result.Data.count.Data[0].count_news;
            var weiboCount = result.Data.count.Data[0].count_weibo;
            var luntanCount = result.Data.count.Data[0].count_newsen;
            var sumCount = newsCount + weiboCount + luntanCount;
            var negCount = result.Data.score.Data[0].NegCount;
            var posCount = result.Data.score.Data[0].POSCount
            var neuCount = sumCount - negCount - posCount;
            //百分比
            var newsPercent = ((newsCount / sumCount) * 100).toFixed(2);
            var weiboPercent = ((weiboCount / sumCount) * 100).toFixed(2);
            var luntanPercent = ((luntanCount / sumCount) * 100).toFixed(2);
            var posPercent = ((posCount / sumCount) * 100).toFixed(2);
            var negPercent = ((negCount / sumCount) * 100).toFixed(2);
            var neuPercent = ((neuCount / sumCount) * 100).toFixed(2);

            $("#today_negative").empty().attr({ "data-text": negCount, "data-percent": negPercent }).circliful();
            $("#today_update").empty().attr({ "data-text": posCount, "data-percent": posPercent }).circliful();
        }
    });
}

function getElemByTime(sArr, curTime) {
    var curElem;
    for (var i = 0; i < sArr.length; i++) {
        if (sArr[i][0] == curTime) {
            curElem = sArr[i];
            break;
        }
    }
    return curElem;
}
//今日负面趋势
function TodayDownSide() {
    //今天的0秒和 最后一秒

    var curDate = new Date();

    var _curYear = curDate.getFullYear();
    var _curMonth = curDate.getMonth();
    var _curDate = curDate.getDate();
    var _curHour = curDate.getHours();

    var newDate = new Date(_curYear, _curMonth, _curDate, _curHour);


    var start_date = new Date(newDate.setHours(newDate.getHours() - 11));

    var end_date = new Date(_curYear, _curMonth, _curDate, _curHour);;

    //  console.log(start_date+"000000"+end_date);
    // var start_date = mDate
    window.baseTools.GetWeiBoAndNewsSentiment({
        query: {
            start_date: start_date,
            end_date: end_date,
            timeType: 'hour',
            level: -1
        }
    }, function (result) {
        if (result && result.success) {
            var sDate = [];// result.data;

            var cDate = start_date;

            var _start = start_date;
            var _end = end_date;

            var h = new Date(_start).getHours();

            while (_start <= _end) {

                var resCur = getElemByTime(result.data, +_start);
                if (resCur) {
                    sDate.push(resCur);
                }
                else {
                    sDate.push([+_start, 0]);
                }
                //sDate.push([+_start, 0]);
                if (h < 24) {
                    h += 1;
                }
                else {
                    h = 1
                }
                _start = new Date(cDate.setHours(h));
            }

            for (var i = 0; i < sDate.length; i++) {
                var utc = new Date(sDate[i][0]);
                sDate[i][0] = Date.UTC(utc.getFullYear(), utc.getMonth(), utc.getDate(), utc.getHours());
            }

            var chartSubTitle = "截止到" + (_curMonth + 1) + "月" + _curDate + "日" + _curHour + "时";
            $("#negative-conbg-today").indexChart({ subTitle: chartSubTitle, data: sDate });
        }
    });

}

function findWeek(sArr, currElem) {
    for (var m = 0; m < sArr.length; m++) {
        if (currElem == sArr[m][0]) {
            return true;
        }
    }
    return false;
}
//一周负面趋势
function WeekDownSide() {
    //var dataday = [[Date.UTC(2014, 08, 04), 210], [Date.UTC(2014, 08, 05), 326], [Date.UTC(2014, 08, 06), 310], [Date.UTC(2014, 08, 07), 290], [Date.UTC(2014, 08, 08), 150], [Date.UTC(2014, 08, 09), 230], [Date.UTC(2014, 08, 10), 110]];
    var curdate = new Date();
    var _startDay = new Date();
    var _endDay = new Date();


    //周一到周五
    var startdate = new Date(curdate.setDate(curdate.getDate() - 6));
    var enddate = new Date();
    //var startdate = _startDay.setDate(curdate.getDate()-curdate.getDay()+1);
    //var enddate = _endDay.setDate(curdate.getDay() + 6);

    //console.log(new Date(startdate) + "----" +new Date(enddate));
    window.baseTools.GetWeiBoAndNewsSentimentDay({
        query: {
            start_date: startdate,
            end_date: enddate,
            level: -1
        }
    }, function (result) {
        if (result && result.success) {
            var cDate = new Date(), sDate = [];
            var H = 8;
            if (result.data.length) {
                H = new Date(result.data[0][0]).getHours();
            }
            for (var i = 0; i < 7; i++) { //7天
                var res = findWeek(result.data, +new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate() - i, H));//i代表这个小时
                // console.log('hss',res);
                if (!res) {
                    var n = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate() - i, H);//若是周几则使用day几号+时分秒。。。(i,时，分，秒)
                    sDate.push([+n, 0, n]);
                }
            }

            for (var m = 0; m < result.data.length; m++) {
                result.data[m].push('old', new Date(result.data[m][0]))
                sDate.push(result.data[m]);
            }
            sDate.sort(function (a, b) {
                return a[0] - b[0];
            })
            //console.log('sDate:', sDate);//sDate是最终结果。

            $("#negative-conbg-week").indexChart({
                chartType: 'column', data: sDate
            });

            return false;
        }
    });


}
//热点播报
function TodayHotWeibo() {

    var curDate = new Date();

    var startDate = new Date(curDate.setDate(curDate.getDate() - 7));
    window.baseTools.GetWeiBoHot({
        query: {
            start_date: startDate,
            //end_date: enddate,
            //level: -1,
            topn: 30
        }
    }, function (result) {
        if (result && result.success) {
            $("#content-news ul").empty();
            $.each(result.data, function (i, o) {
                var reportCount = 0;
                reportCount = o.reposts_count == null ? 0 : o.reposts_count;
                $("#content-news ul").append("<li><a target='_blank' href='" + o.news_url + "' title='" + o.news_title + "'><span class='fl-contenthot'>" + o.news_title + "</span></a></li>");
            });
            MoveLi();
        }
    });

}
//清除移动Timer
function ClearULTimer() {
    for (var i = 0; i < homeULTimer.length; i++) {
        clearInterval(homeULTimer[i]);
    }
    homeULTimer = [];
}

//清除数据更新Timer
function ClearDataTimer() {
    for (var i = 0; i < homeDataTimer.length; i++) {
        clearInterval(homeDataTimer[i]);
    }
    homeDataTimer = [];
}


function MoveLi() {
    var allwidth = 0;
    $("#content-news ul li").each(function () {
        allwidth += $(this).width() + 150;
    });

    $("#content-news").width(allwidth);
    $("#content-news ul").width(allwidth);

    ClearULTimer();
    intervalHot = setInterval(autoMove, 30);
    homeULTimer.push(intervalHot);

    function autoMove() {
        var firstWidth = $("#content-news ul li:first").width() + 30;

        if (parseInt($("#content-news ul").css("left")) <= -firstWidth) {

            var firstLi = $("#content-news ul li:first").html();
            if (firstLi) {
                $("#content-news ul li:first").remove();
                $("#content-news ul").append("<li>" + firstLi + "</li>");
                $("#content-news ul").css("left", 0);
            }
        }
        else {
            $("#content-news ul").css("left", "-=1");
        }
    }
    $("#content-news").unbind('mouseover').mouseover(function () {
        ClearULTimer();
    })
    $("#content-news").unbind('mouseout').mouseout(function () {
        homeULTimer.push(setInterval(autoMove, 30));
    })
}
//新闻监听
function NewsMonitor() {
    var newsViewModel = function () {
        var self = this;
        self.news = ko.observableArray([]);
        self.lastInterest = ko.observable();
        self.filterFun = function (plevel) {
            $("#newsFilter button").removeClass("currentlevel");
            $("#newsFilter button[level='" + plevel + "']").addClass("currentlevel");
            BeforeLoad("newsMonitor");
            window.baseTools.GetNewsSentimentMonitor({
                query: {
                    level: plevel,
                    topn: 10
                }
            }, function (result) {
                if (result && result.success) {
                    if (result.data.length > 0) {
                        self.news(result.data);
                        endLoad("newsMonitor");
                    } else {
                        //console.log(result.data)
                        endLoad("newsMonitor");
                        alertInformation("newsMonitor");
                    }

                }
            });
        };
        self.filterFun(-1);
    }
    var newsVModel = new newsViewModel();
    console.log('ko',ko);
    ko.applyBindings(newsVModel, document.getElementById("newsMonitorContainer"));
}
//微博监听
function WeiboMonitor() {

    var weiboViewModel = function () {
        var self = this;
        self.weibo = ko.observableArray([]);

        self.filterFun = function (plevel) {
            $("#weiboFilter button").removeClass("currentlevel");
            $("#weiboFilter button[level='" + plevel + "']").addClass("currentlevel");

            BeforeLoad("weiboMonitor");
            window.baseTools.GetWeiBoSentimentMonitor({
                query: {
                    level: plevel,
                    topn: 10
                }
            }, function (result) {
                if (result && result.success) {
                    if (result.data.length > 0) {
                        self.weibo(result.data);
                        endLoad("weiboMonitor");
                    } else {
                        endLoad("weiboMonitor");
                        alertInformation("weiboMonitor");
                    }


                }
            });

        };
        self.filterFun(-1);
    }
    ko.applyBindings(new weiboViewModel(), document.getElementById("weiboMonitorContainer"));

}

function UpdateNewsAndWeiboDate() {
    $("#newsFilter button.currentlevel,#weiboFilter button.currentlevel").click();
}
//加载样式
function BeforeLoad(tbid) {
    $("#" + tbid + " tfoot td").empty().addClass("loadingdata");
    $("#" + tbid + " tbody").hide();
}
function endLoad(tbid) {
    $("#" + tbid + " tfoot td").empty().removeClass("loadingdata");
    $("#" + tbid + " tbody").fadeIn(300)
}
function alertInformation(tbid) {
    $("#" + tbid + " tbody").empty();
    $("#" + tbid + " tfoot td").empty().html("很抱歉，没有相关数据！").addClass("center-basic");
}
