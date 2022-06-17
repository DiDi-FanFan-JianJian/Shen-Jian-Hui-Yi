const ws = new WebSocket('ws://43.142.102.170:3000');
const remoteVideo = document.getElementById('remoteVideo');
const remoteScreen = document.getElementById('remoteScreen');

let pc = [];
/////////////////

function addNewUser(uid) {
  console.log('addNewUser: ', uid);
  if (pc[uid] == null) {
    pc[uid] = new RTCPeerConnectionWrapper(uid);
  }
}

function handleRemoteOffer(msg) {
  console.log('handleRemoteOffer:', msg.uid);
  let uid = msg.uid;
  if (pc[uid] == null) {
    pc[uid] = new RTCPeerConnectionWrapper(uid);
  }
  let sdp = new RTCSessionDescription({
    type: 'offer',
    sdp: msg.sdp
  });
  pc[uid].setRemoteDescription(sdp);
  pc[uid].createAnswer();
}

function handleRemoteCandidate(msg) {
  console.log('handleRemoteCandidate');
  let candidate = new RTCIceCandidate({
    sdpMLineIndex: msg.label,
    candidate: msg.candidate
  });
  pc[msg.uid].addIceCandidate(candidate);
}

function handleRemoteAnswer(msg) {
  console.log('handleRemoteAnswer');
  let sdp = new RTCSessionDescription({
    type: 'answer',
    sdp: msg.sdp
  });
  pc[msg.uid].setRemoteDescription(sdp);
}

function handleRemoteClose(msg) {
  console.log('handleRemoteClose: ', msg.uid);
  if (pc[msg.uid] != null) {
    pc[msg.uid].close();
    pc[msg.uid] = null;
  }
}

///////////////// RTCPeerConnectionWrapper Class /////////////////////////

function RTCPeerConnectionWrapper(uid) {
  this.uid = uid;
  this.pc = this.create();
  this.remoteSdp = null;
  this.video = null;
} 

RTCPeerConnectionWrapper.prototype.create = function() {
  let pc = new RTCPeerConnection();

  pc.onicecandidate = this.handleIceCandidate.bind(this);

  pc.ontrack = this.hanndleRemoteAdded.bind(this);

  pc.onremovestream = this.hanndleRemoteRemoved.bind(this);
  
  pc.oniceconnectionstatechange = this.handleStateChange.bind(this);

  return pc;
}

RTCPeerConnectionWrapper.prototype.handleStateChange = function(event) {
  console.log('handleStateChange: ', this.uid);
  if (this.pc.iceConnectionState == 'disconnected') {
    console.log('handleStateChange: disconnected');
    this.close();
  }
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
      candidate: event.candidate.candidate
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
  this.video.autoplay = false;
  this.video.controls = true;
  // this.video.muted = true;
  this.video.srcObject = event.streams[0];
  document.body.appendChild(this.video);
}


RTCPeerConnectionWrapper.prototype.createAnswerAndSendMessage = function(sessionDescription) {
  console.log('createAnswerAndSendMessage: ', this.uid);
  this.pc.setLocalDescription(sessionDescription);
  let msg = {
    type: 'answer',
    target: this.uid,
    sdp: sessionDescription.sdp
  };
  ws.send(JSON.stringify(msg));
}

RTCPeerConnectionWrapper.prototype.handleCreateOfferError = function(error) {
  console.log('handleCreateOfferError: ', this.uid);
  console.log(error);
}

RTCPeerConnectionWrapper.prototype.createAnswer = function() {
  console.log('createAnswer: ', this.uid);
  this.pc.createAnswer(this.createAnswerAndSendMessage.bind(this), this.handleCreateOfferError.bind(this));
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

RTCPeerConnectionWrapper.prototype.close = function() {
  console.log('close: ', this.uid);
  this.pc.close();
}

////////////////

function doAnswer(uid) {
  if (pc[uid] == null) {
    creatPeerConnection();
  }
  pc[uid].createAnswer().then(createAnswerAndSendMessage, handleCreateOfferError);
}

ws.onmessage = function(msg) {
  msg = JSON.parse(msg.data);
  if (msg.type === 'offer') {
    handleRemoteOffer(msg);
  }
  else if (msg.type === 'candidate') {
    handleRemoteCandidate(msg);
  }
  else if (msg.type === 'answer') {
    handleRemoteAnswer(msg); 
  }
  else if (msg.type === 'newUser') {
    addNewUser(msg.uid);
  }
  else if (msg.type === 'close') {
    handleRemoteClose(msg);
  }
}