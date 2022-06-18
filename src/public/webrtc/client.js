const ws = new WebSocket('wss://43.142.102.170/wss');
const localVideo = document.getElementById('localvideo');
const localScreen = document.getElementById('screenvideo');

let videoStream = null, screenStream = null;
let videoRecorder = null, screenRecorder = null;
let videoChunks = [], screenChunks = [];
let pc = [];
let idx = 0;
let myuid = localStorage.getItem('stu_no');
let uname = localStorage.getItem('stu_name');
console.log(uname);
let options = {
  audioBitrate: 128000,
  videoBitrate: 2500000,
};

////////////////

function RTCPeerConnectionWrapper(uid, stream) {
  this.uid = uid;
  this.pc = this.create(stream);
  this.stream = stream;
  this.remoteSdp = null;
  this.video = null;
}

RTCPeerConnectionWrapper.prototype.create = function(stream) {
  let pc = new RTCPeerConnection();

  pc.onicecandidate = this.handleIceCandidate.bind(this);

  pc.onaddstream = this.hanndleRemoteAdded.bind(this);

  pc.onremovestream = this.hanndleRemoteRemoved.bind(this);

  stream.getTracks().forEach(track => {
    console.log('addTrack: ', this.uid);
    pc.addTrack(track, stream);
  });

  return pc;
}

RTCPeerConnectionWrapper.prototype.hanndleRemoteRemoved = function(event) {
  console.log('handleRemoteRemoved');
}

RTCPeerConnectionWrapper.prototype.handleIceCandidate = function(event) {
  console.log('handleIceCandidate: ', this.uid);
  if (event.candidate) {
    let msg = {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      target: this.uid,
      candidate: event.candidate.candidate,
      uid: this.uid,
    };
    ws.send(JSON.stringify(msg));
  }
  else {
    console.log('End of candidates.');
  }
}

RTCPeerConnectionWrapper.prototype.hanndleRemoteAdded = function(event) {
  console.log('onaddstream: ', this.uid);
  this.video = document.createElement('video');
  this.video.srcObject = event.stream;
  this.video.autoplay = true;
  document.body.appendChild(this.video);
  this.video.load();
}


RTCPeerConnectionWrapper.prototype.createAnswerAndSendMessage = async function(sessionDescription) {
  console.log('createAnswerAndSendMessage: ', this.uid);
  this.pc.setLocalDescription(sessionDescription);
  let msg = {
    type: 'answer',
    target: this.uid,
    sdp: sessionDescription.sdp,
    uid: this.uid,
  };
  ws.send(JSON.stringify(msg));
}

RTCPeerConnectionWrapper.prototype.createOfferAndSendMessage = async function(sessionDescription) {
  console.log('createOfferAndSendMessage: ', this.uid);
  this.pc.setLocalDescription(sessionDescription);
  let msg = {
    type: 'offer',
    target: this.uid,
    sdp: sessionDescription.sdp,
    uid: this.uid
  };
  ws.send(JSON.stringify(msg));
}

RTCPeerConnectionWrapper.prototype.handleCreateOfferError = function(error) {
  console.log('handleCreateOfferError: ', this.uid);
  console.log(error);
}

RTCPeerConnectionWrapper.prototype.handleCreateAnswerError = function(error) {
  console.log('handleCreateAnswerError: ', this.uid);
  console.log(error);
}

RTCPeerConnectionWrapper.prototype.createOffer = function() {
  console.log('createOffer: ', this.uid);
  this.pc.createOffer(this.createOfferAndSendMessage.bind(this), this.handleCreateOfferError);
}

RTCPeerConnectionWrapper.prototype.createAnswer = function() {
  console.log('createAnswer: ', this.uid);
  this.pc.createAnswer(this.createAnswerAndSendMessage.bind(this), this.handleCreateAnswerError.bind(this));
}

