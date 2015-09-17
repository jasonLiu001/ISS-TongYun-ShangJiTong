/**
 * Created by Administrator on 2014/7/28.
 */
var express = require('express');
var router = express.Router();

var tenant = require("./tenant.js");
var authentication = require("./authentication.js");
var tokenVerification = require("./tokenVerification.js");
var midware = require("./midware.js");
var manage = require('./manage.js');
var oauth2 = require('./oauth2.js');
var cityInfo= require("./cityInfo.js");
var backstageMgt=require('./backstageManagement.js');
var dataSourceMgt=backstageMgt.DataSourceURLManage;
var subDataSourceMgt =backstageMgt.SubDataSourceURLManage;
var segment=require('./maintain.js');
var androidAPI=require('./android.js');
var iAPI=require('./iApi.js');

router.get('/api/cityInfo/GetCityInfoSummary', cityInfo.GetCityInfoSummary);

router.get('/api/authentication/verification', authentication.GenerateVerificationCode);
router.post('/api/authentication/login', authentication.PostLogin);
router.post('/api/authentication/apiLogin',authentication.ApiLogin);

router.get('/api/authentication/getToken', authentication.GetClientInfo);
router.get('/api/authentication/logout', authentication.Logout);
router.post('/api/authentication/refreshtoken', tokenVerification.RefreshToken);
router.get('/oauth2/authorize', oauth2.authorise,oauth2.AfterAuthorise);
router.all('/oauth2/token', oauth2.grant);

router.post("/api/tenant/AddTenant", tenant.AddTenant);
router.post('/api/tenant/GetTenantList', tenant.GetTenantList);
router.post('/api/tenant/AddTenantUser', tenant.AddTenantUser);
router.get('/api/tenant/DeleteUserByUserID', tenant.DeleteUserByUserID);
router.get('/api/tenant/GetGroupByTenant', tenant.GetGroupByTenant);
router.get('/api/tenant/GetUserListByTenant', tenant.GetUserListByTenant);
router.get('/api/tenant/GetGroupByTUser', tenant.GetGroupByTUser);
router.get('/api/tenant/GetVerificationCode', tenant.GetVerificationCode);
router.post('/api/tenant/UpdateTenant', tenant.UpdateTenant);
router.get('/api/tenant/GetTenantDetailsById', tenant.GetTenantDetailsById);
router.get('/api/tenant/GetDomainByTenantId', tenant.GetDomainByTenantId);
router.get('/api/tenant/GetDomainByTenantUserId', tenant.GetDomainByTenantUserId);
router.get('/api/tenant/GetTenantByUserId', tenant.GetTenantByUserId);
router.post('/api/tenant/DeleteTenant', tenant.DeleteTenant);


router.post('/api/midware/GetNewsList', midware.GetNewsList);
router.post('/api/midware/EditNewsByID', midware.EditNewsByID);
router.post('/api/midware/GetWeiBoList', midware.GetWeiBoList);
router.post('/api/midware/EditWeiBoByID', midware.EditWeiBoByID);
router.post('/api/midware/GetEnNewsList', midware.GetEnNewsList);
router.post('/api/midware/GetWeiXinList', midware.GetWeiXinList);
router.post('/api/midware/EditWeiXinByID', midware.EditWeiXinByID);

router.post('/api/midware/GetHotWords', midware.GetHotWords);
router.post('/api/midware/GetSentimentLinear', midware.GetSentimentLinear);
router.post('/api/midware/GetNewsSentimentPie', midware.GetNewsSentimentPie);
router.post('/api/midware/GetNewsSentimentMonth', midware.GetNewsSentimentMonth);
router.post('/api/midware/GetWeiBoSentimentPie', midware.GetWeiBoSentimentPie);
router.post('/api/midware/GetWeiBoSentimentMonth', midware.GetWeiBoSentimentMonth);
router.post('/api/midware/GetNewsSentimentMonitor', midware.GetNewsSentimentMonitor);
router.post('/api/midware/GetWeiBoSentimentMonitor', midware.GetWeiBoSentimentMonitor);
router.post('/api/midware/GetWeiBoSentimentPublish', midware.GetWeiBoSentimentPublish);
router.post('/api/midware/GetNewsAndWeiBoSentimentPie', midware.GetNewsAndWeiBoSentimentPie);
router.post('/api/midware/GetWeiBoHot', midware.GetWeiBoHot);

