var express = require('express');
var bodyParser = require('body-parser');
require('log-timestamp');

var recent_wins = {};

var app = express();

app.use('/send', bodyParser.json());
app.post('/send', function(req, res) {
    var ip = req.connection.remoteAddress;
    console.log('POST on /send from ' + ip);
    var process = require('child_process');
    var score = req.body.score;
    var address = req.body.address;
    var payout = 10 + 2 * (score - 10);
    var max_per_hour = 500; // more like hourly threshold, could technically get 599 in an hour
    var accumulated_hour = 0;

    if (recent_wins[ip] === undefined) {
        recent_wins[ip] = [];
    } else {
        // remove any records older than one hour
        while (recent_wins[ip].Length > 0 && Date.now() - recent_wins[ip][0][0] > 3600 * 1000) {
            recent_wins[ip].shift();
        }
        for (var i = 0; i < recent_wins[ip].Length; i++) {
            accumulated_hour += recent_wins[ip][i][1];
        }
    }
    if (payout > 100) {
        payout = 100;
    }
    console.log('score = ' + score + ', address = ' + address + ', calculated payout = ' + payout);
    if (score > 200) {
        console.log('possibly a cheater');
    }
    if (payout != req.body.payout) {
        console.log('mismatching POST payout = ' + req.body.payout + ', aborting');
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('error: unexpected input');
        return;
    }
    if (accumulated_hour > max_per_hour) {
        console.log('denying payout to a Flappy addict');
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end("Huge prize money on this IP already.\nCheck back later!");
        return;
    }
    recent_wins[ip].push([Date.now(), payout]);
    accumulated_hour += payout;

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
                var text = stdout.trim();
                if (accumulated_hour > max_per_hour) {
                    console.log('Hourly payout threshold surpassed');
                    text += "\nYou've hit your hourly limit. Take a break!";
                }
                res.end(text);
            } else {
                // unexpected stdout: treat as error
                res.writeHead(403, {'Content-Type': 'text/plain'});
                res.end(stdout.trim());
            }
        }
    });
});

app.use('/', express.static('../flappycoin-game'));

var port = 8080;
app.listen(port);
console.log('Listening at http://localhost:' + port);
