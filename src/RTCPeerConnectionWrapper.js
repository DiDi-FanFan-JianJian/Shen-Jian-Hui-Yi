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

module.exports = RTCPeerConnectionWrapper;