const express = require('express');
let router = express.Router();
const md5 = require('md5-node')
const mysql = require('mysql')

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
  var sql = "select stu_no, stu_name from student where stu_userlevel=0";
  connection.query(sql, function (error, results) {
    if (error) throw console.error;
    res.json(results)
  })
  connection.end();
});

// ��ȡ��ǰѧ�Ŷ�Ӧ���û���ݣ�teacher or student��
router.get('/getRole', (req, res) => {
  console.log("getRole");
  console.log(req.session);

  var stu_no = req.query.stu_no;
  var connection = mysql.createConnection({
    host: '43.142.102.170',
    user: 'root',
    password: 'Sj666',
    database: 'user'
  });
  connection.connect();
  var sql = "select stu_userlevel from student where stu_no=?";
  connection.query(sql, [stu_no], function (error, results) {
    if (error) throw console.error;
    let userlevel = results[0].stu_userlevel;
    if (userlevel == '1') {
      res.json({ role: "teacher" });
    }
    else {
      res.json({ role: "student" });
    }
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
        req.session.username = req.body.stu_no;
        req.session.role = "teacher";
        req.session.isLogin = 1;
        req.session.firstLogin = 0;
        res.json({ msg: "success", canLogin: true, role: 'teacher', firstLogin: false })
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
  res.redirect('login');
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

module.exports = router;