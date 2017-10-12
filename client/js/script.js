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

        // 7,8, 13, 14, 19, 20
        this.width = 19;
        this.height = 19;
        this.cellWidth = 50;
        this.cellHeight = 50;
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext("2d");
        this.board = [];
        this.environmentSprites = {
            0: "Blocks/BackgroundTile.png",
            1: "Blocks/SolidBlock.png",
            2: "Blocks/ExplodableBlock.png",
            10: "Powerups/BombPowerup.png",
            11: "Powerups/FlamePowerup.png",
            12: "Powerups/SpeedPowerup.png",
        };
        this.playerSprites = {};

        this.createBoard();


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
        for(let y=0; y < this.height ;y++){
            for(let x=0; x < this.width ;x++){

                this.ctx.drawImage(this.environmentSprites[this.board[y][x]], x*this.cellWidth, y*this.cellHeight, this.cellWidth, this.cellHeight);


                // if(y === 0 || x === 0 || y === this.height-1 || x === this.width-1){
                // }else{
                //     this.ctx.drawImage(this.environmentSprites[0], x*this.cellWidth, y*this.cellHeight, this.cellWidth, this.cellHeight);
                // }
            }
        }
    }

    createBoard(){
        let evenWidth = this.width % 2 === 0;
        let evenHeight = this.height % 2 === 0;
        let middleWidth = this.width/2;
        let middleHeight = this.height/2;

        for(let y=0; y < this.height ;y++){
            this.board[y] = [];
            for(let x=0; x < this.width ;x++){

                if(y === 0 || x === 0 || y === this.height-1 || x === this.width-1){
                    this.board[y][x] = 1;
                }else{

                    // For an X
                    //   ( (x+y === this.width-1 || x+y === this.height-1) && x > 1  && y > 1 ) || (x === y && x !== 1 && x !== this.width-2)
                    //

                    this.board[y][x] = 0;

                    // Breakable blocks as an X
                    if( ( (x+y === this.width-1 || x+y === this.height-1) && x > 1  && y > 1 ) || (x === y && x !== 1 && x !== this.width-2) ){
                        // this.board[y][x] = 2;
                    }

                    // Breakable blocks (sides)
                    if( (x > 4 && x < this.width-5 && ( y === 1 || y === this.height-2 ) ) || // Top and bottom
                        (y > 4 && y < this.height-5 && ( x === 1 || x === this.width-2 ) ) ){ // Left and right
                        this.board[y][x] = 2;
                    }


                    // Breakable blocks (whole board)
                    if( (x % 3 === ( !evenWidth || x < middleWidth ? 0 : 1 ) && x > 1 && x < this.width-2  ) ||
                        (y % 3 === ( !evenHeight || y < middleHeight ? 0 : 1 ) && y > 1 && y < this.height-2 )
                    ){
                        this.board[y][x] = 2;
                    }

                    // Stones in the middle
                    if( y % 2 === ( !evenHeight || y < middleHeight ? 0 : 1 ) &&
                        x % 2 === ( !evenWidth || x < middleWidth ? 0 : 1 ) ){
                        this.board[y][x] = 1;
                    }

                    // if(evenHeight){
                    // }else{
                    //     if( y % 2 === 0 ){
                    //         this.board[y][x] = 2;
                    //     }
                    // }



                }
            }
        }
        console.log(this.board);
    }

}

class AudioManager{

}

// Code to initialize everything
let main = new Main();