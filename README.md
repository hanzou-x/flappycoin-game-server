This works as a standalone node server. It runs node and the
wallet as an unprivileged user, so it listens on port 8080 then you can
forward port 80 traffic there.

Get all three necessary git repositories side-by-side:

    git clone https://github.com/hanzou-x/flappycoin-game.git
    git clone https://github.com/hanzou-x/flappycoin-game-server.git
    git clone https://github.com/hanzou-x/Flaps.git

Set up your local wallet. If you build flappycoind from source it
will land in `~/Flaps/src/flappycoind` or you can copy a pre-built
binary there. Put some money in the wallet to be used for payouts.
If not sure how to do this without the Qt GUI, here's a hint:

    cd ~/Flaps/src
    ./flappycoind
    ./flappycoind getaccountaddress 0
    # ...
    ./flappycoind getbalance

Set up and test out the node server by itself:

    sudo apt install nodejs
    cd flappycoin-game-server
    npm install
    node server.js

Then connect to port 8080 on your host and see if gameplay and
payouts are working as expected. Press Ctrl+C to terminate.

To initiate port forwarding from port 80:

    sudo iptables -A INPUT -i eth0 -p tcp --dport 80 -j ACCEPT
    sudo iptables -A INPUT -i eth0 -p tcp --dport 8080 -j ACCEPT
    sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080
    sudo apt install iptables-persistent

That last command ensures that port forwarding persists when the
server is rebooted. We need to do the same for the node server.
This will vary from distro to distro, but this repo includes one
way to do it with systemd on Ubuntu:

    sudo cp flappycoin-game.service /lib/systemd/system/
    sudo vi /lib/systemd/system/flappycoin-game.service # inspect and edit the userid if necessary
    sudo systemctl enable flappycoin-game
    sudo systemctl start flappycoin-game

This needs to be done for the wallet too. If the wallet is already
running terminate it with `killall flappycoind`, then:

    sudo cp flappycoind.service /lib/systemd/system/
    sudo vi /lib/systemd/system/flappycoind.service # inspect and edit the userid if necessary
    sudo systemctl enable flappycoind
    sudo systemctl start flappycoind

The included sample files assume the default username "ubuntu", so
be sure to change that unless your setup is equally lazy.

Once running, keep an eye on usage and inspect the logs via:

    journalctl -u flappycoin-game
