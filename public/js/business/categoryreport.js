/// <reference path="base.js" />
/// <reference path="../jQuery.js" />

var customername = window.global.UserInfo.CustomerName;
var mediaDataSource = null;
var mediaViewModel = function (data) {
    var self = this;
    self.media = ko.observableArray(data);
    mediaDataSource = self.media;
};
var sentitiveDataSource = null;
var sentitiveViewModel = function (data) {
    var self = this;
    self.media = ko.observableArray(data);
    sentitiveDataSource = self.media;
    self.index = function (i) {
        return i + options.pageIndex * options.pageSize;
    };
};
$(function () {
    $(".customer").text(customername);
    //$("#contenttitle").text(customername + $("#qDateStart").val() + "至" + $("#qDateEnd").val() + "舆情汇总报告如下");
    $("#titleDate").text(formatDate(new Date()));
    $("#search").bind("click", function (event) {
        search();
        return false;
    });
    $("#print").bind("click", function () {
        print();
    });
    var view1 = mediaViewModel(null);
    ko.applyBindings(view1, document.getElementById("list1"));
    view2 = sentitiveViewModel(null);
    ko.applyBindings(view2, document.getElementById("list2"));
    search();
});

//搜索
function search() {
    $("#titleDate").text(formatDate(new Date()));

    var startstr = $("#qDateStart").val();
    var endstr = $("#qDateEnd").val();
    if(!compareDate(startstr,endstr)){
        return false;
    }

        var postData = {
            query: {
                
            }
        };
        if ($("#qDateStart").val()!="") {
            postData.query.start_date = $("#qDateStart").val();
        }
        if ($("#qDateEnd").val()!="") {
            postData.query.end_date = $("#qDateEnd").val();
        }
        if ($("#qDateStart").val() != "" && $("#qDateEnd").val()!="") {
            $("#contenttitle").text(customername + "舆情汇总报告(" + $("#qDateStart").val() + "至" + $("#qDateEnd").val() + ")");
        } else if ($("#qDateStart").val() != "") {
            $("#contenttitle").text(customername + "舆情汇总报告(起始于:" + $("#qDateStart").val() + ")");
        } else if ($("#qDateEnd").val() != "") {
            $("#contenttitle").text(customername + "舆情汇总报告(结束于:" + $("#qDateEnd").val() + ")");
        } else {
            $("#contenttitle").text(customername+"舆情汇总报告(全部)");
        }
      
        window.baseTools.getSentimentReport(postData, function (result) {
            if (result && result.Result) {
                var newsCount = result.Data.count.Data[0].count_news;
                var weiboCount = result.Data.count.Data[0].count_weibo;
                var luntanCount = result.Data.count.Data[0].count_newsen;
                //var newsenCount = result.Data.count.Data[0].count_newsen;
                var sumCount = newsCount + weiboCount + luntanCount;
                var negCount = result.Data.score.Data[0].NegCount;
                var posCount = result.Data.score.Data[0].POSCount
                var neuCount = sumCount - negCount - posCount;
                //百分比
                var newsPercent = ((newsCount / sumCount) * 100).toFixed(2) + "%";
                var weiboPercent = ((weiboCount / sumCount) * 100).toFixed(2) + "%";
                var luntanPercent = ((luntanCount / sumCount) * 100).toFixed(2) + "%";
                var posPercent = ((posCount / sumCount) * 100).toFixed(2) + "%";
                var negPercent = ((negCount / sumCount) * 100).toFixed(2) + "%";
                var neuPercent = ((neuCount / sumCount) * 100).toFixed(2) + "%";

                

              
                if (newsCount == 0 && weiboCount == 0 && luntanCount == 0) {
                    $(".listone").children(1).empty();
                    $("#content1").html("很抱歉，没有相关数据！");
                  
                } else {
                    $("#content1").pieChartNum({ title: "舆情数量统计", data: [["新闻", newsCount], ["微博", weiboCount], ["海外", luntanCount]] });
                    $(".countall").html("总计：<span>" + sumCount + "</span>");
                    //$("#sum1").text(sumCount);
                }
                if (negCount == 0 && posCount == 0 && neuCount == 0) {
                    $(".listtwo").children(1).empty();
                    $("#content2").html("很抱歉，没有相关数据！");
                    //$(".listtwo").children(1).html("总计：<span id='sum2'>" + sumCount + "</span>");
                } else {
                    $("#content2").pieChartNum({ title: "舆情正负面统计", data: [["正面", posCount], ["负面", negCount], ["中性", neuCount]] });
                    $(".countall").html("总计：<span>" + sumCount + "</span>");
                }
                window.baseTools.GetNewsAndWeiBoSentimentPie(postData, function (result) {
                    if (result && result.success) {
                        if (result.data) {
                            if (result.data[0]&&result.data[0][0] == null) {
                                result.data[0][0] = "其他";
                            }
                        }
                        if (result.data.length==0) {
                            $("#pie").html("很抱歉，没有相关数据！");
                        } else {
                            $("#pie").pieChart({ title: "舆情分类统计", data: result.data });
                        }
                      
                    } else {
                        $("#pie").html("很抱歉，没有相关数据！");
                    }

                });
                var mediaData = result.Data.media.Data;
                var sentiveDate = result.Data.sensitive.Data;
                if (mediaData.length == 0) {
                    
                    $("#list1 tbody").empty().append("<tr><td colspan='7'>很抱歉，没有相关数据！</td></tr>");
                } else {
                    $("#list1 tbody").empty();
                    mediaDataSource(mediaData);
                }
                if (sentiveDate.length == 0) {
                    $("#list2 tbody").empty().append("<tr><td colspan='7'>很抱歉，没有相关数据！</td></tr>");
                } else {
                    $("#list2 tbody").empty();
                    sentitiveDataSource(sentiveDate);
                } 
             
             
            }

        });
       
    
}
//打印
function print() {
    //document.body.innerHTML = document.getElementById('mainContainer').innerHTML;
    //$("#mainContainer").jqprint();
    //var headElements = '<meta charset="utf-8" />,<meta http-equiv="X-UA-Compatible" content="IE=edge"/>';
    //var options = { mode: "popup", close: true, retainAttr: ["class","id","style"], extraHead: headElements };
    var options = { mode: "popup"};
    $("#mainContainer").printArea(options);
}