const ws = new WebSocket('ws://localhost:3000');
const localVideo = document.getElementById('localVideo');
const localScreen = document.getElementById('localScreen');

let videoStream = null, screenStream = null;
let pc = [];
let myuid = '1952120'// Math.floor(Math.random() * 100);
let options = {
  audioBitrate: 128000,
  videoBitrate: 2500000,
};

function openVideo() {
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  })
  .then(function(stream) {
    localVideo.srcObject = stream;
    videoStream = stream;
  })
  .catch(function(err) {
    console.log('getUserMedia() error: ', err);
  });
}

function openScreen() {
  navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false
  })
  .then(function(stream) {
    localScreen.srcObject = stream;
    screenStream = stream;
  })
  .catch(function(err) {
    console.log('getUserMedia() error: ', err);
  });
}

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
  xhr.open('POST', 'http://localhost:3000/upload');
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

function prepareDone() {
  ws.send(JSON.stringify({
    type: 'client_ready',
    uid: myuid
  }));
}

////////////////
openVideo();
// openScreen();

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

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  console.log('onmessage: ', msg.type);
  if (msg.type === 'server_ready') {
    console.log('??????????')
    prepareDone();
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

document.getElementById('call1').addEventListener('click', doCall1);
document.getElementById('call2').addEventListener('click', doCall2);
document.getElementById('save').addEventListener('click', save);

// 监听页面关闭
window.onbeforeunload = function() {
  // save();
}

// 页面打开后的行为
ws.onopen = function() {
  ws.send(JSON.stringify({
    type: 'client_ready',
    uid: myuid
  }));
}