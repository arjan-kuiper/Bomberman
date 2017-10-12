class Main{
    constructor(){
        this.network = new Network();
        this.board = new Board();

        this.network.getMessage();

        // this.network.sendMessage({func: "createGame", name: "Arjan"});
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

    constructor(){
        this.width = 20;
        this.height = 20;
        this.cellWidth = 50;
        this.cellHeight = 50;
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext("2d");
        this.board = [];
        this.environmentSprites = {
            0: "Blocks/BackgroundTile.png",
            1: "Blocks/SolidBlock.png",
            2: "Blocks/ExplodableBlock.png",
        };
        this.playerSprites = {};
        let t = this;
        this.loadSprites(function(){
            t.drawBoard();
        });
    }

    createCanvas(){
        let canvas = document.createElement("canvas");
            canvas.width = this.cellWidth*this.width;
            canvas.height = this.cellHeight*this.height;
            document.querySelector("#main").appendChild(canvas);
        return canvas;
    }
    loadSprites(callback){
        let imagesToLoad = 0;
        for(let key in this.environmentSprites){
            if(!this.environmentSprites.hasOwnProperty(key)) continue;
            imagesToLoad++;
            let img = new Image();
                img.src = "images/Sprites/" + this.environmentSprites[key];
                img.onload = function(){
                    imagesToLoad--;
                    if(imagesToLoad === 0){
                        console.log("Images loaded");
                        callback();
                    }
                };
            this.environmentSprites[key] = img;
        }
    }
    drawBoard(){
        let x = 0;
        let y = 0;

        this.ctx.drawImage(this.environmentSprites[0], x, y, 50, 50);

        x++;y++;
        this.ctx.drawImage(this.environmentSprites[1], x*50, y*50, 50, 50);

        x++;
        this.ctx.drawImage(this.environmentSprites[2], x*50, y*50, 50, 50);

        // context.drawImage(imageObj, x, y, width, height);

        // for(let key in this.environmentSprites){
        //     if(!this.environmentSprites.hasOwnProperty(key)) continue;
        //     console.log(this.environmentSprites[key]);
        // }
    }
}

class AudioManager{

}

// Code to initialize everything
let main = new Main();