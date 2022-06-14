const express = require('express')
const bodyParser = require('body-parser')
const md5 = require('md5-node')
const mysql = require('mysql')
const encoding = require('encoding');
const { query } = require('express');
const app = express()
app.use(bodyParser.json())

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

// 用来获取所有的学生信息（学号和姓名）
app.get('/getAllStu', (req, res) => {
    console.log(req.body);

    var connection = mysql.createConnection({
        host: '43.142.102.170',
        user: 'root',
        password: 'ZhaoLinux2022',
        database: 'user'
    });
    connection.connect();
    var sql = "select stu_no, stu_name from student where stu_userlevel=0";
    connection.query(sql, function (error, results) {
        if (error) throw console.error;
        res.json(results)
        console.log(results)
    })
    connection.end();
});

// 获取当前学号对应的用户身份（teacher or student）
app.get('/getRole', (req, res) => {
    console.log(req.body);
    var stu_no = req.query.stu_no;

    var connection = mysql.createConnection({
        host: '43.142.102.170',
        user: 'root',
        password: 'ZhaoLinux2022',
        database: 'user'
    });
    connection.connect();

    var sql = "select stu_userlevel from student where stu_no=?";
    connection.query(sql, [stu_no], function (error, results) {
        if (error) throw console.error;
        let userlevel = results[0].stu_userlevel;
        if (userlevel == '1') {
            res.json({role: "teacher"});
        }
        else {
            res.json({role: "student"});
        }
    })

    connection.end();
});

// 登录的post请求，判断用户名是否存在，用户名密码是否匹配，是否被封禁，是否首次登录
app.post('/getLogin', (req, res) => {
    const stu_no = req.body.stu_no;
    const stu_password = md5(req.body.stu_password);

    console.log(req.body);

    var connection = mysql.createConnection({
        host: '43.142.102.170',
        user: 'root',
        password: 'ZhaoLinux2022',
        database: 'user'
    });
    connection.connect();
    var sql = "select stu_password, stu_userlevel, stu_enable from student where stu_no=?";
    connection.query(sql, [stu_no], function (error, results) {
        if (error) throw console.error;
        console.log(results);
        if (results.length == 0) {
            res.json({msg: "Can't find your account!!!", canLogin: false, role: '?', firstLogin: false});
        }
        else if (results.length > 1) {
            res.json({msg: "System Error!!!", canLogin: false, role: '?', firstLogin: false});
        }
        else if (results[0].stu_password != stu_password) {
            res.json({msg: "Password error!!!", canLogin: false, role: '?', firstLogin: false});
        }
        else if (results[0].stu_enable != '1') {
            res.json({msg: "Your account has been blocked!!!", canLogin: false, role: '?', firstLogin: false});
        }
        else {
            if (results[0].stu_userlevel == 1) {
                res.json({msg: "success", canLogin: true, role: 'teacher', firstLogin: false})
            }
            else {
                if (results[0].stu_password == md5(stu_no)) {
                    res.json({msg: "success", canLogin: true, role: 'student', firstLogin: true});
                } else {
                    res.json({msg: "success", canLogin: true, role: 'student', firstLogin: false})
                }    
            }
        }
    })

    connection.end();
});

// 修改密码
app.post('/changePassword', (req, res) => {
    const stu_no = req.body.stu_no;
    const oldpassword = md5(req.body.oldpassword);
    const newpassword = md5(req.body.newpassword);

    console.log(req.body);

    var connection = mysql.createConnection({
        host: '43.142.102.170',
        user: 'root',
        password: 'ZhaoLinux2022',
        database: 'user'
    });
    connection.connect();
    var sql;
    // 先查询密码是否正确
    sql = "select COUNT(*) as num from student where stu_no=? and stu_password=?";
    connection.query(sql, [stu_no, oldpassword], function(error, results) {
        if (error) throw console.error;
        console.log(results[0]);
        if (results[0].num == 1) {
            // 密码正确则进行更新
            sql = "update student set stu_password=? where stu_no=?";
            connection.query(sql, [newpassword, stu_no], function (error, results) {
                if (error) console.log(error);
                console.log(results);
                res.json({msg: 'success'});
                connection.end();
            })
        }
        else if (results[0].num == 0) {
            res.json({msg: 'password error'});
        }
        else {
            res.json({msg: 'system error'});
        }
    })
});

app.listen(3000, () => {
    console.log('server running at http://localhost:3000');
})