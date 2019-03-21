var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyPerser = require('body-parser'); //body使えるようにするやつ
var session = require('express-session');//session
var session_opt = {
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000}
};
var validator = require('express-validator');
var knex = require('knex')({
    dialect: 'mysql',
    connection: {
        host    : 'localhost',
        user    : 'root',
        password: '',
        database: 'my-chat-db',
        charset : 'utf8'
    }
});

var Bookshelf = require('bookshelf')(knex);

var User = Bookshelf.Model.extend({
    tableName:  'users'
});

var Room = Bookshelf.Model.extend({
    tableName:  'rooms'
});

var Message = Bookshelf.Model.extend({
    tableName:  'messages',
    hasTimestamps: true,
    room: function(){
        return this.belongsTo(Room);
    },
    user: function(){
        return this.belongsTo(User);
    }
});

var Stamp = Bookshelf.Model.extend({
    tableName:  'stamps',
    user:function(){
        return this.belongsTo(User);
    }
});



const io = require('socket.io')(http);
const PORT = process.env.PORT || 7000;

app.use(express.static('public'));
app.use(bodyPerser.urlencoded({extended: false}));
app.use(session(session_opt));
app.use(validator());

// home----------------------------------------------------------------------------------------

app.get('/' , function(req, res){
   if (req.session.login == null){
       res.redirect('users');
   } else {
       var login = req.session.login;
       var data = {
           title:'ルーム選択',
           content: '「' + login.name + '」さんでログインしています。'
       }
       console.log(login.id);
       res.render('index.ejs',data);
   }
   
});

app.post('/', function(req, res){
    var na = req.body.name;
    Room.query({where:{name:na}}).fetch().then((model) => {
        if(model == null){
            new Room(req.body).save().then((model) => {
                req.session.room = model.attributes;
                res.redirect('/hello');
            });
        }else{
            req.session.room = model.attributes;
            res.redirect('/hello');
        }
    })
})

// users/add--------------------------------------------------------------------------------------

app.get('/users/add', function(req, res){
    var data = {
        title:'新規作成',
        form: {name:'', password:'', comment:''},
        content: '登録する名前・パスワード・コメントを入力してください。'
    }
    res.render('users/add.ejs', data);
});

app.post('/users/add', function(req, res){
    req.check('name','名前は必ず入力してください。').notEmpty();
    req.check('password','パスワードは必ず入力してください。').notEmpty();
    req.getValidationResult().then((result) => {
        if(!result.isEmpty()){
            var content = '<ul class="error">';
            var result_arr = result.array();
            for(var n in result_arr){
                content += '<li>' + result_arr[n].msg + '</li>'
            }
            content += '</ul>';
            var data = {
                title: '新規作成',
                content:content,
                form: req.body
            }
            res.render('users/add.ejs', data);
        } else {
            var nm = req.body.name;
            User.query({where:{name:nm}}).fetch().then((model => {
                if(model != null){
                    var data = {
                        title: '新規作成',
                        content: '<ul><li>そのユーザー名は既に使われています。</li></ul>',
                        form: req.body
                    };
                    res.render('users/add.ejs', data);
                }else {
                    req.session.login = null;
                    new User(req.body).save().then((model) => {
                        res.redirect('/users');
                    });
                }
            }));
            
        }
    });
});

// login---------------------------------------------------------------------

app.get('/users', function(req, res){
    var data = {
        title: 'ログイン',
        form: {name:'',password:''},
        content: '名前とパスワードを入力してください。'
    }
    res.render('users/login.ejs', data);
});

