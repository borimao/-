var socketio = io();
$(function() {
  var canvas = document.getElementById('mycanvas')
  var ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, 500, 400);

  
  var drawing = false;
  var defosize = 10;
  var defocolor = "#000000";
  var defoalpha = 10;

  var mouseX = "";
  var mouseY = "";


  canvas.addEventListener('mousemove', onMove, false);
  canvas.addEventListener('mousedown', onClick, false);
  canvas.addEventListener('mouseup', drawEnd, false);
  canvas.addEventListener('mouseout', drawOut, false);

  function onMove(e) {
          if(!drawing){
            return
          }

          var rect = e.target.getBoundingClientRect();
          var X = e.clientX - rect.left;
          var Y = e.clientY - rect.top;
          draw(X, Y);

  };

  function onClick(e) {
          drawing = true;
          var rect = e.target.getBoundingClientRect();
          var X = e.clientX - rect.left;
          var Y = e.clientY - rect.top;
          draw(X, Y);

  };

  function draw(X, Y) {
      ctx.beginPath();
      ctx.globalAlpha = defoalpha * 0.1;
      if (mouseX === "") {
          ctx.moveTo(X, Y);
      } else {
          ctx.moveTo(mouseX, mouseY);
      }
      ctx.lineTo(X, Y);
      ctx.lineCap = "round";
      ctx.lineWidth = defosize * 3;
      ctx.strokeStyle = defocolor;
      ctx.stroke();
      mouseX = X;
      mouseY = Y;
  };

  function drawEnd() {
      drawing = false;
      mouseX = "";
      mouseY = "";
  }

  function drawOut(){
    mouseX = "";
    mouseY = "";
  }

  var menuIcon = document.getElementsByClassName("menuicon");
  for (i = 0; i < menuIcon.length; i++) {
      menuIcon[i].addEventListener("click", canvasMenu)
  }

  function canvasMenu() {
    defocolor = "#" + this.id.slice(5, this.id.length);
  }

  var hutosa = document.getElementById("hutosa");
  $(hutosa).on('input',function() {
    $('#h_na').html(hutosa.value);
  });

  $(hutosa).change(function() {
    defosize = hutosa.value;
  });

  var akarusa = document.getElementById("akarusa");
  $(akarusa).on('input',function() {
    $('#a_na').html(akarusa.value);
  });

  $(akarusa).change(function() {
    defoalpha = akarusa.value;
  });

  $("#ollclear").click(function(){
    ctx.fillStyle = "#f5f5f5";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, 500, 400);
  });


  $('#canvas_save').on('click', function(){
    var image = canvas.toDataURL("image/png");
    socketio.emit("canvas_save", {img:image});
  });

  socketio.on('save_err', function(){
      alert('これ以上保存できません');
  });

  socketio.on('save_ok', function(){
    console.log('ok');
    socketio.emit('stamp_load');
  });

  var stap_func = 0;
  socketio.on('stamp_re', function(data){
    $('.stampmenu').each(function(i,elem){
      $(elem).remove();
    })
    $('.stampmenu').slideUp();
    var val = data.collection;
    $('.stamp').each(function(i,elem){
      $(elem).off();
      $('#'+ i).off();
      $('#go_stamp'+i).off();
      $('#new_stamp'+i).off();
      $('#del_stamp'+i).off();
      $(elem).attr('src','');
      if(val[i].flag == 1){
        $(elem).attr('src',val[i].image);
        $(elem).after("<div class='stampmenu' id='" + i +"'><a href='#' class='go_stamp' id='go_stamp" + i 
        +"'></a><p>送る</p><a href='#' class='new_stamp' id='new_stamp" + i +"'>←</a><a href='#' class='del_stamp' id='del_stamp" + i +"'>削除</a></div>");
        $('#'+ i).slideUp();
        $(elem).hover(
          function(){
            $('.stampmenu').slideUp();
            $('#'+ i).slideDown();
            console.log('updwn');
          },
          function(){}
        );
        $('#'+i).hover(
          function(){},
          function(){
            $('#'+i).slideUp();
          }
        );
        $('#go_stamp'+i).click(function(){
          socketio.emit("client_to_server_broadcast_canvas", {img:val[i].image});
        });
        $('#new_stamp'+i).click(function(){
          var img = new Image();
          img.src = val[i].image;
          ctx.drawImage(img, 0, 0, 500, 400);
        });
        $('#del_stamp'+i).click(function(){
          socketio.emit("stamp_delete", {id:val[i].id});
        })
      }
      
    });
    

  });
  
  
  

  


});