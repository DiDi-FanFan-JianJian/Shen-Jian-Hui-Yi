const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  if (msg.type === 'client_ready') {
    let uid = msg.uid;
    $('#' + uid).text('disconnected');
  }
}

// 页面打开后的行为
ws.onopen = function() {
  ws.send(JSON.stringify({
    type: 'server_ready',
  }));
}