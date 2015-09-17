var request = require('supertest');
var assert = require('assert');

request=request('http://localhost:1337');

describe('GetNewsList', function() {
    describe('POST /api/midware/GetNewsList', function () {
        it('should get response successfully', function (done) {
            request.post('/api/midware/GetNewsList')
                .send({params:JSON.stringify({ orderby:{b_id:"desc",updated_date:"asc",news_title:"desc"}, query: {start_date: "2014/06/01",end_date: "2014/09/12"}, pagination: {pagesize:"10",pageindex:"1"}})})
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    var result=JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

describe('EditNewsByID', function() {
    describe('POST /api/midware/EditNewsByID', function () {
        it('should send data successfully', function (done) {
            request.post('/api/midware/EditNewsByID')
                .send({params: JSON.stringify({  query:{b_id:1,is_sensitive:0,updated_by:"zhangsan"}})})
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    var result=JSON.parse(res.text);
                    assert.equal(result.state, "success");
                    done();
                });
        });
    });
});

describe('GetWeiBoList', function() {
    describe('POST /api/midware/GetWeiBoList', function () {
        it('should get response successfully', function (done) {
            request.post('/api/midware/GetWeiBoList')
                .send({params:JSON.stringify({ orderby:{b_id:"desc",updated_date:"asc",weibo_title:"desc"}, query: {start_date: "2014/06/01",end_date: "2014/09/12"}, pagination: {pagesize:"10",pageindex:"1"}})})
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    var result=JSON.parse(res.text);
                    assert.equal(result.success, true);
                    done();
                });
        });
    });
});

describe('EditWeiboByID', function() {
    describe('POST /api/midware/EditWeiboByID', function () {
        it('should send data successfully', function (done) {
            request.post('/api/midware/EditWeiboByID')
                .send({params: JSON.stringify({  query:{b_id:1,is_sensitive:0,updated_by:"lisi"}})})
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    var result=JSON.parse(res.text);
                    assert.equal(result.state, "success");
                    done();
                });
        });
    });
});