router.post('/api/midware/GetWeiBoSentimentDay', midware.GetWeiBoSentimentDay);
router.post('/api/midware/GetNewsSentimentDay', midware.GetNewsSentimentDay);
router.post('/api/midware/GetWeiBoAndNewsSentimentDay', midware.GetWeiBoAndNewsSentimentDay);
router.post('/api/midware/GetWeiBoAndNewsSentimentScoreDay', midware.GetWeiBoAndNewsSentimentScoreDay);

router.param('TimeType',function(req,res,next,type){
    //以下是示例用户，可以从数据库....等中获取
    req.TimeType = type;
    next();
});
router.post('/api/midware/GetWeiBoSentiment/:TimeType', midware.GetWeiBoSentiment);
router.post('/api/midware/GetNewsSentiment/:TimeType', midware.GetNewsSentiment);
router.post('/api/midware/GetWeiBoAndNewsSentiment/:TimeType', midware.GetWeiBoAndNewsSentiment);

//舆情汇总报告
router.post('/api/midware/GetWeiBoAndNewsSentimentReport', midware.GetWeiBoAndNewsSentimentReport);

router.post('/api/midware/GetEmergencyPlanByCondition', midware.GetEmergencyPlanByCondition);
router.get('/api/midware/GetEmergencyPlanById', midware.GetEmergencyPlanById);
router.post('/api/midware/AddEmergencyPlan', midware.AddEmergencyPlan);
router.get('/api/midware/DeleteEmergencyPlanByID', midware.DeleteEmergencyPlanByID);
router.post('/api/midware/UpdateEmergencyPlan', midware.UpdateEmergencyPlan);

router.post('/api/midware/GetLastAppFile', midware.GetLastAppFile);


// manage : group user permission
//Group model
router.post('/api/manage/GetGroupList', manage.GetGroupList);
router.post('/api/manage/GetGroupByCondition', manage.GetGroupByCondition);
router.post('/api/manage/GetGroupById', manage.GetGroupById);
router.post('/api/manage/SaveGroup', manage.AddGroup);
router.delete('/api/manage/SaveGroup', manage.DeleteGroupById);
router.put('/api/manage/SaveGroup', manage.UpdateGroup);

//Model
router.post('/api/manage/GetModelList', manage.GetModelList);
router.post('/api/manage/GetModelByName', manage.GetModelByName);
router.post('/api/manage/GetModelByCondition', manage.GetModelByCondition);
router.post('/api/manage/GetModelById', manage.GetModelById);
router.post('/api/manage/SaveModel', manage.AddModel);
router.delete('/api/manage/SaveModel', manage.DeleteModelById);
router.put('/api/manage/SaveModel', manage.UpdateModel);
router.get('/api/manage/GetGroupForTenant', manage.GetGroupForTenant);

//User
router.post('/api/manage/GetUserList', manage.GetUserList);
router.post('/api/manage/GetUserById', manage.GetUserById);
router.post('/api/manage/GetUserByCondition', manage.GetUserByCondition);
router.post('/api/manage/SaveUser', manage.AddUser);
router.delete('/api/manage/SaveUser', manage.DeleteUserById);
router.put('/api/manage/SaveUser', manage.UpdateUser);
router.post('/api/manage/UpdateUserInformation', manage.UpdateUserInformation);

//Permission
router.post('/api/manage/GetPermissionByGroupId', manage.GetPermissionByGroupId);
router.post('/api/manage/GetPermissionByUserId', manage.GetPermissionByUserId);
router.post('/api/manage/GetPermission', manage.GetPermission);
router.post('/api/manage/UpdatePermissionForGroup', manage.UpdatePermissionForGroup);
router.post('/api/manage/UpdatePermissionForUser', manage.UpdatePermissionForUser);
router.get('/api/manage/GetModulePermissionByToken', manage.GetModulePermissionByToken);

