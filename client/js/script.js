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
        this.messageTypes = ['updateBoard'];
    }

    getMessage(){
        for(var i = 0; i < this.messageTypes.length; i++){
            this.socket.on(this.messageTypes[i], function(data){
                console.log(data);
            });
        }
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