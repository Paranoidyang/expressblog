  //根目录下的setting.js文件存储着该博客工程的配置信息及数据库连接信息
  var settings = require('../setting'),
  	Db = require('mongodb').Db,
  	Connection = require('mongodb').Connection,
  	Server = require('mongodb').Server;
  //利用setting.js创建一个数据库实例
  module.exports = new Db(settings.db, new Server(settings.host, settings.port), {
  	safe: true
  });