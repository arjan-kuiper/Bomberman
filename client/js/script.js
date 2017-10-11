class Main{
    constructor(){
        this.network = new Network();
        this.board = new Board();

        this.network.getMessage();

        this.network.sendMessage({func: "createGame", name: "Arjan"});
        // this.network.sendMessage({func: "addPlayer", name: "Alwin"});
    }
}

class Network{
    constructor(){
        this.socket = io();
    }

    getMessage(){
        this.socket.on('updateGame', function(data){
            document.getElementById('debugInfo').innerHTML = data; // FOR DEBUGGING
        });
    }
    sendMessage(msg){
        this.socket.emit("client", msg);
    }

}

class Board{

}

class AudioManager{

}

// Code to initialize everything
var main = new Main();