app.post('/users', function(req, res){
    req.check('name','名前は必ず入力してください。').notEmpty();
    req.check('password','パスワードは必ず入力してください。').notEmpty();
    req.getValidationResult().then((result) => {
        if(!result.isEmpty()){
            var content = '<ul class="error">';
            var result_arr = result.array();
            for(var n in result_arr){
                content += '<li>' + result_arr[n].msg + '</li>'
            }
            content += '</ul>';
            var data = {
                title: 'ログイン',
                content:content,
                form: req.body
            }
            res.render('users/login.ejs', data);
        } else {
            var nm = req.body.name;
            var pw = req.body.password;
            User.query({where: {name: nm}, andWhere: {password: pw}})
                .fetch()
                .then((model) => {
                    if(model == null){
                        var data = {
                            title: 'ログイン',
                            content: '<p class="error">名前、またはパスワードが違います。</p>',
                            form: req.body
                        };
                        res.render('users/login.ejs', data);
                    } else {
                        req.session.login = model.attributes;
                        var login = req.session.login;
                        new Stamp().where('user_id', '=', login.id).fetch().then((model) => {
                            if(model == null){
                                for(var i=0; i<9; i++){
                                    new Stamp({user_id:login.id, image:"", flag:0}).save().then((model) => {});
                                }
                            }
                        });
                        var data = {
                            title:'ようこそ！<br>「' + login.name + '」さん！',
                            content: '<p>ログインしました!!<br>ルーム選択から部屋を選んでください。</p>',
                            form: req.body
                        };
                        res.render('users/login.ejs',data);
                    }
                });
        }
    });
});

// chat---------------------------------------------------------------------------------------

app.get('/hello' , function(req, res){
    var room = req.session.room;
    var login = req.session.login;
    var data = {
        title: room.name,
        content: login.name,
        room_name: room.name,
        login_name: login.name,
        room_id: room.id,
        login_id: login.id
    }
    res.render('hello.ejs',data)
 });

io.on('connection',function(socket){
    var name = "";
    var room = "";
    var name_id = "";
    var room_id = "";
    socket.on('client_to_server_join',function(data){
        room = data.room_name;
        name = data.login_name;
        room_id = data.room_id;
        name_id = data.login_id;
        socket.join(room);
        socket.broadcast.to(room).emit('messages', {value : "<li class='li_center'>「" + name + "」さんが入室しました</li>"});
        new Message().orderBy('created_at', 'DESC').where('room_id', '=', room_id)
        .fetchAll({withRelated: ['user']}).then((collection) => {
            io.to(socket.id).emit('logs', {collection:collection.toArray(), name_id:name_id});
        });
    });

    socket.on('client_to_server_broadcast', function(data) {
        new Message({room_id:room_id,user_id:name_id,message:data.msg, imgflag:0}).save().then((model) => {
            socket.broadcast.to(room).emit('messages', {value : "<li class='li_left'><span class='na'>" + data.name + "</span><br><p class='chat_tx'>" +data.msg + "</p></li>"});
            io.to(socket.id).emit('messages', {value: "<li class='li_right'><p class='chat_tx'>" +data.msg + "</p></li>"});
        });
        
    });

    socket.on('client_to_server_broadcast_canvas', function(data) {
        new Message({room_id:room_id,user_id:name_id,message:data.img, imgflag:1}).save().then((model) => {
            socket.broadcast.to(room).emit('gocanvas', {value: "<li class='li_left'><span class='na'>" + name + "</span><br><p><img src='" + data.img + "'  width='250' height='200'/><span class='upcanvas' id='" + data.img +"'>↓</span></p></li>"});
            io.to(socket.id).emit('gocanvas', {value: "<li class='li_right'><p><span class='upcanvas' id='" + data.img +"'>↓</span><img src='" + data.img + "'  width='250' height='200'/></p></li>"});
        });
    });

    socket.on('disconnect', function(){
        var endMessage = "<li class='li_center'>「" + name + "」さんが退出しました</li>";
        socket.broadcast.to(room).emit('messages', {value : endMessage});
    });

    socket.on('canvas_save', function(data) {
        Stamp.query({where: {user_id:name_id}, andWhere:{flag:0}}).fetch().then((model) => {
            if(model == null){
                io.to(socket.id).emit('save_err');
            }else{
                model.save({image:data.img, flag:1}).then((model) => {
                    io.to(socket.id).emit('save_ok'); 
                });
            }
        });
    });

    socket.on('stamp_load', function(){
        new Stamp().where('user_id', '=', name_id).fetchAll().then((collection) => {
            io.to(socket.id).emit('stamp_re', {collection : collection.toArray()});
        });
    });

    socket.on("stamp_delete",function(data){
        Stamp.query({where: {id:data.id}}).fetch().then((model) => {
            model.save({image:'', flag:0}).then((model) => {
                io.to(socket.id).emit('save_ok'); 
            });
        });
    });
    
});

http.listen(PORT, function(){
  console.log('server listening. Port:' + PORT);
});
