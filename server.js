// Constants and variables
const PORT = 1337;
var rooms = {};

// Modules
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
// Our own modules
var core = require('./server/core');

// Express routing / paths
app.use('/client', express.static(path.join(__dirname + '/client')));
app.get('/', function(req, res, next){
    res.sendFile(__dirname + '/client/setup.html');
});
app.get('/:roomId', function(req, res, next){
    if(rooms[req.params.roomId] == undefined){
        rooms[req.params.roomId] = {clients: [], main: undefined};
    }

    var roomId = req.params.roomId;
    res.sendFile(__dirname + '/client/index.html', function(){
        setupSocketListeners(roomId);
    });
});

// Start the server and log it
server.listen(PORT, function(){
    console.log('Server started on port ' + PORT);
});

// Sockets
function setupSocketListeners(roomId){
    io.sockets.once('connection', function(socket){
        // Add the socket to the room
        if(!rooms[roomId].clients.indexOf(socket.id) > -1){
            rooms[roomId].clients.push(socket.id);
        }
        if(rooms[roomId].main == undefined){
            console.log(rooms);
            console.log('Game main not set for room: ' + roomId);
        }
    
        socket.on('client', function(data){
            if( typeof data.func === "undefined") return;
            switch (data.func){
                case "createGame":
                    // todo
                    break;
                case "join":
                    // todo
                    break;
                case "startGame":
                    // todo
                    break;
                case "keyHandle":
                    //console.log('(' + socket.id + ') KeyCode: ' + data.key);
                    console.log(rooms); // for ez debug
                    break;
            }
        });
    
        socket.on('disconnect', function(){
            rooms[roomId].clients.splice(rooms[roomId].clients.indexOf(socket.id), 1);
            socket.disconnect(true);
            console.log('user disconnected and removed');
        });   
    });
}