RTCPeerConnectionWrapper.prototype.setRemoteDescription = function(sessionDescription) {
  console.log('setRemoteDescription: ', this.uid);
  if (this.remoteSdp != null) 
    return;
  this.remoteSdp = sessionDescription;
  this.pc.setRemoteDescription(sessionDescription);
}

RTCPeerConnectionWrapper.prototype.addIceCandidate = function(candidate) {
  console.log('addIceCandidate: ', this.uid);
  this.pc.addIceCandidate(candidate);
}

/////////////////

function handleRemoteOffer(msg) {
  console.log('handleRemoteOffer');
  if (pc[msg.target] == null) {
    alert('error');
    creatPeerConnection();
  }
  let sdp = new RTCSessionDescription({
    type: 'offer',
    sdp: msg.sdp
  });
  pc[msg.target].setRemoteDescription(sdp);
  doAnswer();
}

function handleRemoteCandidate(msg) {
  console.log('handleRemoteCandidate');
  let candidate = new RTCIceCandidate({
    sdpMLineIndex: msg.label,
    candidate: msg.candidate
  });
  pc[msg.target].addIceCandidate(candidate);
}

function handleRemoteAnswer(msg) {
  console.log('handleRemoteAnswer');
  let sdp = new RTCSessionDescription({
    type: 'answer',
    sdp: msg.sdp
  });
  pc[msg.target].setRemoteDescription(sdp);
}

////////////////
function doCall1() {
  let id = 'v' + idx++ + myuid;
  if (pc[id]) {
    console.log('error');
    return;
  }
  pc[id] = new RTCPeerConnectionWrapper(id, videoStream);
  pc[id].createOffer();
}

function doCall2() {
  let id = 's' + idx++ + myuid;
  if (pc[id]) {
    console.log('error');
    return;
  }
  pc[id] = new RTCPeerConnectionWrapper(id, screenStream);
  pc[id].createOffer();
}

function makeCall() {
  if (videoStream) {
    doCall1();
  }
  if (screenStream) {
    doCall2();
  }
}

function saveScreen() {
  if (screenChunks.length == 0) 
    return;
  let blob = new Blob(screenChunks, {type: 'video/webm'});
  let formData = new FormData();
  // -年-月-日-时-分-秒
  let date = new Date();
  let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds();
  let name = 'u' + myuid + '-' + uname + '-screen-' + time + '.webm';
  formData.append('file', blob, name);
  let xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://43.142.102.170/upload');
  xhr.send(formData);
  screenChunks = [];
}

function saveVideo() {
  if (videoChunks.length == 0)
    return;
  let blob = new Blob(videoChunks, {type: 'video/webm'});
  let formData = new FormData();
  // -年-月-日-时-分-秒
  let date = new Date();
  let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds();
  let name = 'u' + myuid + '-' + uname + '-video-' + time + '.webm';
  formData.append('file', blob, name);
  let xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://43.142.102.170/upload');
  xhr.send(formData);
  videoChunks = [];
}

function initScreenRecorder(stream = screenStream) {
  console.log('initScreenRecorder');
  screenRecorder = new MediaRecorder(stream, options);
  screenChunks = [];
  screenRecorder.ondataavailable = function(e) {
    console.log('recording screen');
    screenChunks.push(e.data);
    saveScreen();
  }
  screenRecorder.onstop = function(e) {
    console.log('stop recording screen');
    saveScreen();
  }
  screenRecorder.start();
  // 5秒后停止
  setTimeout(function() {
    if (screenRecorder.state != "inactive") {
      screenRecorder.stop();
      initScreenRecorder();
    }
  }, 5000);
}

function initVideoRecorder(stream = videoStream) {
  console.log('initVideoRecorder');
  videoRecorder = new MediaRecorder(stream, options);
  videoChunks = [];
  videoRecorder.ondataavailable = function(e) {
    console.log('recording video');
    videoChunks.push(e.data);
    saveVideo();
  }
  videoRecorder.onstop = function(e) {
    console.log('stop recording video');
    saveVideo();
  }
  videoRecorder.start();
  // 5秒后停止
  setTimeout(function() {
    if (videoRecorder.state != "inactive") {
      videoRecorder.stop();
      initVideoRecorder();
    }
  }, 5000);
}

