const express = require('express');
const path = require('path');

let router = express.Router();

const views = '../views/';

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'login.html'));
});

router.get('/login', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'login.html'));
});

router.get('/index', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'index.html'));
});

router.get('/personal', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=gbk');
  res.sendFile(path.join(__dirname, views, 'personal.html'));
});

module.exports = router;