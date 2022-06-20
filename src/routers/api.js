const express = require('express');
let router = express.Router();
const md5 = require('md5-node');
const mysql = require('mysql');
const iconv = require('iconv-lite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ini = require('ini');
const { execFile } = require('child_process');
// 读取全局参数
const config = ini.parse(fs.readFileSync('/etc/webrtc-dd-ff-jj.conf', 'utf-8'));
// 设置上传的目录文件夹
const upload = multer({ dest: 'uploads/' });

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
      req.session.stu_no = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Can't find your account!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results.length > 1) {
      req.session.stu_no = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "System Error!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results[0].stu_password != stu_password) {
      req.session.stu_no = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Password error!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else if (results[0].stu_enable != '1') {
      req.session.stu_no = null;
      req.session.role = null;
      req.session.isLogin = 0;
      req.session.firstLogin = 0;
      res.json({ msg: "Your account has been blocked!!!", canLogin: false, role: '?', firstLogin: false });
    }
    else {
      if (results[0].stu_userlevel == 1) {
        if (results[0].stu_password == md5(stu_no)) {
          req.session.stu_no = req.body.stu_no;
          req.session.role = "teacher";
          req.session.isLogin = 1;
          req.session.firstLogin = 1;
          res.json({ msg: "success", canLogin: true, role: 'teacher', firstLogin: true })
        }
        else {
          req.session.stu_no = req.body.stu_no;
          req.session.role = "teacher";
          req.session.isLogin = 1;
          req.session.firstLogin = 0;
          res.json({ msg: "success", canLogin: true, role: 'teacher', firstLogin: false })
        }
      }
      else {
        if (results[0].stu_password == md5(stu_no)) {
          req.session.stu_no = req.body.stu_no;
          req.session.role = "student";
          req.session.isLogin = 1;
          req.session.firstLogin = 1;
          res.json({ msg: "success", canLogin: true, role: 'student', firstLogin: true });
        } else {
          req.session.stu_no = req.body.stu_no;
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

  req.session.stu_no = null;
  req.session.role = null;
  req.session.isLogin = 0;
  req.session.firstLogin = 0;
  req.session.video = null;
  req.session.screen = null;
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

// 接受录像接口
router.post('/upload', upload.single('video'), (req, res) => {
  // 没有附带文件
  if (!req.file) {
    res.json({ ok: false });
    return;
  }
  // 输出文件信息
  console.log(req.file);
  // 将上传的文件的原始名字转化为utf-8字符串
  let str_originalname = iconv.decode(req.file.originalname, 'utf-8');
  // 重命名文件
  let oldPath = path.join(req.file.path);
  let newPath = iconv.encode('uploads/' + str_originalname, 'gbk');
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      res.json({ ok: false });
      console.log(err);
    } else {
      // 响应
      res.json({ ok: true });

      // 目录名
      let dir1 = Object.keys(config['root-dir'])[0];
      let dir2 = req.session.stu_no ? req.session.stu_no : 'none';
      let dir = dir1 + dir2;

      // 如果是第一次上传视频
      if (!req.session.video || req.session.video.length == 0) {
        console.log("--> new video" + req.session.stu_no);
        req.session.video = str_originalname.split(".")[0];
        let src = str_originalname;
        let child = execFile("test.sh", [dir, src], (error, stdout, stderr) => {
          if (error) {
            throw error;
          }
          console.log(stderr);
          console.log(stdout);
        });
        console.log(child);
      }
      // 不是第一次上传视频，跟req.session.video合并
      else {
        console.log("--> another video" + req.session.stu_no);
        src1 = req.session.video + '.mp4';
        src2 = str_originalname;
        let child = execFile('test.sh', [dir, src1, src2], (error, stdout, stderr) => {
          if (error) {
            throw error;
          }
          console.log(stderr);
          console.log(stdout);
        });
        console.log(child);
      }
    }
  });
});

// 结束一次录像
router.get('/endvideo', (req, res) => {
  req.session.video = null;
  res.json({ ok: true });
})

// 接受录屏接口
router.post('/upload', upload.single('screen'), (req, res) => {
  // 没有附带文件
  if (!req.file) {
    res.json({ ok: false });
    return;
  }
  // 输出文件信息
  console.log(req.file);
  // 将上传的文件的原始名字转化为utf-8字符串
  let str_originalname = iconv.decode(req.file.originalname, 'utf-8');
  // 重命名文件
  let oldPath = path.join(req.file.path);
  let newPath = iconv.encode('uploads/' + str_originalname, 'gbk');
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      res.json({ ok: false });
      console.log(err);
    } else {
      // 响应
      res.json({ ok: true });

      // 目录名
      let dir1 = Object.keys(config['root-dir'])[0];
      let dir2 = req.session.stu_no ? req.session.stu_no : 'none';
      let dir = dir1 + dir2;

      // 如果是第一次上传视频
      if (!req.session.screen || req.session.screen.length == 0) {
        console.log("--> new screen" + req.session.stu_no);
        req.session.screen = str_originalname.split(".")[0];
        let src = str_originalname;
        let child = execFile("test.sh", [dir, src], (error, stdout, stderr) => {
          if (error) {
            throw error;
          }
          console.log(stderr);
          console.log(stdout);
        });
        console.log(child);
      }
      // 不是第一次上传视频，跟req.session.video合并
      else {
        console.log("--> another screen" + req.session.stu_no);
        src1 = req.session.video + '.mp4';
        src2 = str_originalname;
        let child = execFile('test.sh', [dir, src1, src2], (error, stdout, stderr) => {
          if (error) {
            throw error;
          }
          console.log(stderr);
          console.log(stdout);
        });
        console.log(child);
      }
    }
  });
});

// 结束一次录屏
router.get('/endscreen', (req, res) => {
  req.session.screen = null;
  res.json({ ok: true });
})

module.exports = router;