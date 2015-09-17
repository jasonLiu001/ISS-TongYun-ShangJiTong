/**
 * Created by wxliud on 2014/11/17.
 */
var Utility = require('../lib/Utility');
var invoke = require('./invokeApi.js')
var DbConfigInfo = require('../Config');
var ConfigInfo = new DbConfigInfo();
var http=require('http');
var utility = new Utility();
var Client = require('node-rest-client').Client;
client = new Client();

function searchData() {};

searchData.prototype.SearchExposition = function(res,text,area,type,publishedDate,start,rows) {
    this.Url= 'http://'+ConfigInfo.CurrentServiceInfo.ip+':8983/solr/collection1/select';

    var q = 'isExposition:true';
    //var q = 'id:e*';

    if (utility.isValidData(area)) {
        var arr = area.split(",");
        q += " AND (";
        for (var item in arr) {
            if (item != 0) q += " OR ";
            q += "tagArea:" + arr[item];
        }
        q+=") "
    }
    if (utility.isValidData(type)) {
        var arr = type.split(",");
        q += " AND (";
        for (var item in arr) {
            if (item != 0) q += " OR ";
            q += "tagIndustry:" + arr[item];
        }
        q+=") "
    }
    if (utility.isValidData(publishedDate)) {
        if (typeof(publishedDate) === "string" || typeof(publishedDate) === "number") {
            var day = parseInt(publishedDate);
            if (day) {
                var _date = new Date();
                var d = new Date(_date.setDate(_date.getDate() + (--day)));
                var endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

                q += " AND publishedDate:[" + new Date().format("isoUtcDateTime") + " TO " + endDate.format("isoUtcDateTime") + "]";
            }
        } else if (utility.isValidData(publishedDate.startDate)
            && utility.isValidData(publishedDate.endDate)) {
            q += " AND publishedDate:[" + new Date(publishedDate.startdate).format("isoUtcDateTime") + " TO " + new Date(publishedDate.endDate).format("isoUtcDateTime") + "]";
        }
    }
    if (utility.isValidData(text)) {
        q += ' AND text:"' + text + '"';
    }
    this.Url += '?q=' + encodeURIComponent(q);

    if (utility.isValidData(start)) {
        this.Url += '&start=' + start;
    }
    if (utility.isValidData(rows)) {
        this.Url += '&rows=' + rows;
    }
    this.Url += '&fl=' + encodeURIComponent('dbid,title,publishedDate,url,tagArea,tagIndustry') + '&wt=json&indent=true';
    this.Url += '&sort=publishedDate+desc';
    //response data.
    var responseData = {
        success: true,
        total: null,    //数据总数
        data: null,
        errorMsg: null
    };

    console.log(this.Url);
    invoke(this.Url, function(data) {
//    client.get(this.Url, function (data, response) {
        console.log(data);
        var docs = JSON.parse(data)
        if (docs.error) {
            responseData.success = false;
            responseData.errorMsg = docs.error.msg;
        } else {
            var datas = [];
            for (var i in docs.response.docs) {
                var item = docs.response.docs[i];
                var data = {
                    id: item.dbid,
                    title: item.title,
                    url: item.url,
                    publishedDate: new Date(item.publishedDate).format("yyyy-mm-dd HH:MM:ss"),
                    area: item.tagArea,
                    type: item.tagIndustry
                };
                datas.push(data);
            }
            responseData.data = datas;
            responseData.total = docs.response.numFound;
        }
        res.send(responseData);
    });
}

searchData.prototype.SearchProcurements = function(res,text,area,type,info,publishedDate,start,rows) {
    this.Url = 'http://' + ConfigInfo.CurrentServiceInfo.ip + ':8983/solr/collection1/select';
    var q = 'isExposition:false';
    //var q = 'id:p*';

    if (utility.isValidData(area)) {
        var arr = area.split(",");
        q += " AND (";
        for (var item in arr) {
            if (item != 0) q += " OR ";
            q += "tagArea:" + arr[item];
        }
        q += ")";
    }
    if (utility.isValidData(type)) {
        var arr = type.split(",");
        q += " AND (";
        for (var item in arr) {
            if (item != 0) q += " OR ";
            q += "tagKind:" + arr[item];
        }
        q += ")";
    }
    if (utility.isValidData(info)) {
        var arr = info.split(",");
        q += " AND (";
        for (var item in arr) {
            if (item != 0) q += " OR ";
            q += "tagCategory:" + arr[item];
        }
        q += ")";
    }
    if (utility.isValidData(publishedDate)) {
        if (typeof(publishedDate) === "string" || typeof(publishedDate) === "number") {
            var day = parseInt(publishedDate);
            if (day) {
                var _date = new Date();
                var d = new Date(_date.setDate(_date.getDate() - (--day)));
                var endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

                q += " AND publishedDate:[" + endDate.format("isoUtcDateTime") + " TO " + new Date().format("isoUtcDateTime") + "]";
            }
        } else if (utility.isValidData(publishedDate.startDate)
            && utility.isValidData(publishedDate.endDate)) {
            q += " AND publishedDate:[" + new Date(publishedDate.startdate).format("isoUtcDateTime") + " TO " + new Date(publishedDate.endDate).format("isoUtcDateTime") + "]";
        }
    }
    if (utility.isValidData(text)) {
        q += ' AND text:"' + text + '"';
    }
    this.Url += '?q=' + encodeURIComponent(q);

    if (utility.isValidData(start)) {
        this.Url += '&start=' + start;
    }
    if (utility.isValidData(rows)) {
        this.Url += '&rows=' + rows;
    }
    this.Url += '&fl=' + encodeURIComponent('dbid,title,publishedDate,url,tagArea,tagKind,tagCategory') + '&wt=json&indent=true';
    this.Url += '&sort=publishedDate+desc';
    //response data.
    var responseData = {
        success: true,
        total: null,    //数据总数
        data: null,
        errorMsg: null
    };
    console.log(this.Url);
    invoke(this.Url, function (data) {
//    client.get(this.Url, function (data, response) {
        console.log(data);
        var docs = JSON.parse(data)
        if (docs.error) {
            responseData.success = false;
            responseData.errorMsg = docs.error.msg;
        } else if (docs.response.docs) {
            var datas = [];
            for (var i in docs.response.docs) {
                var item = docs.response.docs[i];
                var data = {
                    id: item.dbid,
                    title: item.title,
                    url: item.url,
                    publishedDate: new Date(item.publishedDate).format("yyyy-mm-dd HH:MM:ss"),
                    area: item.tagArea,
                    type: item.tagKind,
                    info: item.tagCategory
                }
                datas.push(data);
            }
            responseData.data = datas;
            responseData.total = docs.response.numFound;
        }
        res.send(responseData);
    });
}
module.exports = searchData;


var dateFormat = function () {
    var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var	_ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? "a"  : "p",
                tt:   H < 12 ? "am" : "pm",
                T:    H < 12 ? "A"  : "P",
                TT:   H < 12 ? "AM" : "PM",
                Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default":      "ddd mmm dd yyyy HH:MM:ss",
    shortDate:      "m/d/yy",
    mediumDate:     "mmm d, yyyy",
    longDate:       "mmmm d, yyyy",
    fullDate:       "dddd, mmmm d, yyyy",
    shortTime:      "h:MM TT",
    mediumTime:     "h:MM:ss TT",
    longTime:       "h:MM:ss TT Z",
    isoDate:        "yyyy-mm-dd",
    isoTime:        "HH:MM:ss",
    isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

