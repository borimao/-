var socketio = io();
$(function(){
    $("#canvas_move").slideToggle();
    var ul = document.getElementById('msg_h');
    //canvasの読み込み
    var canvas = document.getElementById('mycanvas');
    var ctx = canvas.getContext('2d');
    ctx.beginPath();

    //入室処理
    var roomname = $('#room_name').val();
    var loginname = $('#login_name').val();
    var roomid = $('#room_id').val();
    var loginid = $('#login_id').val();
    socketio.emit("client_to_server_join", {room_name:roomname, login_name:loginname, room_id:roomid, login_id:loginid});
    socketio.emit('stamp_load');

    

    //メッセージ送信
    $('#message_form').click(function(){
        var message = $('#input_msg').val();
        $('#input_msg').val('');
        socketio.emit("client_to_server_broadcast", {msg:message, name:loginname});
        return false;
    });

    //メッセージ受け取り
    socketio.on('messages',function(data){
        $('.messages').append(data.value);
        ul.scrollTop = ul.scrollHeight;
        console.log(ul.scrollTop + ' ' + ul.scrollHeight);
    });

    socketio.on('logs', function(data){
        var val = data.collection;
        var name_id = data.name_id;
        for(var i in val){
            if((val[i].user_id == name_id) && (val[i].imgflag == 0)) {
                $('.messages').prepend("<li class='li_right'><p class='chat_tx'>" + val[i].message + "</p></li>");
                ul.scrollTop = ul.scrollHeight;
            }
            else if((val[i].user_id != name_id) && (val[i].imgflag == 0)){
                $('.messages').prepend("<li class='li_left'><span class='na'>" + val[i].user.name + "</span><br><p class='chat_tx'>" + val[i].message + "</p></li>")
            }
            else if((val[i].user_id == name_id) && (val[i].imgflag == 1)){
                $('.messages').prepend("<li class='li_right'><p><span class='upcanvas' id='" + val[i].message +"'>↓</span><img src='" + val[i].message + "'  width='250' height='200'/></p></li>");
            }
            else if((val[i].user_id != name_id) && (val[i].imgflag == 1)){
                $('.messages').prepend("<li class='li_left'><span class='na'>" + val[i].user.name + "</span><br><p><img src='" + val[i].message + "'  width='250' height='200'/><span class='upcanvas' id='" + val[i].message +"'>↓</span></p></li>")
            }
        }
        var upcanvas = document.getElementsByClassName("upcanvas");
        for (i = 0; i < upcanvas.length; i++) {
            console.log('load');
            upcanvas[i].addEventListener("click", canvasUp);
        }
    });

    //canvasの送信
    $('#canvas_form').click(function(){
        var image = canvas.toDataURL("image/png");
        socketio.emit("client_to_server_broadcast_canvas", {img:image});
        $("#canvas_move").slideToggle();
        $('.messages').toggleClass('up_msg', false);
        $("#canvas_sc").text("　↑　");
        return false;
    });

    //canvasの受け取り
    socketio.on('gocanvas',function(data){
        console.log('メッセージ表示');
        var text = "[" + data.name + "]<br><img src='" + data.img + "'  width='250' height='200'/><span class='upcanvas' id='" + data.img +"'>↓</span>";
        $('.messages').append(data.value);
        var upcanvas = document.getElementsByClassName("upcanvas");
        for (i = 0; i < upcanvas.length; i++) {
            console.log('load');
            upcanvas[i].addEventListener("click", canvasUp);
        }
        ul.scrollTop = ul.scrollHeight;
    });

    //画像読みこみ
    function canvasUp() {
        console.log('up');
        var img = new Image();
        img.src = this.id;
        ctx.drawImage(img, 0, 0, 500, 400);
        var data = document.getElementById("canvas_sc").innerHTML;
        if(data == "　↑　"){
            $("#canvas_move").slideToggle();
            $('.messages').toggleClass('up_msg', true);
            $("#canvas_sc").text("　↓　");
        }
    }

    $('#canvas_sc').on('click', function(){
        var data = document.getElementById("canvas_sc").innerHTML;
        if(data == "　↑　"){
            $("#canvas_move").slideToggle();
            $('.messages').toggleClass('up_msg', true);
            $("#canvas_sc").text("　↓　");
        }
        else if(data == "　↓　"){
            $("#canvas_move").slideToggle();
            $('.messages').toggleClass('up_msg', false);
            $("#canvas_sc").text("　↑　");
        }
        
    });

    
   

    
    
});

