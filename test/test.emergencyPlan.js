/**
 * Created by yinhuichao on 2014/7/30.
 */

var request = require('supertest');
var assert = require('assert');

request=request("localhost:1337");

//GetEmergencyPlanById unit test
describe('GetEmergencyPlanById', function () {
    describe('GET /api/midware/GetEmergencyPlanById', function () {
        it('should success', function (done) {
            request.get('/api/midware/GetEmergencyPlanById')
                .query({id:1})
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    var result = JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

//GetEmergencyPlanByCondition unit test
describe('GetEmergencyPlanByCondition', function () {
    describe('POST /api/midware/GetEmergencyPlanByCondition', function () {
        postData = {
            orderby: {
                id: "asc"
            },
            query: {
                classify:2
            },
            pagination: {
                pagesize: "5",
                pageindex: 0
            }
        }
        it('should success', function (done) {
            request.post('/api/midware/GetEmergencyPlanByCondition')
                .send({ params: JSON.stringify(postData) })
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    var result = JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

//AddEmergencyPlan unit test
describe('AddEmergencyPlan', function () {
    describe('POST /api/midware/AddEmergencyPlan', function () {
        it('should success', function (done) {
            request.post('/api/midware/AddEmergencyPlan')
                .send({ title: 'unit test', phone: '13439965632', classify: 1, polarity: '0', url: 'www.baidu.com' })
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    var result = JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

//DeleteEmergencyPlanByID unit test
describe('DeleteEmergencyPlanByID', function () {
    describe('GET /api/midware/DeleteEmergencyPlanByID', function () {
        it('should success', function (done) {
            request.get('/api/midware/DeleteEmergencyPlanByID')
                .query({id:30})
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    var result = JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

//UpdateEmergencyPlan unit test
describe('UpdateEmergencyPlan', function () {
    describe('POST /api/midware/UpdateEmergencyPlan', function () {
        it('should success', function (done) {
            request.post('/api/midware/UpdateEmergencyPlan')
                .send({ id:29, title: '方向', phone: '45646546546', classify: 2, polarity: '0', url: 'www.sina.com' })
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    var result = JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});