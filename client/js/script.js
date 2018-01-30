const FPS = 30; // Frames per second

/**
 * Main class which is the base class for the client
 */
class Main{
    /**
     * Constructor
     * @param playerName Name of the player
     * @param audioManager
     */
    constructor(playerName, audioManager){

        this.network = new Network(); // Initialize network class
        this.board = new Board(audioManager); // Initialize board class

        // Send player name to the server
        this.network.sendMessage({func: "join", name: playerName});

        this.started = false; // Started or not
        let thisBoard = this.board;
        let t = this;

        // This handles the responses from the server
        this.network.getMessage(function(data){
            if(!data.started){

                // Set the board size so every player has the same size of the board
                thisBoard.setSize(data.size);

                // Players element
                let players = $('.players');
                    players.html("");

                // Show every player in the start/wait screen
                for(let playerId in data.roomPlayers){
                    if(!data.roomPlayers.hasOwnProperty(playerId)) continue;

                    let player = $("<div class='player'></div>");
                        player.append("<div class='player-name'>" + data.roomPlayers[playerId].name + " ( " + data.roomPlayers[playerId].score + " wins )</div>");
                    let img = thisBoard.playerSprites[data.roomPlayers[playerId].number].front[0].cloneNode();
                        img.setAttribute("class", "player-image");

                    player.append(img);
                    players.append(player);
                }

            }else{
                // When game is started, hide the start screen
                if(!t.started){
                    $(".start-screen").fadeOut();
                    t.started = true;
                }
                // Set left players
                thisBoard.removePlayers(data.removedPlayers);

                // Set board data
                thisBoard.setBoardData(data.board);

                // Set players view
                thisBoard.setPlayerView(data.playerView);
            }
        });

        // Allowed key codes
        this.allowedKeyCodes = [87, 65, 83, 68, 32, 38, 37, 40, 39];
        this.setupListener();
        this.keyPress = {};

        // Interval for sending keys to the server
        this.keySend = setInterval(function(){
            t.network.sendMessage({func: "keyHandle", key: t.keyPress});
        },1000/FPS);

        // Only the owner may start the game
        this.network.ifOwner(function(isOwner){

            if(isOwner){
                let div = $("<button id='start'>START</button>");
                $(".start-screen #wrapper").append(div);

                div.click(function(){
                    t.network.sendMessage({func: "startGame"});
                });
            }else{
                $("#start").remove();
            }
        });

        // When game is finished
        this.network.onGameEnd(function(data){
            if(data.winner){
                if(t.network.socket.id === data.winner){
                    alert("Congratulation, you won the game!");
                }else{
                    alert("Ahhh, you lost the game. \n" + data.roomPlayers[data.winner].name + " won the game.");
                }
                $(".start-screen").fadeIn();
                t.started = false;
            }
        });
    }

    /**
     * Setup listeners for keys which are pressed
     */
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

    /**
     * Send to the server that spacebar is pressed
     */
    placeBomb(){
        this.network.sendMessage({func: "keyHandle", key: 32});
    }
}


/**
 * Network class which handles the connection with the server
 */
class Network{
    constructor(){
        // Set socket
        this.socket = io();
    }

    /**
     * Get a message from the server
     * @param callback Callback function
     */
    getMessage(callback){
        this.socket.on('updateGame', function(data){
            callback(data);
        });
    }

    /**
     * Send a message to the server
     * @param msg Message
     */
    sendMessage(msg){
        this.socket.emit("client", msg);
    }

    /**
     * Chech if this player is the owner
     * @param callback Callback function
     */
    ifOwner(callback){
        let t = this;
        this.socket.on('owner',function(data){
            callback(data === t.socket.id);
        });
    }

    /**
     * What to do when game is ended
     * @param callback Callback function
     */
    onGameEnd(callback){
        this.socket.on('gameEnded', function(data){
            callback(data);
        });
    }
}

/**
 * Board class which handles the game view, like the board and players
 */
class Board{

    /**
     * Constructor
     * @param audioManager
     */
    constructor(audioManager){

        // Board size
        this.width = 19;
        this.height = 19;

        // Cell size
        this.cellWidth = 50;
        this.cellHeight = 50;

        // Game canvas
        this.canvas = this.createCanvas();
        this.canvas.id = "board";
        this.ctx = this.canvas.getContext("2d");

        // Player canvas
        this.playersCanvas = this.createCanvas();
        this.playersCanvas.id = "players";
        this.playersCtx = this.playersCanvas.getContext("2d");

        // Audio
        this.audioManager = audioManager;
        this.audioManager.playingBGM();

        // Board grid
        this.board = [];

        // Environment sprites
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

            24: "Flame/Flame_F02.png",
            25: "Flame/Flame_f00.png",
            26: "Flame/Flame_f01.png",
            27: "Flame/Flame_F02.png",
            28: "Flame/Flame_F03.png",
            29: "Flame/Flame_F04.png",
        };

        // Player sprites
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

        // Data where the players are standing and in which direction they are looking
        this.playerView = {};

        // Each player's number
        this.playerNumbers = {};

        // Collection of the bombs
        this.bombs = [];

        let t = this;

