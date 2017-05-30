var crypto = require("crypto"), //crypto 是 Node.js 的一个核心模块，我们用它生成散列值来加密密码
	User = require("../models/user.js"),
	Post = require("../models/post.js"),
	Comment = require("../models/comment.js"),
	multer = require('multer');

//通过module.exports导出函数接口，在app.js中通过routes(app)接收
module.exports = function(app) {
	//主页
	app.get('/', function (req, res) {
		//判断是否是第一页，并把请求的页数转换成 number 类型
		var page = parseInt(req.query.p) || 1;
		//查询并返回第 page 页的 2 篇文章
		Post.getTwo(null, page, function(err, posts, total){
			if(err) {
				posts = [];
			}

			res.render('index', {//response.render方法用于渲染网页模板,
				title: '主页',   //将下面这些变量值传入index模板，渲染成HTML网页
				page: page,
				isFirstPage: (page-1) == 0,
				isLastPage: ((page - 1) * 2 + posts.length) == total,
				user: req.session.user,
				posts: posts,
				//flash：页面通知功能。
				//将成功的信息赋值给变量 success,sucess的具体值在相应路由的回调函数中定义，
				//如'/reg'下面的req.flash('success', '注册成功');
				success: req.flash('success').toString(),
				error: req.flash('error').toString()	 //将错误的信息赋值给变量 error
			});
		});
	});

	//注册
	app.get('/reg', checkNotLogin);
	app.get('/reg', function(req, res){
		//用户在注册成功后，把用户信息存入session ，页面跳转到主页显示 注册成功！ 的字样。同时把
		//session 中的用户信息赋给变量 user ，在渲染 index.ejs 文件时通过检测 user 判断用户是否在
		//线，根据用户状态的不同显示不同的导航信息。
		res.render('reg', {
			title: '注册',
			//为了维护用户状态和 flash 的通知功能，我们给每个 ejs 模版文件传入了以下三个值
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});
	app.post('/reg', checkNotLogin);
	app.post('/reg', function(req, res){

	// req.body：就是 POST 请求信息解析过后的对象。例如我们要访问POST来的表单内的 
	// name="password" 域的值，只需访问 req.body['password'] 或 req.body.password 即可。
		var name = req.body.name,
			password = req.body.password,
			password_re = req.body['password-repeat'];
		//如果两次密码不一致
		if(password_re !== password) {
			req.flash('error', '两次密码输入不一致');
			// response.redirect方法允许网址的重定向，实现了页面的跳转
			return res.redirect('/reg');//返回注册页
		}
		//生成密码的 md5 值
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		//根据输入的信息创建一个用户实例
		var newUser = new User({
			name: name,
			password: password,
			email: req.body.email
		});
		//检查用户名是否已经存在
		//User 是一个描述数据的对象，即 MVC 架构中的模型。与视图和控制器不同，模型是真正与数据
		//打交道的工具，没有模型，网站就只是一个外壳，不能发挥真实的作用，因此它是框架中最根本的部分。
		User.get(newUser.name, function(err, user){
			if(err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			if(user) {
				req.flash('error', '用户名已存在');
				//这里太粗暴了，可以改下
				return res.redirect('/reg');//返回注册页
			}
			//如果用户不存在，就将用户存入数据库中
			newUser.save(function(err, user){
				if(err) {
					req.flash('error', err);
					return res.redirect('/reg');
				}
				req.session.user = newUser;//将用户信息存到session,以后就可以通过 req.session.user 读取用户信息。
				req.flash('success', '注册成功');
				res.redirect('/');//注册成功后返回主页
			});
		});
	});

	//登录
	app.post('/login', checkNotLogin);
	app.post('/login', function(req, res){
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		//检查用户是否存在
		User.get(req.body.name, function(err, user){
			if(!User) {
				req.flash('err', '用户不存在');
				return res.redirect('/login');//用户不存在就跳到登录页
			}
			if(user.password !== password) {
				req.flash('err', '密码错误');
				return res.redirect('/login');//跳转到登录页
			}
			//用户名密码都匹配后，将用户信息存入session
			req.session.user = user;
			req.flash('success', '登录成功');
			res.redirect('/');//登录成功后跳转到主页
		});
	});
	app.get('/login', checkNotLogin);//检查下是否登录
	app.get('/login', function(req, res){
		res.render('login', {
			title: "登录",
			user: req.session.user,//通过 req.session.user 读取用户信息
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	//发表
	app.get('/post', checkLogin);
	app.get('/post', function(req, res){
		res.render('post', {
			title: "发表",
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post("/post", function(req, res){
		var currentUser = req.session.user,
			tags = [req.body.tag1, req.body.tag2, req.body.tag3],
			post = new Post(currentUser.name, req.body.title, tags, req.body.post);
		post.save(function(err) {
			if(err) {
				req.flash("error", err);
				return res.redirect('/');
			}
			req.flash('success', '发布成功');
			res.redirect('/');
		});
	});


	//登出
	app.get('/logout', function(req, res){
		req.session.user = null;//把req.session.user赋值null丢掉session 中用户的信息，实现用户的退出
		req.flash('success', '登出成功');
		res.redirect('/');//登出后到主页
	});


	//上传文件
	var storage = multer.diskStorage({
		//设置上传后文件路径，uploads文件夹会自动创建。
		destination: function(req, file, cb) {
			cb(null, './public/images');
		},
		filename: function(req, file, cb) {
			cb(null, file.originalname);
		}
	});
	var upload = multer({
		storage: storage
	});

	app.get('/upload',checkLogin);
	app.get('/upload', function(req, res){
		res.render('upload', {
			title: '文件上传',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/upload',checkLogin);

	app.post('/upload', upload.array('field1',5),function(req, res){
		req.flash('success', '文件上传成功！');
		res.redirect('/upload');
	});


app.get('/search', function (req, res) {
  Post.search(req.query.keyword, function (err, posts) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    res.render('search', {
      title: "SEARCH:" + req.query.keyword,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

//添加了一条路由规则 app.get('/u/:name')，用来处理访问用户页的请求，然后从数据库
//取得该用户的数据并渲染 user.ejs 模版，生成页面并显示给用户。
	app.get('/u/:name', function(req, res){
		var page = parseInt(req.query.p, 10) || 1;
		//检查用户是否存在
		User.get(req.params.name, function(err, user){
			if(!user) {
				req.flash('error', '用户名不存在');
				return res.redirect('/');
			}
			//查询并返回到用户第page页的两篇文章
			Post.getTwo(user.name, page, function(err, posts, total){
				if(err) {
					req.flash("error",err);
					return res.redirect('/');
				}
				res.render('user', {
					title: user.name,
					posts: posts,
					page: page,
					isFirstPage: (page-1) == 0,
					isLastPage: ((page-1) * 2 + posts.length)== total,
					user: req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				});
			});
		});
	});
	app.get('/u/:name/:day/:title', function (req, res) {
		Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('article', {
				title: req.params.title,
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	app.get('/edit/:name/:day/:title', checkLogin);
	app.get('/edit/:name/:day/:title', function(req ,res){
		var currentUser = req.session.user;
		Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post){
			if(err) {
				req.flash('error', err);
				return res.redirect('back');
			}

			res.render('edit',{
				title: "编辑",
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});


	app.post('/edit/:name/:day/:title', checkLogin);
	app.post('/edit/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.update(currentUser.name, req.params.day, req.params.title, req.body.post,function(err){
			var url = encodeURI('/u/'+ req.params.name + '/' + req.params.day + '/' + req.params.title);
			if(err) {
				req.flash('error', err);
				return res.redirect(url);
			}
			req.flash('success', '修改成功');
			res.redirect(url);//返回文章页
		});
	});

	app.get('/remove/:name/:day/:title', checkLogin);
	app.get('/remove/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.remove(currentUser.name, req.params.day, req.params.title, function(err) {
			if(err) {
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '删除成功');
			res.redirect('/');
		});
	});


	//留言部分
	app.post("/u/:name/:day/:title", function(req, res){
		var date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +date.getDate() + " " + date.getHours() + ":" + (date.getMinutes()< 10 ? "0" + date.getMinutes() : date.getMinutes());
		var comment = {
			name: req.body.name,
			email: req.body.email,
			website: req.body.website,
			time: time,
			content: req.body.content
		};
		var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
		newComment.save(function(err) {
			if(err) {
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '留言成功');
			res.redirect('back');//留言成功后返回到该文章页
		});
	});


	//存档
	app.get('/archive', function(req, res){
		Post.getArchive(function(err, posts){
			if(err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('archive', {
				title: '存档',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	//标签
app.get('/tags', function (req, res) {
  Post.getTags(function (err, posts) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    res.render('tags', {
      title: '标签',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});
app.get('/tags/:tag', function (req, res) {
  Post.getTag(req.params.tag, function (err, posts) {
    if (err) {
      req.flash('error',err); 
      return res.redirect('/');
    }
    res.render('tag', {
      title: 'TAG:' + req.params.tag,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

//检验是否未登录
	function checkLogin(req, res, next) {
		if(!req.session.user) {
			req.flash('error', '未登录！');
			res.redirect('/login');
		}
		next();
	}

//检验是否已登录
	function checkNotLogin(req, res, next) {
		if(req.session.user) {
			req.flash('error', "已登录");
			res.redirect('back');
		}
		next();
	}

};