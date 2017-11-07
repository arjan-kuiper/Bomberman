// Constants and variables
const PORT = 1337;

var rooms = {};
var socketRooms = {};

// Modules
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Get our core file for the game
var core = require('./server/core');

// Express routing / paths
app.use('/client', express.static(path.join(__dirname + '/client')));
app.get('/', function(req, res, next){
    res.sendFile(__dirname + '/client/setup.html');
});
app.get('/favicon.ico', function(req, res, next) {
    res.status(204);
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
        // Create the room main if it doesn't exist yet
        if(rooms[roomId].main === undefined){
            rooms[roomId].main = new core.Main(roomId, io, socket.id);
            rooms[roomId].main.createGame();
            socket.emit('owner', socket.id);
        }else{
            if(!rooms[roomId].main.started){
                rooms[roomId].main.addPlayer(socket.id, '');
            }
        }
        // Add the socket to the room
        if(!rooms[roomId].clients.indexOf(socket.id) > -1){
            rooms[roomId].clients.push(socket.id);
            socketRooms[socket.id] = roomId;
            socket.join(roomId);
        }

        // Update the game for the first time
        rooms[roomId].main.updateGame();

        /**
         * Handles client messages
         */
        socket.on('client', function(data){
            if( typeof data.func === "undefined") return;
            switch (data.func){
                case "createGame":
                    break;
                case "join":
                    rooms[socketRooms[socket.id]].main.setPlayerName(socket.id, data.name);
                    break;
                case "startGame":
                    rooms[socketRooms[socket.id]].main.startGame(socket.id);
                    break;
                case "keyHandle":
                    if(typeof data.key === "number"){
                        if(data.key === 32){
                            rooms[socketRooms[socket.id]].main.keyHandle(32, socket.id);
                        }
                    }else{
                        rooms[socketRooms[socket.id]].main.setKeys(data.key, socket.id);
                    }
                    break;
            }
        });

        /**
         * Remove a player when he/she is disconnected
         * When the last player left, remove the room
         */
        socket.on('disconnect', function(){
            rooms[roomId].clients.splice(rooms[roomId].clients.indexOf(socket.id), 1);
            if(rooms[roomId].clients.length <= 0){
                delete rooms[roomId];
            }else{
                rooms[roomId].main.removePlayer(socket.id);
            }
            socket.disconnect(true);
        });
    });
}

