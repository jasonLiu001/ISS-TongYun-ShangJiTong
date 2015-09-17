/**
 * Created by Wanji on 2014/9/11.
 */
var config = require('../Config.js');
var Configuration = new config();
var redis = require("redis");

module.exports = RedisHelper;

function RedisHelper() {
    this.Client = redis.createClient(Configuration.RedisSettings.port, Configuration.RedisSettings.host);
    this.Client.on('error', function (err) {
        console.log("Connection Error:", err);
    });
};

RedisHelper.prototype.set = function (key, value) {
    var client = redis.createClient(Configuration.RedisSettings.port, Configuration.RedisSettings.host);
    client.on("error", function (err) {
        client.quit();
        console.log("Error " + err);
        return;
    });

    client.set(key, value);
    client.expire(key, Configuration.RedisSettings.expires);
    client.quit();
};

RedisHelper.prototype.get = function (key, callback) {
    var client = redis.createClient(Configuration.RedisSettings.port, Configuration.RedisSettings.host);
    client.on("error", function (err) {
        client.quit();
        console.log("Error " + err);
        return;
    });
    client.get(key, function (err, value) {
        if (err) {
            client.quit();
            console.log('RedisHelper get error' + err);
            callback(false);
        }
        callback(value);
        client.quit();
    });
};

RedisHelper.prototype.del = function (key) {
    var client = redis.createClient(Configuration.RedisSettings.port, Configuration.RedisSettings.host);
    client.on("error", function (err) {
        client.quit();
        console.log("Error " + err);
        return;
    });
    client.del(key, function (err, reply) {
        if (err) {
            console.error(err);
        }
        if (reply > 0) {
            console.log('RedisHelper del success')
        }
        else {
            console.log('RedisHelper del error' + err);
        }
        client.quit();
    });

};


