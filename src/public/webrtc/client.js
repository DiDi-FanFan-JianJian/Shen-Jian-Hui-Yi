//////////////////////////////////////////////////////////////////////
// 全局变量
let ws = null;
let ws_server = 'wss://43.142.102.170/wss';
let videoStream = null, screenStream = null;
let videoRecorder = null, screenRecorder = null;
let videoChunks = [], screenChunks = [];
let pc = [];
let uidx = 0;
let myuid = localStorage.getItem('stu_no');
let uname = localStorage.getItem('stu_name');
let width = 960, height = 540, frame_rate = 15, trans_interval = 20000;
let options = {
  mimeType: 'video/webm;codecs=vp8',
  audioBitsPerSecond : 128000,
  videoBitsPerSecond : 500000,
}

//////////////////////////////////////////////////////////////////////
// dom
const localVideo = document.getElementById('localvideo');
const localScreen = document.getElementById('screenvideo');
document.getElementById('start1').addEventListener('click', openVideo);
document.getElementById('start2').addEventListener('click', openScreen);
document.getElementById('end1').addEventListener('click', endVideo);
document.getElementById('end2').addEventListener('click', endScreen);


//////////////////////////////////////////////////////////////////////
// 视频流
function openVideo() {
  let needAudio = $('input[name="need_audio1"]:radio:checked').val() === '1';
  navigator.mediaDevices.getUserMedia({
    video: {
      width: 1920,
      height: 1080,
      frameRate: frame_rate,
      aspectRatio: width / height
    },
    audio: needAudio
  })
  .then(function(stream) {
    localVideo.srcObject = stream;
    videoStream = stream;
    check_ready();
    initVideoRecorder();
    // 发送一个get请求
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://43.142.102.170/startvideo');
    xhr.send();
    $('#start1').attr("disabled", true);
    $('input[name=need_audio1]').attr('disabled', true);  
    $('#end1').attr('disabled', false);
  })
  .catch(function(err) {
    log('getUserMedia() error: ' + err);
  });
}

function openScreen() {
  let needAudio = $('input[name="need_audio2"]:radio:checked').val() === '1';
  navigator.mediaDevices.getDisplayMedia({
    video: {
      width: width,
      height: height,
      frameRate: frame_rate
    },
    audio: needAudio
  })
  .then(function(stream) {
    localScreen.srcObject = stream;
    screenStream = stream;
    check_ready();
    initScreenRecorder();
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://43.142.102.170/startscreen');
    xhr.send();
    $('#start2').attr("disabled", true);
    $('input[name=need_audio2]').attr('disabled', true);
    $('#end2').attr('disabled', false);
  })
  .catch(function(err) {
    log('getDisplayMedia() error: ' + err);
  });
}

function endVideo() {
  // peer断开连接
  for (let idx in pc) {
    let peer = pc[idx];
    if (peer.id[0] == 'v') {
      sendToServer({
        type: 'close',
        uid: peer.id
      });
      peer.close();
      delete pc[idx];
    }
  }
  if (videoRecorder) {
    videoRecorder.stop();
  }
  
    if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  localVideo.srcObject = null;
  $('#start1').attr('disabled', false);
  $('input[name=need_audio1]').attr('disabled', false);
  $('#end1').attr("disabled", true);
  check_ready();
}

function endScreen() {
  // peer断开连接
  for (let idx in pc) {
    let peer = pc[idx];
    if (peer.id[0] == 's') {
      sendToServer({
        type: 'close',
        uid: peer.id
      });
      peer.close();
      delete pc[idx];
    }
  }
  if (screenRecorder) {
    screenRecorder.stop();
  }
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  localScreen.srcObject = null;
  $('#start2').attr('disabled', false);
  $('input[name=need_audio2]').attr('disabled', false);
  $('#end2').attr("disabled", true);
  check_ready();
}

function initVideoRecorder() {
  log('initRecorder');
  videoRecorder = new MediaRecorder(videoStream, options);
  videoRecorder.ondataavailable = function(e) {
    videoChunks.push(e.data);
    saveVideo();
  }
  videoRecorder.onstop = function(e) {
    log('shut up video');
  }
  videoRecorder.start(trans_interval);
}

function initScreenRecorder() {
  log('initRecorder');
  screenRecorder = new MediaRecorder(screenStream, options);
  screenRecorder.ondataavailable = function(e) {
    screenChunks.push(e.data);
    saveScreen();
  }
  screenRecorder.onstop = function(e) {
    log('shut up screen');
  }
  screenRecorder.start(trans_interval);
}

