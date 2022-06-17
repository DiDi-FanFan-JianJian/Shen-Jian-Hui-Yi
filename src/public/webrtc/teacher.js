const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  if (msg.type === 'client_ready') {
    let uid = msg.uid;
    $('#' + uid).text('disconnected');
  }
}

// ҳ��򿪺����Ϊ
ws.onopen = function() {
  ws.send(JSON.stringify({
    type: 'server_ready',
  }));
}