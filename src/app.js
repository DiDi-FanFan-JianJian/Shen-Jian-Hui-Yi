const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())


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


/******** ҳ������ ********/
const page_router = require('./routers/index')
app.use('/', page_router);


/******** api ********/
const api_router = require('./routers/api')
app.use('/', api_router);


/******** ���� ********/
app.listen(3000, () => {
    console.log('server running at port 3000');
})
