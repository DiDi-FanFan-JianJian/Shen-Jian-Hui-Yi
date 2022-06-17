const express = require('express');
const path = require('path');

let router = express.Router();

const views = '../views/';

router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  console.log('login');
  req.session.username = null;
  req.session.role = null;
  req.session.isLogin = 0;
  req.session.firstLogin = 0;

  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'login.html'));
});

router.get('/index', (req, res) => {
  console.log("index");
  console.log(req.session);
  req.session.isLogin = 1;
  req.session.role = 'student';
  if (req.session.isLogin == 1) {
    if (req.session.firstLogin == 1) {
      res.redirect('/password');
    }
    else {
      if (req.session.role == 'student') {
        res.setHeader('Content-Type', 'text/html;charset=gbk');
        res.sendFile(path.join(__dirname, views, 'client.html'));  
      }
      else if (req.session.role == 'teacher') {
        res.setHeader('Content-Type', 'text/html;charset=gbk');
        res.sendFile(path.join(__dirname, views, 'teacher.html'));              
      }
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
});

router.get('/invigilation', (req, res) => {
  req.session.role = 'teacher';
  if (req.session.role == 'teacher') {
    res.setHeader('Content-Type', 'text/html;charset=gbk');
    res.sendFile(path.join(__dirname, views, 'server.html'));  
  }
  else {
    res.redirect('/login');
  }
});

router.get('/teacher', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'teacher.html'));
});

module.exports = router;