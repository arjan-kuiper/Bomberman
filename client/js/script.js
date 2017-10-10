class Main{
    constructor(){
        this.network = new Network();
        this.board = new Board();

        this.network.getMessage();
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
}

class Board{

}

class AudioManager{

}

// Code to initialize everything
var main = new Main();