        // Load all sprites before using them
        this.loadSprites(function(){
            window.requestAnimationFrame(function(){
                t.drawBoard();
                t.drawPlayers();
            });
        });
    }

    /**
     * Create a canvas element and return it
     */
    createCanvas(){
        let canvas = document.createElement("canvas");
            canvas.width = this.cellWidth * this.width;
            canvas.height = this.cellHeight * this.height;
        document.querySelector("#main").appendChild(canvas);
        return canvas;
    }

    /**
     * Load all sprites before the game starts
     * @param callback Function when all sprites are loaded
     */
    loadSprites(callback){
        let imagesToLoad = 0;

        // Load all environment sprites
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

        // Load all player sprites
        for(let key in this.playerSprites.base) {

            if (!this.playerSprites.base.hasOwnProperty(key)) continue;

            for(let i=1; i <= 4; i++){ // There are 4 colors
                let color = "";

                // Colors of the players
                if(i === 1) color = "White";
                if(i === 2) color = "Blue";
                if(i === 3) color = "Red";
                if(i === 4) color = "Green";

                for(let j=0; j <= 7; j++) { // Every player has 7 animation images
                    imagesToLoad++;
                    let img = new Image();
                    img.src = "client/images/Sprites/" + this.playerSprites.base[key][0].replace("White",color).replace("f00","f0"+j);
                    img.onload = function () {
                        imagesToLoad--;
                        if (imagesToLoad === 0) {
                            callback();
                        }
                    };

                    // Mirror the right side to left side
                    if(key === "side"){
                        this.playerSprites[i].right[j] = img;
                        let t = this;
                        // Overwrite onload. This is for copying the image to a canvas and mirroring it.
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
                        // Set the player sprites correct
                        this.playerSprites[i][key][j] = img;
                    }
                }
            }
        }
    }

    /**
     * Print the board on the canvas
     */
    drawBoard(){
        let bombs = this.bombs;
        if(this.board.length > 0){
            for(let y=0; y < this.height ;y++){
                for(let x=0; x < this.width ;x++){

                    // Play sound when bomb explodes
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

                    // Draw the board
                    this.ctx.drawImage(this.environmentSprites[this.board[y][x]], x*this.cellWidth, y*this.cellHeight, this.cellWidth, this.cellHeight);
                }
            }
        }
        // Board writing timer
        let t = this;
        setTimeout(function(){
            window.requestAnimationFrame(function(){
                t.drawBoard();
            });
        },1000/FPS);
    }

    /**
     * Print the players on the canvas
     */
    drawPlayers(){
        if(this.board.length > 0) {
            // Clear whole canvas
            this.playersCtx.clearRect(0, 0, this.playersCanvas.width, this.playersCanvas.height);

            // Loop through players
            for (let key in this.playerView) {
                if (!this.playerView.hasOwnProperty(key)) continue;

                if(this.playerView[key].lives <= 0) continue; // Player is dead

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
                
                // Draw the playername
                this.playersCtx.font = "20px Arial";
                this.playersCtx.fillStyle = "white";
                this.playersCtx.textAlign = "center";
                this.playersCtx.fillText(
                    this.playerView[key].name + " (" + this.playerView[key].lives + ")",
                    ( this.playerView[key].x + 20 ),
                    this.playerView[key].y
                );

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
        },1000/FPS);

    }

    /**
     * Set the player view
     * @param data The player view from the server
     */
    setPlayerView(data){
        // For each player
        for(let playerId in data){
            if(!data.hasOwnProperty(playerId)) {
                continue;
            }

            // First time, create player with base values
            if(typeof this.playerView[playerId] === 'undefined'){

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

            // Set player animation frame to 0 when the direction is changed
            if(this.playerView[playerId].direction !== data[playerId].direction) {
                this.playerView[playerId].num = 0;
            }

            // Set player's values
            this.playerView[playerId].direction = data[playerId].direction;
            this.playerView[playerId].x = data[playerId].x;
            this.playerView[playerId].y = data[playerId].y;
            this.playerView[playerId].lives = data[playerId].lives;
            this.playerView[playerId].name = data[playerId].name;
        }
    }

    /**
     * Remove players from the view
     * @param data Removed players from the server
     */
    removePlayers(data){
        for(let playerId in data){
            delete this.playerView[data[playerId]];
        }
    }

    /**
     * Set the board data
     * @param data Board grid from the server
     */
    setBoardData(data){
        this.board = data;
    }

    /**
     * Get the player view
     */
    getPlayerView(){
        return this.playerView;
    }

    /**
     * Get the board grid/data
     */
    getBoardData(){
        return this.board;
    }

    /**
     * Set the board sizes
     * @param data Board sizes form the server
     */
    setSize(data){
        this.width = data.width;
        this.height = data.height;
        this.cellWidth = data.cellWidth;
        this.cellHeight = data.cellHeight;
    }
}


/**
 * AudioManager class which handles the sounds
 */
class AudioManager{

    constructor (){
        // Set the sound
        this.sounds = {
            bombSound: new Audio('client/sounds/bomb/bomb1.mp3'),
            playingBGM: new Audio('client/sounds/background/rld.mp3'),
        };

        // This is to prevent play the sound for 1 bomb more than 1 times.
        this.bombSounds = {};
    }

    /**
     * Play exploding bomb sound
     * @param id
     */
    explode(id){
        if( typeof this.bombSounds[id] !== 'undefined'){
            return;
        }
        this.bombSounds[id] = this.sounds['bombSound'].cloneNode();
        this.bombSounds[id].dataset.id = id;
        let bombSounds = this.bombSounds;
        this.bombSounds[id].addEventListener("ended", function(){
            delete bombSounds[this.dataset.id];
        });
        this.bombSounds[id].play();
    }

    /**
     * Play background music
     */
    playingBGM(){
        let bgm = this.sounds['playingBGM'];
        bgm.play();
        bgm.loop = true;
    }

}

// Initialize audio manager as first
let am = new AudioManager();

// Code to initialize everything with playername
let playerName = prompt("Please enter a nickname");
while(playerName == "" || playerName == null){
    playerName = prompt("Please enter a nickname");
}

// Create main class
let main = new Main(playerName, am);


/**
 * Function to get the size of an object.
 */
Object.size = function(obj) {
    let size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
