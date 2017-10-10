
const PORT = 1337;

var Server = require('./server/Server');



var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {});


// Express Routing and starting the webserver
app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(PORT, function(){
    console.log('Server started on port ' + PORT);
});

// Socket IO connections
io.sockets.on('connection', function(socket){


    console.log('A new connection (id: ' + socket.id + ')');

    var p = new Player.Player(socket.id);
    console.log(p.getId());

    // Create a new game
    socket.on('createGame', function(){
        console.log("Creating a new game");

    });

    // Start a new game
    socket.on('startGame', function(){
        console.log("Start a new game");

    });

    // Update game
    socket.emit('updateGame', 'BERICHT VAN SERVER');

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});


