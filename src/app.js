const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const app = express()
const cors = require('cors');
const wsInstance = require('express-ws')(app);

/******** bodyParser ********/
app.use(bodyParser.json())


/******** 闈欐�佹枃浠? ********/
app.use(express.static(__dirname + '/public'))


/******** 响应头 ********/
app.use(cors({
  "origin": "*",//此处也可以更替为，允许的指定域名，例如：yousite.com
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
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7澶?
    secure: false,
  }
}));


/******** 椤甸潰璇锋眰 ********/
const page_router = require('./routers/index')
app.use('/', page_router);


/******** api ********/
const api_router = require('./routers/api')
app.use('/', api_router);


/******** websocket ********/
app.ws('/', ws => {
  ws.on('message', data => {
    // 鏈仛涓氬姟澶勭悊锛屾敹鍒版秷鎭悗鐩存帴骞挎挱
    wsInstance.getWss().clients.forEach(server => {
      if (server !== ws) {
        server.send(data);
      }
    });
  });
  // let webServer = new WebServer(ws);
});


/******** 鐩戝惉 ********/
app.listen(3000, () => {
  console.log('server running at port 3000');
})
