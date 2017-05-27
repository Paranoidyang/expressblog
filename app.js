/**
 * 入口文件
 */

//用require方法加载模块
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);

// var multer = require('multer');

//加载总路由接口，并在下面通过routes(app)接收index.js中module.exports导出的函数接口，
//而具体的路由控制器和实现路由功能的函数在index.js
var routes = require('./routes/index');

var settings = require("./setting");//同一个目录下前面用一个点，不同目录用两个点
var flash = require("connect-flash");//我们所说的 flash 即 connect-flash 模块

//用express模块的构造方法创建一个express对象实例并赋值给app
var app = express();
module.exports = app;//导出app实例供其他模块调用。

//设置 views 文件夹为存放视图文件的目录, 即存放模板文件的地方,__dirname 为全局变量,
//存储当前正在执行的脚本所在的目录
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');//设置视图模板引擎为 ejs

app.use(flash());//flash是一个在session中用于存储信息的特定区域。信息写入flash,下一次显示完毕后即被清除

app.set('port', 4000);//// 设定port变量，意为访问端口

//use是express注册中间件的方法
app.use(logger('dev'));//加载日志中间件
app.use(bodyParser.json());//加载解析json的中间件
app.use(bodyParser.urlencoded({ extended: true }));//加载解析urlencoded请求体的中间件
app.use(cookieParser());//加载解析cookie的中间件

//设定public为静态文件目录，比如本地文件目录为demo/public/images，
//访问网址则显示为http://localhost:3000/images
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: settings.cookieSecret,//secret 用来防止篡改 cookie
  key: settings.db,//key 的值为 cookie 的名字
  resave: true,
  saveUninitialized: false,
  cookie: {maxAge:1000*60*60*24*30},//通过设置 cookie 的 maxAge 值设定 cookie 的生存期30 天，
  store: new MongoStore({//设置它的 store 参数为 MongoStore 实例，把会话信息存储到数据库中
    db: settings.db,
    host: settings.host,
    port: settings.port,
    url:'mongodb://localhost/blog' //要加一个url,
  })
}));

// app.use(multer({
// dest: './public/images',//dest 是上传的文件所在的目录
// rename: function (fieldname, filename) {//rename 函数用来修改上传后的文件名，这里设置为保持原来的文件名。
// return filename;
// }
// }));

//下面的app也可以直接放在var routes = require('./routes/index')(app);的後面，
//注意这样的話app的声明就应该在前面。
routes(app);//接收index.js中module.exports导出的函数接口


//app实例监听前面设置的端口号，当在浏览器输入地址时，就可以监听到，从而进行路由及数据库等相关操作。
app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});