function saveVideo() {
  if (videoChunks.length == 0)
    return;
  log(videoChunks.length);  
  log('saveVideo');
  let blob = new Blob(videoChunks, {type: 'video/webm'});
  let formData = new FormData();
  
  // -年-月-日-时-分-秒
  let date = new Date();
  // 日期均为两位数，不足补0
  let time = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + '-' + date.getHours().toString().padStart(2, '0') + '-' + date.getMinutes().toString().padStart(2, '0') + '-' + date.getSeconds().toString().padStart(2, '0');
  let name = 'u' + myuid + '-' + uname + '-video-' + time + '.webm';

  formData.append('video', blob, name);
  let xhr = new XMLHttpRequest();

  xhr.open('POST', 'https://43.142.102.170/uploadvideo');
  xhr.onload = function(e) {
    if (xhr.status == 200) {
      log('saveVideo success');
      videoChunks = [];
      if (videoRecorder.state !== 'recording') 
        return;
      videoRecorder.ondataavailable = function(e) {}
      videoRecorder.stop();
      initVideoRecorder();
    }
    else {
      log('saveVideo failed');
    }
  }
  xhr.send(formData);
}

function saveScreen() {
  if (screenChunks.length == 0)
    return;
  log(screenChunks.length);
  log('saveScreen');
  let blob = new Blob(screenChunks, {type: 'video/webm'});
  let formData = new FormData();
  // -年-月-日-时-分-秒
  let date = new Date();
  // 日期均为两位数，不足补0
  let time = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + '-' + date.getHours().toString().padStart(2, '0') + '-' + date.getMinutes().toString().padStart(2, '0') + '-' + date.getSeconds().toString().padStart(2, '0');
  let name = 'u' + myuid + '-' + uname + '-screen-' + time + '.webm';

  formData.append('screen', blob, name);
  let xhr = new XMLHttpRequest();

  xhr.open('POST', 'https://43.142.102.170/uploadscreen');
  xhr.onload = function(e) {
    if (xhr.status == 200) {
      log('saveScreen success');
      screenChunks = [];
      if (screenRecorder.state !== 'recording')
        return;
      screenRecorder.ondataavailable = function(e) {}
      screenRecorder.stop();
      initScreenRecorder();
    }
    else {
      log('saveScreen failed');
    }
  }
  xhr.send(formData);
}

function check_ready() {
  sendToServer({
    type: videoStream? 'client_ready': 'client_disconnect',
    uid: 'v' + myuid,
  });
  sendToServer({
    type: screenStream? 'client_ready': 'client_disconnect',
    uid: 's' + myuid,
  });
}

//////////////////////////////////////////////////////////////////////
// websocket

ws_connect();

function ws_connect() {
  ws = new WebSocket(ws_server);
  ws.onopen = ws_onopen;
  ws.onmessage = ws_onmessage;
  ws.onclose = ws_onclose;
  ws.onerror = ws_onclose;
}

function ws_onopen() {
  check_ready();
  log('ws_onopen');
}

function ws_onmessage(event) {
  let msg = JSON.parse(event.data);
  log('Received ' + msg.type);
  if (msg.type === 'start_video' && msg.uid === myuid) {
    make_call();
    return;
  }
  else if (msg.type === 'server_ready') {
    check_ready();
    return;
  }

  if (msg.target && msg.target.slice(-7) !== myuid)
    return;
  
  // 单播
  if (msg.type === 'answer') {
    handleAnswer(msg);
  }
  else if (msg.type === 'offer') {
    handleOffer(msg);
  }
  else if (msg.type === 'new-ice-candidate') {
    handleNewICECandidateMsg(msg);
  }
  else if (msg.type === 'close') {
    handleClose(msg);
  }
  else {
    log('what msg');
  }
}

function ws_onclose() {
  log('ws_onclose');
  setTimeout(function() {
    ws_connect();
  }, 1000);
}

//////////////////////////////////////////////////////////////////////
// 事件处理
async function makeVideoCall() {
  log('makeVideoCall');
  let uid = 'v' + myuid;
  if (pc[uid]) {
    log('video已经在通话中');
    return;
  }
  pc[uid] = new PeerConnection(uid, videoStream);
}

async function makeScreenCall() {
  log('makeScreenCall');
  let uid = 's' + myuid;
  if (pc[uid]) {
    log('screen已经在通话中');
    return;
  }
  pc[uid] = new PeerConnection(uid, screenStream);
}

async function handleOffer(msg) {
  let uid = msg.uid;
  log('handleOffer: ' + uid);
}

