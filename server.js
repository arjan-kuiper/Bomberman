
const PORT = 1337;

var server = require('./server/Server');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http, {});

var roomId;

app.get('/:roomId', function (req, res) {
    roomId = req.params.roomId;
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/', express.static(__dirname + '/client'));

http.listen(PORT, function(){
    console.log('Server started on port ' + PORT);
});




io.sockets.on('connection', function(socket){
    // Let the socket join the room from the URL
    socket.join(roomId);
    io.sockets.in(roomId).emit('updateGame', '<b>Debug:</b><br> You are in room: ' + roomId); //FOR DEBUGGING


    socket.on('client', function(data){
        if( typeof data.func === "undefined") return;
        switch (data.func){
            case "createGame":
                createGame(data);
                break;
            case "join":
                // join(data.joiningId);
                break;
            case "startGame":
                startGame();
                break;
            case "keyHandle":
                keyHandle(data);
                break;
        }
    });


    createGame = function(data){
        console.log("create game");

        // Initialize main
        var main = server.Main();

        // Add player
        main.getBoard().addPlayer(socket.id, data.name);
    };

    addPlayer = function(player){

    };

    startGame = function(){
        console.log("start game");
    };

    updateGame = function(){
        io.sockets.in(roomId).emit('updateGame', {});
    };
    


    keyHandle = function(){

    };


    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

});

