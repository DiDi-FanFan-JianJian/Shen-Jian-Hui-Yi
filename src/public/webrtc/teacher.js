let ws = null;
let ws_server = 'wss://43.142.102.170/wss';

function log(msg) {
  console.log(msg);
}

ws_connect();

function ws_connect() {
  ws = new WebSocket(ws_server);
  ws.onopen = ws_onopen;
  ws.onmessage = ws_onmessage;
  ws.onclose = ws_onclose;
  ws.onerror = ws_onclose;
}

function ws_onmessage(msg) {
  msg = JSON.parse(msg.data);
  if (msg.type === 'client_ready') {
    let uid = msg.uid;
    $('#' + uid).text('已连接');
    $('#' + uid).css('color', 'blue');
  }
  else if (msg.type === 'client_disconnect') {
    let uid = msg.uid;
    $('#' + uid).text('未连接');
    $('#' + uid).css('color', 'red');
  }
}

function ws_onopen() {
  log('ws_onopen');
}

function ws_onclose() {
  log('ws_onclose');
  setTimeout(function() {
    ws_connect();
  }, 1000);
}

// 页面打开后的行为
window.onload = function() {
  // 一秒后执行
  setTimeout(function() {
    ws.send(JSON.stringify({
      type: 'server_ready',
    }));
  }, 1000);

  // 定时发送心跳
  setInterval(function() {
    ws.send(JSON.stringify({
      type: 'server_ready',
    }));
  }, 10000);
}