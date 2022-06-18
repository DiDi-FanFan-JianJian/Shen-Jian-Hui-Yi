const express = require('express');
let router = express.Router();
const md5 = require('md5-node');
const mysql = require('mysql');

const iconv = require('iconv-lite');
const multer = require('multer');
const path = require('path');
// 设置上传的目录文件夹
const upload = multer({dest: 'uploads/'});
const fs = require('fs');

// 用来获取所有的学生信息（学号和姓名）
router.get('/getAllStu', (req, res) => {
  console.log("getAllStu");
  console.log(req.session);

  var connection = mysql.createConnection({
    host: '43.142.102.170',
    user: 'root',
    password: 'Sj666',
    database: 'user'
  });
  connection.connect();
  var sql = "select stu_no, stu_name from student where stu_userlevel=0 and stu_enable=1";
  connection.query(sql, function (error, results) {
    if (error) throw console.error;
    res.json(results)
  })
  connection.end();
});

// 获取当前学号对应的信息（teacher or student）
router.get('/getInfo', (req, res) => {
  console.log("getInfo");
  console.log(req.session);

  var stu_no = req.query.stu_no;
  console.log(stu_no);
  var connection = mysql.createConnection({
    host: '43.142.102.170',
    user: 'root',
    password: 'Sj666',
    database: 'user'
  });
  connection.connect();
  var sql = "select stu_grade, stu_name, stu_sex, stu_class_fname, stu_class_sname from student where stu_no=?";
  connection.query(sql, [stu_no], function (error, results) {
    if (error) throw console.error;
    res.json(results[0]);
  })

connection.end();
});

// 登录的post请求，判断用户名是否存在，用户名密码是否匹配，是否被封禁，是否首次登录
router.post('/getLogin', (req, res) => {
  console.log("getLogin");
  console.log(req.session);

  const stu_no = req.body.stu_no;
  const stu_password = md5(req.body.stu_password);
  var connection = mysql.createConnection({
    host: '43.142.102.170',
    user: 'root',
    password: 'Sj666',
    database: 'user'
  });
  connection.connect();
  var sql = "select stu_password, stu_userlevel, stu_enable from student where stu_no=?";
  connection.query(sql, [stu_no], function (error, results) {
    if (error) throw console.error;
    if (results.length == 0) {
      req.session.username = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Can't find your account!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results.length > 1) {
      req.session.username = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "System Error!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results[0].stu_password != stu_password) {
      req.session.username = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Password error!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results[0].stu_enable != '1') {
      req.session.username = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Your account has been blocked!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else {
      if (results[0].stu_userlevel == 1) {
        if (results[0].stu_password == md5(stu_no)) {
          req.session.username = req.body.stu_no;
          req.session.role = "teacher";
          req.session.isLogin = 1;
          req.session.firstLogin = 1;
          res.json({ msg: "success", canLogin: true, role: 'teacher', firstLogin: true })
        }
        else {
          req.session.username = req.body.stu_no;
          req.session.role = "teacher";
          req.session.isLogin = 1;
          req.session.firstLogin = 0;
          res.json({ msg: "success", canLogin: true, role: 'teacher', firstLogin: false })
        }
      }
      else {
        if (results[0].stu_password == md5(stu_no)) {
          req.session.username = req.body.stu_no;
          req.session.role = "student";
          req.session.isLogin = 1;
          req.session.firstLogin = 1;
          res.json({ msg: "success", canLogin: true, role: 'student', firstLogin: true });
        } else {
          req.session.username = req.body.stu_no;
          req.session.role = "student";
          req.session.isLogin = 1;
          req.session.firstLogin = 0;
          res.json({ msg: "success", canLogin: true, role: 'student', firstLogin: false })
        }
      }
    }
  })

  connection.end();
});

// 退出登录, 删除session
router.get('/getLogout', function (req, res) {
  console.log('getLogout');
  console.log(req.session);

  req.session.username = null;
  req.session.role = null;
  req.session.isLogin = 0;
  req.session.firstLogin = 0;
  res.redirect('/login');
});

// 修改密码, 如果是第一次修改则同时修改session
router.post('/changePassword', (req, res) => {
  console.log("changePassword");
  console.log(req.session);

  const stu_no = req.body.stu_no;
  const oldpassword = md5(req.body.oldpassword);
  const newpassword = md5(req.body.newpassword);
  var connection = mysql.createConnection({
    host: '43.142.102.170',
    user: 'root',
    password: 'Sj666',
    database: 'user'
  });
  connection.connect();
  var sql;
  // 先查询密码是否正确
  sql = "select COUNT(*) as num from student where stu_no=? and stu_password=?";
  connection.query(sql, [stu_no, oldpassword], function (error, results) {
    if (error) throw console.error;
    if (results[0].num == 1) {
      // 密码正确则进行更新
      sql = "update student set stu_password=? where stu_no=?";
      connection.query(sql, [newpassword, stu_no], function (error, results) {
        if (error) console.log(error);
        if (req.session.firstLogin == 1) {
          req.session.firstLogin = 0;
        }
        res.json({ msg: 'success' });
        connection.end();
      })
    }
    else if (results[0].num == 0) {
      res.json({ msg: 'password error' });
    }
    else {
      res.json({ msg: 'system error' });
    }
  })
});

// 接受视频接口
router.post('/upload', upload.single('file'), (req, res) => {
  // 没有附带文件
  if (!req.file) {
    res.json({ok: false});
    return;
  }

  // 使用multer中间件后，解析formdata数据之后将在req中添加body和file两个对象
  console.log(req.file);
  // 将上传的文件的原始名字转化为utf-8字符串
  let str_originalname = iconv.decode(req.file.originalname, 'utf-8');
  
  // 输出文件信息
  console.log('====================================================');
  console.log('fieldname: ' + req.file.fieldname);
  console.log('originalname: ' + str_originalname);
  console.log('mimetype: ' + req.file.mimetype);
  console.log('size: ' + (req.file.size / 1024).toFixed(2) + 'KB');
  console.log('destination: ' + req.file.destination);
  console.log('filename: ' + req.file.filename);
  console.log('path: ' + req.file.path);

  // 重命名文件
  let oldPath = path.join(req.file.path);
  let newPath = iconv.encode('uploads/' + str_originalname, 'gbk');
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      res.json({ok: false});
      console.log(err);
    } else {
      res.json({ok: true});
    }
  });
});

module.exports = router;