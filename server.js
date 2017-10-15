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
// Our own modules
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
        }else{
            // console.log(rooms[roomId]);
            // rooms[roomId].main.addPlayer(socket.io, 'test');
            rooms[roomId].main.addPlayer(socket.id, 'test');
        }
        // Add the socket to the room
        if(!rooms[roomId].clients.indexOf(socket.id) > -1){
            rooms[roomId].clients.push(socket.id);
            socketRooms[socket.id] = roomId;
            socket.join(roomId);
        }
        rooms[roomId].main.updateGame();

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
                    // console.log('(' + socket.id + ') KeyCode: ' + data.key);
                    // rooms[socketRooms[socket.id]].main.getBoard().grid[Math.floor((Math.random() * 10) + 1)][Math.floor((Math.random() * 10) + 1)] = 0;
                    // rooms[socketRooms[socket.id]].main.updateGame(socketRooms[socket.id]);
                    rooms[socketRooms[socket.id]].main.keyHandle(data.key, socket.id);
                    break;
            }
        });
    
        socket.on('disconnect', function(){
            rooms[roomId].clients.splice(rooms[roomId].clients.indexOf(socket.id), 1);
            rooms[roomId].main.removePlayer(socket.id);
            socket.disconnect(true);
            console.log('user disconnected and removed');
        });
    });
}
