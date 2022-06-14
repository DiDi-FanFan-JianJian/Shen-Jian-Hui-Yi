const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

app.get('/login', (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'text/html;charset=gbk');
    res.sendFile(`${__dirname}/login.html`);
});

app.get('/index', (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(`${__dirname}/index.html`);
});

app.get('/personal', (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(`${__dirname}/personal.html`);
});

app.listen(3001, () => {
    console.log('server running at http://localhost:3001');
})
