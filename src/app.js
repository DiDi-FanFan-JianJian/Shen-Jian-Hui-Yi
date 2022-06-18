const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const app = express()
const cors = require('cors');
const wsInstance = require('express-ws')(app);

/******** bodyParser ********/
app.use(bodyParser.json())


/******** ��̬�ļ� ********/
app.use(express.static(__dirname + '/public'))


/******** ��Ӧͷ ********/
app.use(cors({
  "origin": "*",//�˴�Ҳ���Ը���Ϊ�������ָ�����������磺yousite.com
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 200
}));

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
