const express = require('express');
let router = express.Router();
const md5 = require('md5-node');
const mysql = require('mysql');

const multer = require('multer');
const path = require('path');
// �����ϴ���Ŀ¼�ļ���
const upload = multer({dest: 'uploads/'});
const fs = require('fs');

// ������ȡ���е�ѧ����Ϣ��ѧ�ź�������
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

// ��ȡ��ǰѧ�Ŷ�Ӧ����Ϣ��teacher or student��
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

// ��¼��post�����ж��û����Ƿ���ڣ��û��������Ƿ�ƥ�䣬�Ƿ񱻷�����Ƿ��״ε�¼
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

// �˳���¼, ɾ��session
router.get('/getLogout', function (req, res) {
  console.log('getLogout');
  console.log(req.session);

  req.session.username = null;
  req.session.role = null;
  req.session.isLogin = 0;
  req.session.firstLogin = 0;
  res.redirect('/login');
});

// �޸�����, ����ǵ�һ���޸���ͬʱ�޸�session
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
  // �Ȳ�ѯ�����Ƿ���ȷ
  sql = "select COUNT(*) as num from student where stu_no=? and stu_password=?";
  connection.query(sql, [stu_no, oldpassword], function (error, results) {
    if (error) throw console.error;
    if (results[0].num == 1) {
      // ������ȷ����и���
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

// ������Ƶ�ӿ�
router.post('/upload', upload.single('file'), (req, res) => {
  // û�и����ļ�
  if (!req.file) {
    res.json({ok: false});
    return;
  }

  // ʹ��multer�м���󣬽���formdata����֮����req�����body��file��������
  console.log(req.file);
  console.log(req.body);
  
  // ����ļ���Ϣ
  console.log('====================================================');
  console.log('fieldname: ' + req.file.fieldname);
  console.log('originalname: ' + req.file.originalname);
  console.log('mimetype: ' + req.file.mimetype);
  console.log('size: ' + (req.file.size / 1024).toFixed(2) + 'KB');
  console.log('destination: ' + req.file.destination);
  console.log('filename: ' + req.file.filename);
  console.log('path: ' + req.file.path);

  // �������ļ�
  let oldPath = path.join(req.file.path);
  let newPath = path.join('uploads/' + req.file.originalname);
  console.log(oldPath);
  console.log(newPath);
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