function openVideo() {
  let needAudio = $('input[name="need_audio1"]:radio:checked').val() === '1';
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: needAudio
  })
  .then(function(stream) {
    localVideo.srcObject = stream;
    videoStream = stream;
    check_ready();
    initVideoRecorder();
  })
  .catch(function(err) {
    console.log('getUserMedia() error: ', err);
  });
}

function openScreen() {
  let needAudio = $('input[name="need_audio2"]:radio:checked').val() === '1';
  navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: needAudio
  })
  .then(function(stream) {
    localScreen.srcObject = stream;
    screenStream = stream;
    check_ready();
    initScreenRecorder();
  })
  .catch(function(err) {
    console.log('getUserMedia() error: ', err);
  });
}

function endVideo() {
  // peer 断开连接
  for (let idx in pc) {
    let peer = pc[idx];
    if (peer.uid[0] == 'v') {
      let msg = {
        type: 'close',
        uid: peer.uid,
      }
      ws.send(JSON.stringify(msg));
      peer.pc.close();
      delete pc[idx];
    }
  }
  videoRecorder.stop();

  if (videoStream != null) {
    videoStream.getTracks().forEach(function(track) {
      track.stop();
    });
    videoStream = null;
  }
  localVideo.srcObject = null;
  check_ready();
}

function endScreen() {
  // peer 断开连接
  for (let idx in pc) {
    let peer = pc[idx];
    if (peer.uid[0] == 's') {
      let msg = {
        type: 'close',
        uid: peer.uid,
      }
      ws.send(JSON.stringify(msg));
      peer.pc.close();
      delete pc[idx];
    }
  }
  screenRecorder.stop();

  if (screenStream != null) {
    screenStream.getTracks().forEach(function(track) {
      track.stop();
    });
    screenStream = null;
  }
  localScreen.srcObject = null;
  check_ready();
}

/////////////////////////////////////

function check_ready() {
  if (videoStream) {
    ws.send(JSON.stringify({
      type: 'client_ready',
      uid: 'v' + myuid
    }));
  }
  else {
    ws.send(JSON.stringify({
      type: 'client_disconnect',
      uid: 'v' + myuid
    }));
  }
  if (screenStream) {
    ws.send(JSON.stringify({
      type: 'client_ready',
      uid: 's' + myuid
    }));
  }
  else {
    ws.send(JSON.stringify({
      type: 'client_disconnect',
      uid: 's' + myuid
    }));
  }
}

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  console.log('onmessage: ', msg.type);
  // 广播
  if (msg.type === 'server_ready') {
    check_ready();
    return;
  }
  else if (msg.type === 'start_video' && msg.uid === myuid) {
    makeCall();
    return;
  }
  // 单播
  if (msg.target.slice(-7) !== myuid)
    return;
  if (msg.type === 'offer') {
    handleRemoteOffer(msg);
  }
  else if (msg.type === 'candidate') {
    handleRemoteCandidate(msg);
  }
  else if (msg.type === 'answer') {
    handleRemoteAnswer(msg);
  }
  else if (msg.type === 'close') {
    for (let idx in pc) {
      let peer = pc[idx];
      if (peer.uid.slice(-7) === msg.uid) {
        peer.pc.close();
        delete pc[idx];
      }
    }
  }
}

document.getElementById('start1').addEventListener('click', openVideo);
document.getElementById('start2').addEventListener('click', openScreen);
document.getElementById('end1').addEventListener('click', endVideo);
document.getElementById('end2').addEventListener('click', endScreen);

// 监听页面关闭
window.onbeforeunload = function() {
  endVideo();
  endScreen();
}

// ws连接成功
ws.onopen = function() {
  check_ready();
}