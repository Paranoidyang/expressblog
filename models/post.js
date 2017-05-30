var mongodb = require("./db"),
	markdown = require("markdown").markdown;

function Post(name, head, title, tags, post) {
	this.name = name;
	this.head = head;
	this.title = title;
	this.tags = tags;
	this.post = post;

}
module.exports = Post;

/**
 * 存储文章
 *
 */
Post.prototype.save = function(callback) {
	var date = new Date();
	//保存各种形式的时间，方便扩展
	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getFullYear() + '-' + (date.getMonth() + 1),
		day: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
		minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	};
	//要存入数据库的文档
	var post = {
		name: this.name,
		head: this.head,
		time: time,
		title: this.title,
		post: this.post,
		tags: this.tags,
		comments: [],
		pv: 0 //给要存储的文档添加了 pv 键并直接赋初值为 0
	};
	//打开数据库
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}

		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//将文档插入到集合中
			collection.insert(post, {
				safe: true
			}, function(err) {
				mongodb.close();
				if (err) {
					return callback(err);

				}
				callback(null); //返回err为null
			});
		});
	});
};

/**
 * 我们设定：主页和用户页面每页最多显示两篇文章
 * 
 */
Post.getTwo = function(name, page, callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}

		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			var query = {};
			if (name) {
				query.name = name;
			}

			//使用 count 返回特定查询的文档数 total
			collection.count(query, function(err, total) {
				//根据 query 对象查询，并跳过前 (page-1)*2个结果，返回之后的 2 个结果
				collection.find(query, {
					skip: (page - 1) * 2,
					limit: 2
				}).sort({
					time: -1
				}).toArray(function(err, docs) {
					mongodb.close();
					if (err) {
						return callback(err);
					}
					//解析markdown为html
					docs.forEach(function(doc) {
						doc.post = markdown.toHTML(doc.post);
					});
					callback(null, docs, total);
				});
			});
		});
	});
};

/**
 * 根据用户名、发表日期及文章名精确获取一篇文章
 * 
 */
//获取一篇文章
Post.getOne = function(name, day, title, callback) {
	//打开数据库
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		//读取 posts 集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function(err, doc) {
				if (err) {
					mongodb.close();
					return callback(err);
				}
				if (doc) {
					//每访问 1 次，pv 值增加 1
					collection.update({
						"name": name,
						"time.day": day,
						"title": title
					}, {
						$inc: {
							"pv": 1
						}
					}, function(err) {
						mongodb.close();
						if (err) {
							return callback(err);
						}
					});
					//解析 markdown 为 html
					doc.post = markdown.toHTML(doc.post);
					//让留言支持 markdown 语法
					doc.comments.forEach(function(comment) {
						comment.content = markdown.toHTML(comment.content);
					});
					callback(null, doc); //返回查询的一篇文章
				}
			});
		});
	});
};


/**
 * 编辑文章
 * 
 */
//返回原始发表的内容（markdown 格式）
Post.edit = function(name, day, title, callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function(err, doc) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, doc);
			});
		});
	});
};

//更新一篇文章及其相关信息到数据库
Post.update = function(name, day, title, post, callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}

			collection.update({ //根据下面三个字段查找文档
				"name": name,
				"time.day": day,
				"title": title
			}, {
				$set: { //只能够更新文章内容，标题和标签都不能更新，如果也想更新则在这里添加
					post: post
				}
			}, function(err) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

/**
 * 删除文章
 * 
 */
Post.remove = function(name, day, title, callback) {
	//打开数据库
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		//读取 posts 集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//根据用户名、日期和标题查找并删除一篇文章
			collection.remove({
				"name": name,
				"time.day": day,
				"title": title
			}, {
				w: 1
			}, function(err) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

/**
 * 返回所有文章存档信息
 * 
 */
Post.getArchive = function(callback) {
	//打开数据库
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		//读取 posts 集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//返回只包含 name、time、title 属性的文档组成的存档数组
			collection.find({}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};

//返回含有特定标签的所有文章
Post.getTags = function(callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//distinct 用来找出给定键的所有不同值
			collection.distinct("tags", function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};

//返回特定标签页
Post.getTag = function(tag, callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//查询所有 tags 数组内包含 tag 的文档
			//并返回只含有 name、time、title 组成的数组
			collection.find({
				"tags": tag
			}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};

//返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback) {
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      var pattern = new RegExp(keyword, "i");
      collection.find({
        "title": pattern
      }, {
        "name": 1,
        "time": 1,
        "title": 1
      }).sort({
        time: -1
      }).toArray(function (err, docs) {
        mongodb.close();
        if (err) {
         return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};