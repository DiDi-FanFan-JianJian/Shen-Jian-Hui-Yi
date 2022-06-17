const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const app = express()
const wsInstance = require('express-ws')(app);
const WebServer = require('./webrtc_server');


/******** bodyParser ********/
app.use(bodyParser.json())


/******** ��̬�ļ� ********/
app.use(express.static(__dirname + '/public'))


/******** ��Ӧͷ ********/
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


/******** session ********/
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7��
    secure: false,
  }
}));


/******** ҳ������ ********/
const page_router = require('./routers/index')
app.use('/', page_router);


/******** api ********/
const api_router = require('./routers/api')
app.use('/', api_router);


/******** websocket ********/
app.ws('/', ws => {
  ws.on('message', data => {
    // δ��ҵ�����յ���Ϣ��ֱ�ӹ㲥
    wsInstance.getWss().clients.forEach(server => {
      if (server !== ws) {
        server.send(data);
      }
    });
  });
  // let webServer = new WebServer(ws);
});


/******** ���� ********/
app.listen(3000, () => {
  console.log('server running at port 3000');
})
