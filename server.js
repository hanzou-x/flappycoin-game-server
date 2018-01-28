var express = require('express');
var bodyParser = require('body-parser');
require('log-timestamp');

var app = express();

app.use('/send', bodyParser.json());
app.post('/send', function(req, res){
    console.log('POST on /send from ' + req.connection.remoteAddress);
    var process = require('child_process');
    var score = req.body.score;
    var address = req.body.address;
    var payout = 10 + 2 * (score - 10);
    if (payout > 250) {
        console.log('possibly a cheater');
        payout = 250;
    }
    console.log('score = ' + score + ', address = ' + address + ', calculated payout = ' + payout);
    process.exec('../Flaps/src/flappycoind sendtoaddress ' + address + ' ' +
        payout + ' "flappycoin-game score ' + score + '"', function(err,stdout,stderr) {
        if (err) {
            res.writeHead(403, {'Content-Type': 'text/plain'});
            console.log(typeof(stderr) + ': ' + stderr.trim());
            res.end(stderr);
        } else {
            console.log(stdout.trim());
            if (stdout.length == 65 && stdout[64] == '\n') {
                // valid txid
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end(stdout.trim());
            } else {
                res.writeHead(403, {'Content-Type': 'text/plain'});
                res.end(stdout);
            }
        }
    });
});

app.use('/', express.static('../flappycoin-game'));

var port = 8080;
app.listen(port);
console.log('Listening at http://localhost:' + port);
