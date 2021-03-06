/*

const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);



http.listen(3000, function () {
    console.log('Server started!');
});

var port = 3000;
var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();
const cors = require('cors');
app.use(cors());
app.options('*', cors());



var options = {
    'origins': '*'
};
var server = http.createServer(options, app);
var io = require('socket.io')(server, {'origins':'*:*'});

//io.origins(['http://localhost:8080']);

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
    });
});

// start of server
server.listen(port, function(){
    console.log('listening on *: '+ port + "\n");
});
*/

/*
var express = require('express');
var app = express();
const cors = require('cors');
app.use(cors());
app.options('*', cors());
var http = require('http').Server(app);


const io = require('socket.io')(http, { 
    origins: '*:*',
    handlePreflightRequest: (req, res) => {
        const headers = {
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
});
io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
    });
});

//const auth = require('./routes/auth');

const port = 3000;
http.listen(port, () => {
  console.log( `running http at port ${port}`);
});
*/


var express = require('express');
var http = require('http');

const app = express();
const server = http.createServer(app);

var games = [];
var nextGame = null;
function createGame(playerA) {
    return {
        playerA:playerA,
        playerB:null,
        start:function() {
            this.broadCast({action:"start"}, null);
        },
        end:function(reason) {
            this.broadCast({action:'end',reason:reason});
        },
        broadCast:function(msg, sender) {
            if(sender !== this.playerA) {
                this.playerA.send(msg);
            }
            if(this.playerB != null && sender !== this.playerB) {
                this.playerB.send(msg);
            }
        }
    };
}

const io = require("socket.io")(server,  {  
    cors: {    
        origin: "*",   
        methods: ["GET", "POST"],    
        allowedHeaders: ["my-custom-header"],    
        credentials: true 
    }
});


function otherPlayer(player) {
    if(player === "A") {
        return "B";
    } else {
        return "A";
    }
}

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    if(nextGame != null) {
        nextGame.playerB = socket;
        socket.player = "B";
        socket.game = nextGame;
        socket.send({action:"assign", player:"B"});

        // Start the game
        nextGame.start();
        games.push(nextGame);
        nextGame = null;
    } else {
        nextGame = createGame(socket);
        socket.player = "A";
        socket.game = nextGame;
        socket.send({action:"assign", player:"A"});
    }


    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
        this.game.end("The game ended because player "+this.player+" disconnected");
    });

    socket.on("message", function(msg) {
        console.log('message:'+msg);
        if('action' in msg) {
            if(msg.action === 'update') {
                this.game.broadCast(msg, this);
            }
        } else {
            this.game.broadCast(msg, this);
        }
    });
});


server.listen(3000);