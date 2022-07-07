//////////////////////////////////////////////////////////////////////
// 全局变量
let ws = null;
let ws_server = 'wss://43.142.102.170/wss';
let pc = [];
const stu_no = getQueryVariable('stu_no');

//////////////////////////////////////////////////////////////////////
// dom
const remoteVideo = document.getElementById('remoteVideo');
const remoteScreen = document.getElementById('remoteScreen');

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

function ws_onmessage(event) {
  let msg = JSON.parse(event.data);

  if (!msg.uid || msg.uid.slice(-7) !== stu_no)
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
    handleRemoteClose(msg);
  }
  else if (msg.type === 'client_ready' && !pc[msg.uid]) {
    make_call();
  }
  else {
    log('??????????????????? what is this? ' + msg.type);
  }
}

// 建立连接
function ws_onopen() {
  make_call();
}

function ws_onclose() {
  log('ws_onclose');
  setTimeout(function() {
    ws_connect();
  }, 1000);
}

//////////////////////////////////////////////////////////////////////
// 事件处理
async function handleOffer(msg) {
  let uid = msg.uid;
  log('handleOffer: ' + uid);
  if (pc[uid]) {
    log(uid + ' already exists');
    return;
  }

  pc[uid] = new PeerConnection(uid);
  let desc = new RTCSessionDescription(msg.sdp);
  if (pc[uid].pc.signalingState !== 'stable') {
    log('handleOffer: signalingState: ' + pc[uid].pc.signalingState);
    await Promise.all([
      pc[uid].pc.setLocalDescription({type: 'rollback'}),
      pc[uid].pc.setRemoteDescription(desc),
    ]);
    return;
  }
  else {
    await pc[uid].pc.setRemoteDescription(desc);
  }

  await pc[uid].pc.setLocalDescription(await pc[uid].pc.createAnswer());
  sendToServer({
    type: 'answer',
    target: uid,
    sdp: pc[uid].pc.localDescription,
  });
}
 
async function handleAnswer(msg) {
  log('handleAnswer');
  let desc = new RTCSessionDescription(msg.sdp);
  pc[msg.target].setRemoteDescription(desc);
}

async function handleNewICECandidateMsg(msg) {
  log('handleNewICECandidateMsg');
  if (!pc[msg.uid]) {
    log('not me ' + msg.uid);
    return;
  }
  let candidate = new RTCIceCandidate(msg.candidate);
  try {
    await pc[msg.target].pc.addIceCandidate(candidate);
  }
  catch (e) {
    log_err(e);
  }
}

function handleRemoteClose(msg) {
  if (pc[msg.uid]) {
    pc[msg.uid].close();
    delete pc[msg.uid];
    if (msg.uid[0] === 's')
      remoteScreen.srcObject = null;
    else
      remoteVideo.srcObject = null;
  }
}

// 页面关闭
window.onbeforeunload = function() {
  let pc_list = [];
  for (let idx in pc) {
    let peer = pc[idx];
    pc_list.push(peer.id);
  }
  sendToServer({
    type: 'close',
    target: stu_no,
    pc_list: pc_list,
  });
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

function make_call() {
  log('make_call:' + stu_no);
  sendToServer({
    type: 'start_video',
    uid: stu_no,
  });
}

function getQueryVariable(variable)
{
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    if(pair[0] == variable){return pair[1];}
  }
  return(false);
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
  constructor(id) {
    console.log('PeerConnection: ' + id);
    this.id = id;
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
  }

  // ice
  handleIceCandidate(event) {
    if (event.candidate) {
      log('ice candidate: ' + event.candidate.candidate);
      sendToServer({
        type: 'new-ice-candidate',
        candidate: event.candidate,
        target: this.id
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
    log('track: ' + this.id);
    if (this.id[0] === 'v') {
      remoteVideo.srcObject = event.streams[0];
    }
    else {
      remoteScreen.srcObject = event.streams[0];
    }
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