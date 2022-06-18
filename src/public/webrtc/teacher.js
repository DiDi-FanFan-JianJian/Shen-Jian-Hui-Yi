const ws = new WebSocket('ws://43.142.102.170:3000');

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  console.log(msg);
  if (msg.type === 'client_ready') {
    let uid = msg.uid;
    console.log($('#' + uid).text());
    $('#' + uid).text('已连接');
    $('#' + uid).css('color', 'blue');
  }
  else if (msg.type === 'client_disconnect') {
    let uid = msg.uid;
    console.log($('#' + uid).text());
    $('#' + uid).text('未连接');
    $('#' + uid).css('color', 'red');
  }
}

// 页面打开后的行为
window.onload = function() {
  // 一秒后执行
  setTimeout(function() {
    ws.send(JSON.stringify({
      type: 'server_ready',
    }));
  }, 1000);
}