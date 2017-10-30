class Main{
    constructor(playerName, audioManager){
        this.network = new Network();
        this.board = new Board(audioManager);
        this.network.sendMessage({func: "join", name: playerName});

        let thisBoard = this.board;
        this.network.getMessage(function(data){
            // console.log(data);
            thisBoard.setBoardData(data.board);
            thisBoard.removePlayers(data.removedPlayers);
            thisBoard.setPlayerView(data.playerView);
        });
        this.allowedKeyCodes = [87, 65, 83, 68, 32, 38, 37, 40, 39]; // WASD, pijltjes en spatie

        // this.network.sendMessage({func: "createGame", name: "Arjan"});
        // this.network.sendMessage({func: "addPlayer", name: "Alwin"});
        this.setupListener();
        this.keyPress = {};

        let t = this;
        this.keySend = setInterval(function(){
            t.network.sendMessage({func: "keyHandle", key: t.keyPress});
        },50/3);
    }

    setupListener(){
        let allowedKeyCodes = this.allowedKeyCodes;
        let t = this;
        window.addEventListener("keydown",function (e) {
            // We willen geen onnodige keyCodes sturen dus ff filteren
            if(allowedKeyCodes.indexOf(e.keyCode) > -1){
                if(e.keyCode === 32){
                    t.placeBomb();
                }else{
                    t.keyPress[e.keyCode] = true;
                }
            }
        },false);
        window.addEventListener("keyup",function (e) {
            // We willen geen onnodige keyCodes sturen dus ff filteren
            if(allowedKeyCodes.indexOf(e.keyCode) > -1){
                delete t.keyPress[e.keyCode];
            }
        },false);
    }
    placeBomb(){
        this.network.sendMessage({func: "keyHandle", key: 32});
    }
}

class Network{
    constructor(){
        this.socket = io();
    }

    getMessage(callback){
        this.socket.on('updateGame', function(data){
            callback(data);
            // document.getElementById('debugInfo').innerHTML = data; // FOR DEBUGGING
        });
    }
    sendMessage(msg){
        this.socket.emit("client", msg);
    }

}

