  var settings = require('../setting'),//根目录下的setting文件存储着该博客工程的配置信息及数据库连接信息
        Db = require('mongodb').Db,
        Connection = require('mongodb').Connection,
        Server = require('mongodb').Server;
    module.exports = new Db(settings.db, new Server(settings.host, settings.port),
 {safe: true});