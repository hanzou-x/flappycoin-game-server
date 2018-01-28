var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.post('/', function(req, res){
    console.log('GET /')
    var process = require('child_process');
    var score = req.body.score;
    var address = req.body.address;
    console.log('score = ' + score + ', address = ' + address);
    process.exec('../Flaps/src/flappycoind getmininginfo', function (err,stdout,stderr) {
        if (err) {
            res.writeHead(403, {'Content-Type': 'text/plain'});
            console.log(typeof(stderr));
            console.log("\n"+stderr);
            res.send(stderr);
        } else {
            console.log(stdout);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(stdout);
        }
    });
});

app.use('/', express.static('../flappycoin-game'));

app.use(bodyParser.json());

var port = 8080;
app.listen(port);
console.log('Listening at http://localhost:' + port);
