var crypto = require('crypto');
var mongodb = require('./db');

function User(user) {
  this.name = user.name;
  this.password = user.password;
  this.email = user.email;
  this.head = user.head;
};

module.exports = User;


/**
 * 存储用户信息
 * 
 */

User.prototype.save = function(callback) {
  //要存入数据库的用户文档
  var md5 = crypto.createHash('md5'),
  email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),//把 email 转化成小写再编码
  head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
  var user = {
    name: this.name,
    password: this.password,
    email: this.email,
    head: head
  };
  //打开数据库
  mongodb.open(function(err, db) {
    if (err) {
      return callback(err); //错误，返回 err 信息
    }
    //读取 users 集合
    db.collection('users', function(err, collection) {
      if (err) {
        mongodb.close();
        return callback(err); //错误，返回 err 信息
      }
      //将用户数据插入 users 集合
      collection.insert(user, {
        safe: true
      }, function(err, user) {
        mongodb.close();
        if (err) {
          return callback(err); //错误，返回 err 信息
        }
        callback(null, user[0]); //成功！err 为 null，并返回存储后的用户文档
      });
    });
  });
};

/**
 * 读取用户信息
 *
 */
User.get = function(name, callback) {
  //打开数据库
  mongodb.open(function(err, db) {
    if (err) {
      return callback(err); //错误，返回 err 信息
    }
    //读取 users 集合
    db.collection('users', function(err, collection) {
      if (err) {
        mongodb.close();
        return callback(err); //错误，返回 err 信息
      }
      //查找用户名（name键）值为 name 一个文档
      collection.findOne({
        name: name
      }, function(err, user) {
        mongodb.close();
        if (err) {
          return callback(err); //失败！返回 err 信息
        }
        callback(null, user); //成功！返回查询的用户信息
      });
    });
  });
};