//api
router.post('/api/manage/GetApiById', manage.GetApiById);
router.post('/api/manage/GetApiByCondition', manage.GetApiByCondition);
router.post('/api/manage/SaveApi', manage.AddApi);
router.delete('/api/manage/SaveApi', manage.DeleteApiById);
router.put('/api/manage/SaveApi', manage.UpdateApi);

//password
router.post('/api/manage/UpdatePassword', manage.UpdatePassword);
router.post('/api/manage/ResetPassword', manage.ResetPassword);

//DataSource
router.post('/api/manage/GetDataSourceURLs', dataSourceMgt.GetDataSourceURLs);
router.post('/api/manage/AddDataSourceURL', dataSourceMgt.AddDataSourceURL);
router.post('/api/manage/UpdateDataSourceURL', dataSourceMgt.UpdateDataSourceURL);
router.post('/api/manage/DeleteDataSourceURLByID', dataSourceMgt.DeleteDataSourceURLByID);
//SubDataSource
router.post('/api/manage/GetSubDataSourceURLs', subDataSourceMgt.GetSubDataSourceURLs);
router.post('/api/manage/AddSubDataSourceURL', subDataSourceMgt.AddSubDataSourceURL);
router.post('/api/manage/UpdateSubDataSourceURL', subDataSourceMgt.UpdateSubDataSourceURL);
router.post('/api/manage/DeleteSubDataSourceURLByID', subDataSourceMgt.DeleteSubDataSourceURLByID);

//segment
router.post("/maintain/newsSegment",segment.newsSegment);
router.post("/maintain/gradeSplit",segment.gradeSplit);
router.get("/maintain/loadGradeWords",segment.loadGradeWords);
router.post("/maintain/updateGradeWords",segment.updateGradeWords);

//api for android.
/*
router.get("/android/getListInfo/:sourceDataType",androidAPI.getListInfo);
router.post("/android/filterListInfo/:sourceDataType",androidAPI.filterListInfo);
router.get("/android/getDetailInfo/:sourceDataType",androidAPI.getDetailInfo);
router.post("/android/searchBusinessInfo/:sourceDataType",androidAPI.searchBusinessInfo);
router.post("/android/operateFavorite/:sourceDataType",androidAPI.operateFavorite);
router.get("/android/getTags",androidAPI.getTags);
router.get("/android/getRecommendWhere",androidAPI.getRecommendWhere);
router.post("/android/saveRecommendWhere/:sourceDataType",androidAPI.saveRecommendWhere);
router.get("/android/getRecommendListInfo/:sourceDataType",androidAPI.getRecommendListInfo);
router.get("/android/download",androidAPI.downloadAPK);
router.post("/android/login",androidAPI.login);
router.get("/android/logout",androidAPI.logout);
 */
router.get("/android/getListInfo/:sourceDataType",iAPI.getListInfo);
router.post("/android/filterListInfo/:sourceDataType",iAPI.filterListInfo);
router.get("/android/getDetailInfo/:sourceDataType",iAPI.getDetailInfo);
router.post("/android/searchBusinessInfo/:sourceDataType",iAPI.searchBusinessInfo);
router.post("/android/operateFavorite/:sourceDataType",iAPI.operateFavorite);
router.get("/android/getTags",iAPI.getTags);
router.get("/android/getRecommendWhere",iAPI.getRecommendWhere);
router.post("/android/saveRecommendWhere/:sourceDataType",iAPI.saveRecommendWhere);
router.get("/android/getRecommendListInfo/:sourceDataType",iAPI.getRecommendListInfo);
router.get("/android/download",iAPI.downloadAPK);
router.get("/android/latestVersion", iAPI.getLatestVersion);
router.post("/android/login",iAPI.login);
router.get("/android/logout",iAPI.logout);

module.exports = router;