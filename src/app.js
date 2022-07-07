const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const app = express()
const cors = require('cors');
const wsInstance = require('express-ws')(app);

/******** bodyParser ********/
app.use(bodyParser.json())


/******** 静态文件 ********/
app.use(express.static(__dirname + '/public'))


/******** 跨域 ********/
app.use(cors({
  "origin": "*",
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
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7天
    secure: false,
  }
}));


/******** 页面请求 ********/
const page_router = require('./routers/index')
app.use('/', page_router);


/******** api ********/
const api_router = require('./routers/api')
app.use('/', api_router);


/******** websocket ********/
app.ws('/ws', ws => {
  ws.on('message', data => {
    // 未做业务处理，收到消息后直接广播
    wsInstance.getWss().clients.forEach(server => {
      if (server !== ws) {
        server.send(data);
      }
    });
  });
  // let webServer = new WebServer(ws);
});


/******** 监听 ********/
app.listen(3000, () => {
  console.log('server running at port 3000');
})
