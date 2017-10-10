const PORT = 1337;
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

    socket.emit('updateBoard', 'BERICHT VAN SERVER');
});