async function handleAnswer(msg) {
  log('handleAnswer');
  let desc = new RTCSessionDescription(msg.sdp);
  pc[msg.target].setRemoteDescription(desc);
}

async function handleNewICECandidateMsg(msg) {
  log('handleNewICECandidateMsg');
  let candidate = new RTCIceCandidate(msg.candidate);
  try {
    await pc[msg.target].pc.addIceCandidate(candidate);
  }
  catch (e) {
    log_err(e);
  }
}

function handleClose(msg) {
  for (let idx in pc) {
    let peer = pc[idx];
    for (let p of msg.pc_list) {
      if (peer.id === p) {
        peer.pc.close();
        delete pc[idx];
      }
    } 
  }
}

function make_call() {
  for (let idx in pc) {
    let peer = pc[idx];
    peer.close();
    delete pc[idx];
  }
  if (videoStream)
    makeVideoCall();
  if (screenStream)
    makeScreenCall();
}

// 页面关闭
window.onbeforeunload = function() {
  endVideo();
  endScreen();
}


//////////////////////////////////////////////////////////////////////
// 工具函数
function log(msg) {
  console.log(msg);
}

function log_err(err) {
  let time = new Date().toLocaleTimeString();
  console.trace(time + ": " + err);
}

function sendToServer(msg) {
  var msgJSON = JSON.stringify(msg);
  log("Sending '" + msg.type);
  ws.send(msgJSON);
}

//////////////////////////////////////////////////////////////////////
// peer 对象
const myIceServers = [
  {
    urls: 'turn:43.142.102.170:3478',
    username: 'webrtc',
    credential: '123456'
  },
  {
    urls: 'stun:43.142.102.170:3478',
  },
];

class PeerConnection {
  constructor(id, stream) {
    log('PeerConnection: ' + id);
    log('PeerConnection: ' + stream);
    this.id = id;
    this.stream = stream;
    this.pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'turn:43.142.102.170:3478',
          username: 'webrtc',
          credential: '123456'
        },
        {
          urls: 'stun:43.142.102.170:3478',
        },
      ]
    });

    this.pc.onicecandidate = this.handleIceCandidate.bind(this);
    this.pc.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
    this.pc.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
    this.pc.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
    this.pc.onnegotiationneeded = this.handleNegotiationNeeded.bind(this);
    this.pc.ontrack = this.handleTrack.bind(this);
    this.transceiver = null;

    stream.getTracks().forEach(
      this.transceiver = track => this.pc.addTransceiver(track, {streams: [stream]})
    );
  }

  // ice
  handleIceCandidate(event) {
    if (event.candidate) {
      log('ice candidate');
      sendToServer({
        type: 'new-ice-candidate',
        candidate: event.candidate,
        target: this.id,
        uid: this.id,
      });
    }
  }

  // ice state
  handleICEConnectionStateChangeEvent(event) {
    log('ice connection state change: ' + this.pc.iceConnectionState);
    switch (this.pc.iceConnectionState) {
      case 'disconnected':
      case 'failed':
      case 'closed':
        this.close();
        break;
    }
  }

  handleICEGatheringStateChangeEvent(event) {
    log('ice gathering state changed to: ' + this.pc.iceGatheringState);
  }

  handleSignalingStateChangeEvent(event) {
    log('signaling state changed to: ' + this.pc.signalingState);
    switch(this.pc.signalingState) {
      case 'closed':
        this.close();
        break;
    }
  }

  // track
  handleTrack(event) {
    log('track');
  }

  async handleNegotiationNeeded() {
    log('negotiation needed');
    try {
      const offer = await this.pc.createOffer();
      if (this.pc.signalingState != 'stable') {
        log('signaling state is not stable');
        return;
      }
      await this.pc.setLocalDescription(offer);

      log('sending offer');
      sendToServer({
        type: 'offer',
        uid: this.id,
        target: this.id,
        sdp: this.pc.localDescription
      });
    }
    catch (e) {
      log_err(e);
    }
  }

  // 断线
  close() {
    log('close');
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onnicecandidate = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.onicegatheringstatechange = null;
      this.pc.onnotificationneeded = null;

      // Stop all transceivers on the connection
      this.pc.getTransceivers().forEach(function(transceiver) {
        transceiver.stop();
      });

      this.pc.close();
    }
  }

  async setRemoteDescription(sdp) {
    log('set remote description');
    try {
      await this.pc.setRemoteDescription(sdp);
    }
    catch (e) {
      log_err(e);
    }
  }
}