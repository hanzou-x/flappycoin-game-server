var express = require('express');
var bodyParser = require('body-parser');
require('log-timestamp');

var recent_wins = {};
var banned_ips = [ '::ffff:40.74.49.23', '::ffff:78.94.58.26', '::ffff:138.197.22.243' ];
var banned_prefixes = [ '104.236', '46.101' ];
var app = express();

app.use('/send', bodyParser.json());
app.post('/send', function(req, res) {
    var ip = req.connection.remoteAddress;
    console.log('POST on /send from ' + ip);
    var process = require('child_process');
    var score = req.body.score;
    var address = req.body.address;
    var payout = 10 + 2 * (score - 10);
    var max_per_hour = 150; // more like hourly threshold, could technically get 249 in an hour
    // e.g. push up to 149 in a short period, then score 100 before taking a break
    var accumulated_hour = 0;

    if (recent_wins[ip] === undefined) {
        recent_wins[ip] = [];
    } else {
        // remove any records older than one hour
        while (recent_wins[ip].length > 0 && Date.now() - recent_wins[ip][0][0] > 3600 * 1000) {
            recent_wins[ip].shift();
        }
        for (var i = 0; i < recent_wins[ip].length; i++) {
            accumulated_hour += recent_wins[ip][i][1];
        }
    }
    if (payout > 100) {
        payout = 100;
    }

    console.log('score = ' + score + ', address = ' + address + ', calculated payout = ' + payout);
    if (score > 80) {
        console.log('possibly a cheater');
    }
    if (payout != req.body.payout) {
        console.log('mismatching POST payout = ' + req.body.payout + ', banning ip: ' + ip);
        banned_ips.push(ip);
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('error: unexpected input' + '\nAre you a hacker?\nHelp the Flappy community with your dev skillz');
        return;
    }
    if (banned_ips.indexOf(ip) >= 0) {
        console.log('banned ip: ' + ip);
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('your IP is banned for now\n' + 'but Flappy could use a developer of your skills\n' + 'Join the conversation on Discord\nIf this is in error, hit us up on Discord regardless');
        return;
    }
    for (var i = 0; i < banned_prefixes.length; i++) {
        var pattern = new RegExp('::ffff:' + banned_prefixes[i]);
        if (pattern.test(ip)) {
            console.log('Banning Digital Ocean user: ' + ip);
            banned_ips.push(ip);
            res.writeHead(403, {'Content-Type': 'text/plain'});
            res.end('Play this game on your personal computer, not Digital Ocean');
            return;
        }
    }
    if (accumulated_hour > max_per_hour) {
        console.log('denying payout to a Flappy addict');
        res.writeHead(202, {'Content-Type': 'text/plain'});
        res.end('Huge prize money on this IP already.\nCheck back later!');
        return;
    }
    if ((score >= 15 && recent_wins[ip].length > 0 && score * 1000 > Date.now() - recent_wins[ip][recent_wins[ip].length-1][0])
          || score == 95 || score == 145) {
        // more than one flap per second, or a score often used by bots
        console.log('timing-based cheat or otherwise suspicious score detected, banning ip: ' + ip);
        banned_ips.push(ip);
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('Anomalous flapping detected. Payouts disabled');
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