class Board{
    constructor(audioManager){

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

        this.audioManager = audioManager;
        this.audioManager.playingBGM();
        this.board = [];
        this.environmentSprites = {
            0: "Blocks/BackgroundTile.png",
            1: "Blocks/SolidBlock.png",
            2: "Blocks/ExplodableBlock.png",
            10: "Powerups/BombPowerup.png",
            11: "Powerups/FlamePowerup.png",
            12: "Powerups/SpeedPowerup.png",

            21: "Bomb/Bomb_f01.png",
            22: "Bomb/Bomb_f02.png",
            23: "Bomb/Bomb_f03.png",

            24: "Flame/Flame_f02.png",
            25: "Flame/Flame_f00.png",
            26: "Flame/Flame_f01.png",
            27: "Flame/Flame_f02.png",
            28: "Flame/Flame_f03.png",
            29: "Flame/Flame_f04.png",
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
            // 1: {direction: "left", num: 0,x: 55, y: 20, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            // 2: {direction: "left", num: 0,x: this.cellWidth*(this.width-2) + 5, y: 20, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            // 3: {direction: "left", num: 0,x: 55, y: this.cellHeight*(this.height-2) - 30, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
            // 4: {direction: "left", num: 0,x: this.cellWidth*(this.width-2) + 5, y: this.cellHeight*(this.height-2) - 30, w: this.cellWidth-10, h: 128 / 64 * (this.cellWidth-10)},
        };
        this.playerNumbers = {};

        this.bombs = [];


        // Laad alle afbeelding van te voren.
        let t = this;
        this.loadSprites(function(){
            //console.log("Images loaded");

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

                        let t = this;
                        img.onload = function(){
                            let c = document.createElement('canvas');
                                c.width = img.width;
                                c.height = img.height;
                            let ctx = c.getContext('2d');
                                ctx.translate(img.width, 0);
                                ctx.scale(-1, 1);
                                ctx.drawImage(img, 0, 0, img.width, img.height);
                                t.playerSprites[i].left[j] = c;

                            imagesToLoad--;
                            if (imagesToLoad === 0) {
                                callback();
                            }
                        };

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
        let bombs = this.bombs;
        if(this.board.length > 0){
            for(let y=0; y < this.height ;y++){
                for(let x=0; x < this.width ;x++){
                    if(this.board[y][x] === 24){

                        let explode = true;
                        for(let i=0; i< this.bombs.length;i++){
                            if(this.bombs[i] === x + "-" + y){
                                explode = false;
                            }
                        }

                        if(explode){
                            this.audioManager.explode(x + "-" + y);
                            this.bombs[this.bombs.length] = x + "-" + y;
                        }

                        // Play bomb sound
                    }else if(this.bombs.indexOf( x + "-" + y) > -1){
                        delete this.bombs[this.bombs.indexOf( x + "-" + y)];
                    }
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

                if(this.playerView[key].lives === 0) continue;
                // Draw player
                this.playersCtx.drawImage(
                    this.playerSprites[this.playerView[key].playerNumber][this.playerView[key].direction][this.playerView[key].num], // Image
                    0,  // x of image
                    0,  // y of image
                    64, // Width of image
                    128,// Height of image
                    this.playerView[key].x,  // x on board
                    this.playerView[key].y,  // y on board
                    this.playerView[key].w,  // Player width on board
                    this.playerView[key].h); // Player height on board
                
                // Draw the playername\

                this.playersCtx.font = "20px Arial";
                this.playersCtx.fillStyle = "white";
                this.playersCtx.textAlign = "center";
                this.playersCtx.fillText(this.playerView[key].name,(this.playerView[key].x + 20),this.playerView[key].y);

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
        },50/3);

    }

    setPlayerView(data){
        for(let playerId in data){

            if(!data.hasOwnProperty(playerId)) {
                continue;
            }

            if(typeof this.playerView[playerId] === 'undefined'){
                // console.log(data[playerId].x + "," + data[playerId].y);

                this.playerView[playerId] = {
                    direction: data[playerId].direction,
                    x: data[playerId].x,
                    y: data[playerId].y,
                    num: 0,
                    w: this.cellWidth-10,
                    h: 128 / 64 * (this.cellWidth-10),
                    playerNumber: data[playerId].playerNumber,
                    lives: 3,
                    name: ''
                };
                this.playerNumbers[playerId] = Object.size(this.playerView);
            }

            if(this.playerView[playerId].direction !== data[playerId].direction) {
                this.playerView[playerId].num = 0;
            }
            this.playerView[playerId].direction = data[playerId].direction;
            this.playerView[playerId].x = data[playerId].x;
            this.playerView[playerId].y = data[playerId].y;
            this.playerView[playerId].lives = data[playerId].lives;
            this.playerView[playerId].name = data[playerId].name;


        }
    }

    removePlayers(data){
        for(let playerId in data){
            delete this.playerView[data[playerId]];
        }
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
    constructor (){
        this.sounds = {
            bombSound: new Audio('client/sounds/bomb/bomb1.mp3'),
            playingBGM: new Audio('client/sounds/background/rld.mp3'),
        };

        this.bombSounds = {};
    }

    explode(id){
        if( typeof this.bombSounds[id] !== 'undefined'){
            return;
        }
        //console.log(id);
        this.bombSounds[id] = this.sounds['bombSound'].cloneNode();
        this.bombSounds[id].dataset.id = id;
        let bombSounds = this.bombSounds;
        this.bombSounds[id].addEventListener("ended", function(){
            delete bombSounds[this.dataset.id];
        });
        this.bombSounds[id].play();
        // this.bombSounds[id].play();
        // this.bombSound.play();
    }
    playingBGM(){
        let bgm = this.sounds['playingBGM'];
        // setInterval(function(){
        //     if(bgm.currentTime >= 64){
        //         // bgm.currentTime = 1.32;
        //         bgm.currentTime = 3.24;
        //     }
        // },1000);
        bgm.play();
        bgm.loop = true;

        // bgm.currentTime = 63;
    }

}


let am = new AudioManager();

// Code to initialize everything with playername
let playerName = prompt("Please enter a nickname");
while(playerName == "" || playerName == null){
    playerName = prompt("Please enter a nickname");
}


let main = new Main(playerName, am);
Object.size = function(obj) {
    let size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
