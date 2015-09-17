/**
 * Created by blade on 2014/8/22.
 */
var DbConfigInfo = require('../Config');
var DbHelper = require('../lib/DbHelper');

var ConfigInfo = new DbConfigInfo();
var pool = new DbHelper(ConfigInfo.BusinessDB);
exports.GetCityInfoSummary = function (req, res) {
    var sql = "select * from v_cityinfo;";
    pool.ExecuteQuery(sql, [], function (err, rows) {
        if (err) {
            console.error('GetCityInfoSummary error:' + err);
            return;
        }
        //构造城市数据
        var YanCheng = new CityInfo('江苏省', 1, '盐城市', 0, 0, 0, 0);
        var NanTong = new CityInfo('江苏省', 1, '南通市', 0, 0, 0, 0);
        var WuXi = new CityInfo('江苏省', 1, '无锡市', 0, 0, 0, 0);
        var KunShan = new CityInfo('江苏省', 1, '昆山市', 0, 0, 0, 0);
        var HongZe = new CityInfo('江苏省', 1, '洪泽县', 0, 0, 0, 0);
        var HaErBin = new CityInfo('黑龙江', 2, '哈尔滨', 0, 0, 0, 0);
        var FoShan = new CityInfo('广东省', 3, '佛山市', 0, 0, 0, 0);
        var DongGuan = new CityInfo('广东省', 3, '东莞市', 0, 0, 0, 0);
        var YanTai = new CityInfo('山东省', 4, '烟台市', 0, 0, 0, 0);
        var BeiJing = new CityInfo('北京市', 5, '北京市', 0, 0, 0, 0);
        for (var i = 0; i < rows.length; i++) {
            var item = rows[i];
            switch (item.customer_name) {
                case '盐城':
                    SumCityScore(YanCheng, item);
                    break;
                case '南通':
                    SumCityScore(NanTong, item);
                    break;
                case '无锡':
                    SumCityScore(WuXi, item);
                    break;
                case '昆山':
                    SumCityScore(KunShan, item);
                    break;
                case '洪泽':
                    SumCityScore(HongZe, item);
                    break;
                case '哈尔滨':
                    SumCityScore(HaErBin, item);
                    break;
                case '佛山':
                    SumCityScore(FoShan, item);
                    break;
                case '烟台':
                    SumCityScore(YanTai, item);
                    break;
                case '北京':
                    SumCityScore(BeiJing, item);
                    break;
                case '东莞':
                    SumCityScore(DongGuan,item);
                    break;
            }
        }
        var result = {
            success: true,
            data: [YanCheng, NanTong, WuXi, KunShan, HongZe, FoShan, YanTai, BeiJing,DongGuan]
        };
        res.send(result);
    });

};
function CityInfo(province, provinceId, city, totalCount, posCount, negCount, minCount) {
    this.PRO = province;
    this.PROID = provinceId;
    this.City = city;
    this.TotalCount = totalCount;
    this.POSCount = posCount;
    this.NegCount = negCount;
    this.MinCount = minCount;
}

function SumCityScore(_city, _it) {
    if (_it.xscore >3) {
        _city.POSCount += _it.xcount;//微博积极数
    } else if (_it.xscore <-3) {
        _city.NegCount += _it.xcount;//微博消极数
    }
    else {
        _city.MinCount += _it.xcount;//微博消极数
    }
    _city.TotalCount += _it.xcount;//舆情总数
}
