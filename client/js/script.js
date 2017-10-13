class Main{
    constructor(){
        this.network = new Network();
        this.board = new Board();

        this.network.getMessage(function(data){
            console.log(data);
        });
        this.allowedKeyCodes = [87, 65, 83, 68, 32, 38, 37, 40, 39]; // WASD, pijltjes en spatie

        // this.network.sendMessage({func: "createGame", name: "Arjan"});
        // this.network.sendMessage({func: "addPlayer", name: "Alwin"});
        this.setupListener();
    }

    setupListener(){
        let net = this.network;
        let allowedKeyCodes = this.allowedKeyCodes;
        window.addEventListener("keydown",function (e) {
            // We willen geen onnodige keyCodes sturen dus ff filteren
            if(allowedKeyCodes.indexOf(e.keyCode) > -1){
                net.sendMessage({func: "keyHandle", key: e.keyCode});
            }
        },false);
    }
}

class Network{
    constructor(){
        this.socket = io();
    }

    getMessage(callback){
        this.socket.on('updateGame', function(data){
            console.log(data.board);

            callback(data);


            // document.getElementById('debugInfo').innerHTML = data; // FOR DEBUGGING
        });
    }
    sendMessage(msg){
        this.socket.emit("client", msg);
    }

}

class Board{

    constructor(){

        // Aantal tiles in de breedte en hoogte
        // Mooie waardes: 7, 8, 13, 14, 19, 20
        this.width = 19;
        this.height = 19;

        // Grote van een enkele tile
        this.cellWidth = 50;
        this.cellHeight = 50;


        this.canvas = this.createCanvas();
        this.canvas.id = "board";
        this.ctx = this.canvas.getContext("2d");

        this.playersCanvas = this.createCanvas();
        this.playersCanvas.id = "players";
        this.playersCtx = this.playersCanvas.getContext("2d");

        this.board = [];
        this.environmentSprites = {
            0: "Blocks/BackgroundTile.png",
            1: "Blocks/SolidBlock.png",
            2: "Blocks/ExplodableBlock.png",
            10: "Powerups/BombPowerup.png",
            11: "Powerups/FlamePowerup.png",
            12: "Powerups/SpeedPowerup.png",
        };
        this.playerSprites = {
            1: { front: [], back: [], left: [], right: [] },
            2: { front: [], back: [], left: [], right: [] },
            3: { front: [], back: [], left: [], right: [] },
            4: { front: [], back: [], left: [], right: [] },
            base: {
                front: [
                    "Bomberman/White/Front/Bman_F_f00.png",
                ],
                back: [
                    "Bomberman/White/Back/Bman_B_f00.png",
                ],
                side: [
                    "Bomberman/White/Side/Bman_F_f00.png",
                ]
            }
        };

        // Data waar de players staan en welke kant op ze kijken.
        this.playerView = {
            1: {direction: "left", num: 0,x: 55, y: 20, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            2: {direction: "left", num: 0,x: 205, y: 20, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            3: {direction: "left", num: 0,x: 255, y: 70, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            4: {direction: "left", num: 0,x: 355, y: 70, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
        };

        // Laad alle afbeelding van te voren.
        let t = this;
        this.loadSprites(function(){
            console.log("Images loaded");

            window.requestAnimationFrame(function(){
                t.drawBoard();
                t.drawPlayers();
            });

        });
    }


    /**
     *
     * Maakt een canvas aan en returned die.
     *
     * @return {Element}
     */
    createCanvas(){
        let canvas = document.createElement("canvas");
            canvas.width = this.cellWidth * this.width;
            canvas.height = this.cellHeight * this.height;
        document.querySelector("#main").appendChild(canvas);
        return canvas;
    }

    /**
     * Laad alle sprites/afbeeldingen van te voren
     * @param callback
     */
    loadSprites(callback){
        let imagesToLoad = 0;

        for(let key in this.environmentSprites){
            if(!this.environmentSprites.hasOwnProperty(key)) continue;
            imagesToLoad++;
            let img = new Image();
                img.src = "client/images/Sprites/" + this.environmentSprites[key];
                img.onload = function(){
                    imagesToLoad--;
                    if(imagesToLoad === 0){
                        callback();
                    }
                };
            this.environmentSprites[key] = img;
        }
        for(let key in this.playerSprites.base) {

            if (!this.playerSprites.base.hasOwnProperty(key)) continue;

            for(let i=1; i <= 4; i++){
                let color = "";

                // Kleuren van de spelers
                if(i === 1) color = "White";
                if(i === 2) color = "Blue";
                if(i === 3) color = "Red";
                if(i === 4) color = "Green";

                // Elke speler animatie heeft 7 afbeeldingen
                for(let j=0; j <= 7; j++) {


                    imagesToLoad++;
                    let img = new Image();
                    img.src = "client/images/Sprites/" + this.playerSprites.base[key][0].replace("White",color).replace("f00","f0"+j);
                    img.onload = function () {
                        imagesToLoad--;
                        if (imagesToLoad === 0) {
                            callback();
                        }
                    };

                    // Spiegel rechterkant naar linkerkant
                    if(key === "side"){
                        this.playerSprites[i].right[j] = img;

                        let c = document.createElement('canvas');
                            c.width = img.width;
                            c.height = img.height;
                        let ctx = c.getContext('2d');
                            ctx.translate(img.width, 0);
                            ctx.scale(-1, 1);
                            ctx.drawImage(img, 0, 0);

                        this.playerSprites[i].left[j] = c;
                    }else{
                        this.playerSprites[i][key][j] = img;
                    }
                }
            }
        }
    }

    /**
     * Print het bord op de canvas
     */
    drawBoard(){
        if(this.board.length > 0){
            for(let y=0; y < this.height ;y++){
                for(let x=0; x < this.width ;x++){
                    this.ctx.drawImage(this.environmentSprites[this.board[y][x]], x*this.cellWidth, y*this.cellHeight, this.cellWidth, this.cellHeight);
                }
            }
        }

        let t = this;
        setTimeout(function(){
            window.requestAnimationFrame(function(){
                t.drawBoard();
            });
        },50);
    }

    /**
     * Print de spelers
     */
    drawPlayers(){

        if(this.board.length > 0) {
            // Clear whole canvas
            this.playersCtx.clearRect(0, 0, this.playersCanvas.width, this.playersCanvas.height);

            // Loop through players
            for (let key in this.playerView) {

                if (!this.playerView.hasOwnProperty(key)) continue;

                // Draw player
                this.playersCtx.drawImage(
                    this.playerSprites[key][this.playerView[key].direction][this.playerView[key].num], // Image
                    0,  // x of image
                    0,  // y of image
                    64, // Width of image
                    128,// Height of image
                    this.playerView[key].x,  // x on board
                    this.playerView[key].y,  // y on board
                    this.playerView[key].w,  // Player width on board
                    this.playerView[key].h); // Player height on board


                // New player animation image
                this.playerView[key].num++;

                // Reset animation to 0 by end
                if (this.playerView[key].num > 7) this.playerView[key].num = 0;
            }
        }
        // Renew players
        let t = this;
        setTimeout(function(){
            window.requestAnimationFrame(function(){
                t.drawPlayers();
            });
        },50);

    }

    setPlayerView(data){
        this.playerView = data;
    }
    setBoardData(data){
        this.board = data;
    }
    getPlayerView(){
        return this.playerView;
    }
    getBoardData(){
        return this.board;
    }

}

class AudioManager{

}

// Code to initialize everything
let main = new Main();