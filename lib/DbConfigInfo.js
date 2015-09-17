
module.exports = DbConfigInfo;

function DbConfigInfo() {};

var ConnectionConfig = function(option) {
    this.host = option.host || '127.0.0.1';
    this.user = option.user || 'root';
    this.password = option.password || '1qaz@WSX';
    this.database = option.database || 'digital_marketing_dev';
    this.connectionLimit = option.connectionLimit ||10;
};

DbConfigInfo.prototype.StagingDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '115.28.205.176',
    user: 'root',
    password: 'Pass@word1',
    database: 'data_exchange_center_db',
    multipleStatements: true
});

DbConfigInfo.prototype.BusinessDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '115.28.205.176',
    user: 'root',
    password: 'Pass@word1',
    database: 'digital_marketing_sit',
    multipleStatements: true
});

DbConfigInfo.prototype.LocalDB = new ConnectionConfig({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: '1qaz@WSX',
    database: 'digital_marketing_dev',
    multipleStatements: true
});

DbConfigInfo.prototype.DbTables ={
    db_group                : 'core_group',
    db_user                 : 'core_user',
    db_user_group           : 'core_user_group',
    db_acl                  : 'core_acl',
    db_group_subscription   : 'core_group_subscription',
    db_model                : 'core_model',
    db_api                  : 'core_api',
    db_model_subscription   : 'core_model_subscription',
    db_api_subscription     : 'core_api_subscription'
};

DbConfigInfo.prototype.SessionConfig = {
    host: this.host||'115.28.205.176',
    port: this.port||'3306',
    user: this.user||'root',
    password: this.password||'Pass@word1',
    database: this.database||'digital_marketing_dev',
    expiration: 1000 * 60 * 60 * 24 * 7
};

