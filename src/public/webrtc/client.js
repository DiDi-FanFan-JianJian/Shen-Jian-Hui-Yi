const ws = new WebSocket('ws://43.142.102.170:3000');
const localVideo = document.getElementById('localvideo');
const localScreen = document.getElementById('screenvideo');

let videoStream = null, screenStream = null;
let pc = [];
let myuid = '1952120'// Math.floor(Math.random() * 100);
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
  this.chunks = [];
  this.recorder = new MediaRecorder(this.stream, options);
  this.recorder.ondataavailable = this.handleDataAvailable.bind(this);
  this.recorder.onstop = this.saveVideo.bind(this);
  this.recorder.start(1000);
}

RTCPeerConnectionWrapper.prototype.handleDataAvailable = function(event) {
  console.log('recording'); 
  this.chunks.push(event.data);
}

RTCPeerConnectionWrapper.prototype.saveVideo = function() {
  let blob = new Blob(this.chunks, { 'type': 'video/webm' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url; 
  a.download = 'video.webm';
  a.click();
  upload(blob);
}

function upload(blob) {
  let formData = new FormData();
  formData.append('file', blob);
  let xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://43.142.102.170:3000/upload');
  xhr.send(formData);
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
      uid: myuid
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
    uid: myuid
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
    uid: myuid
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
  if (pc[myuid] == null) {
    creatPeerConnection();
  }
  let sdp = new RTCSessionDescription({
    type: 'offer',
    sdp: msg.sdp
  });
  pc[myuid].setRemoteDescription(sdp);
  doAnswer();
}

function handleRemoteCandidate(msg) {
  console.log('handleRemoteCandidate');
  let candidate = new RTCIceCandidate({
    sdpMLineIndex: msg.label,
    candidate: msg.candidate
  });
  pc[myuid].addIceCandidate(candidate);
}

function handleRemoteAnswer(msg) {
  console.log('handleRemoteAnswer');
  let sdp = new RTCSessionDescription({
    type: 'answer',
    sdp: msg.sdp
  });
  pc[myuid].setRemoteDescription(sdp);
}

////////////////
function doCall1() {
  if (pc[myuid] == null) {
    pc[myuid] = new RTCPeerConnectionWrapper(-1, videoStream);
  }
  pc[myuid].createOffer();
}

function doCall2() {
  ++myuid;
  if (pc[myuid] == null) {
    pc[myuid] = new RTCPeerConnectionWrapper(-1, screenStream);
  }
  pc[myuid].createOffer();
}

function save() {
  pc[myuid].recorder.stop();
}

function close() {
  if (pc[myuid] != null) {
    let msg = {
      type: 'close',
      target: -1,
      uid: myuid
    };
    ws.send(JSON.stringify(msg));
  }
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
  })
  .catch(function(err) {
    console.log('getUserMedia() error: ', err);
  });
}

function endVideo() {
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
  console.log(videoStream);
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
  if (msg.type === 'server_ready') {
    check_ready();
  }
  if (msg.target !== myuid)
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