const express = require('express');
const path = require('path');

let router = express.Router();

const views = '../views/';

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'login.html'));
});

router.get('/login', (req, res) => {
  console.log('login');
  console.log(req.session);

  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'login.html'));
});

router.get('/index', (req, res) => {
  console.log("index");
  console.log(req.session);

  if (req.session.isLogin == 1) {
    if (req.session.firstLogin == 1) {
      res.redirect('/password');
    }
    else {
      res.setHeader('Content-Type', 'text/html;charset=gbk');
      res.sendFile(path.join(__dirname, views, 'index.html'));
    }
  }
  else {
    res.redirect('/login');
  }
});

router.get('/password', (req, res) => {
  console.log("password");
  console.log(req.session);

  if (req.session.isLogin == 1) {
    if (req.session.firstLogin == 1) {
      res.setHeader('Content-Type', 'text/html;charset=gbk');
      res.sendFile(path.join(__dirname, views, 'password1.html'));
    }
    else {
      res.setHeader('Content-Type', 'text/html;charset=gbk');
      res.sendFile(path.join(__dirname, views, 'password2.html'));
    }
  }
  else {
    res.redirect('/login');
  }
})

module.exports = router;