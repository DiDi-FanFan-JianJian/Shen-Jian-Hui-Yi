const RTCPeerConnectionWrapper = require('./RTCPeerConnectionWrapper');

function WebServer(ws) {
  this.ws = ws;
  this.peers = [];
  this.ws.onmessage = this.handleMessage.bind(this);
}

WebServer.prototype.handleMessage = function(msg) {
  msg = JSON.parse(msg.data);
  if (msg.type === 'offer') {
    this.handleRemoteOffer(msg);
  }
  else if (msg.type === 'candidate') {
    this.handleRemoteCandidate(msg);
  }
  else if (msg.type === 'answer') {
  }
}

WebServer.prototype.handleRemoteOffer = function(msg) {
  console.log('handleRemoteOffer: ', msg.uid);
  let uid = msg.uid;
  if (this.peers[uid] == null) {
    this.peers[uid] = new RTCPeerConnectionWrapper(uid, null);
  }
  let sdp = new RTCSessionDescription({
    type: 'offer',
    sdp: msg.sdp
  });
  this.peers[uid].setRemoteDescription(sdp);
  this.peers[uid].createAnswer();
}

module.exports = WebServer;