/**
 * Main class/function that is the base for the game.
 * @param roomId Room which it belongs to
 * @param io Socket controller
 * @param roomMaster Room master id
 * @return itself
 */
exports.Main = function(roomId, io, roomMaster){
    this.board = new Board();
    this.io = io;
    this.roomId = roomId;
    this.roomMaster = roomMaster;
    this.started = false; // If the game is started or not
    this.removedPlayers = []; // Players who are removed
    this.walkingPlayers = {}; // Players who walk and in which direction
    var t = this; // Referring to this

    const UPS = 60; // Updates per second (like fps but than updates instead of frames)


    /**
     * Get the Board object
     * @return {Board}
     */
    this.getBoard = function (){
        return this.board;
    };

    /**
     * Creates a board, add the room master as player and updates the game
     */
    this.createGame = function () {
        this.board.createBoard();
        this.board.addPlayer(roomMaster, '');
        this.updateGame();
    };

    /**
     * Add a player to the game
     * @param id Unique identifier of a player
     * @param name Name of the player
     */
    this.addPlayer = function(id, name) {
        this.board.addPlayer(id, name);
        this.updateGame();
    };

    /**
     * Set a player's name
     * @param id Unique identifier of the player
     * @param name New name for the player
     */
    this.setPlayerName = function (id, name){
        this.board.setPlayerName(id, name);
        this.updateGame();
    };

    /**
     * Remove a player from the game
     * @param id Unique identifier of the player
     * @return {boolean} Returns false where there are no players left
     */
    this.removePlayer = function(id){
        this.board.removePlayer(id);
        if(id === this.roomMaster){
            var playersLength = Object.size(this.board.getPlayers());
            if(playersLength <= 0){
                return false;
            }else{
                this.roomMaster = Object.keys(this.board.getPlayers())[0];
                this.io.emit('owner', this.roomMaster);
            }
        }
        this.removedPlayers[this.removedPlayers.length] = id;
        this.updateGame();
        return true;
    };

    /**
     * Updating the game and send data to the players/clients
     */
    this.updateGame = function(){
        for(var playerId in this.walkingPlayers){
            if(!this.walkingPlayers.hasOwnProperty(playerId)) continue;
            if(this.walkingPlayers[playerId].up === true){
                this.keyHandle(38, playerId);
            }
            if(this.walkingPlayers[playerId].left === true) {
                this.keyHandle(37, playerId);
            }
            if(this.walkingPlayers[playerId].down === true) {
                this.keyHandle(40, playerId);
            }
            if(this.walkingPlayers[playerId].right === true) {
                this.keyHandle(39, playerId);
            }
        }
        var players = this.board.getPlayers();
        if(this.started){

            // Check who are stil playing and aren't dead
            var survivors = [];
            for(var k in players){
                if(!players.hasOwnProperty(k)) continue;
                if(!players[k].isDead()) survivors[survivors.length] = k;
                if(survivors.length > 1) break;
            }
            // If one survivor is left, end the game
            if(survivors.length === 1){
                this.started = false;
                var winner = survivors[0];
                players[winner].won();
                this.io.sockets.in(this.roomId).emit("gameEnded", {
                    winner: winner,
                    removedPlayers: this.removedPlayers,
                    roomPlayers: players
                });
                this.board = null;
                this.board = new Board();
                for(var id in players){
                    this.board.addPlayer(id, players[id].name);
                    this.board.getPlayerById(id).score = players[id].score;
                }
                this.board.createBoard();
                this.updateGame();
                return;
            }
            // Send the update info
            this.io.sockets.in(this.roomId).emit("updateGame", {
                board: this.board.getGridData(),
                playerView: this.board.getPlayerView(),
                started: this.started,
                removedPlayers: this.removedPlayers
            });

        }else{
            // Send the update info
            this.io.sockets.in(this.roomId).emit("updateGame", {
                roomPlayers: players,
                size: this.board.getSize(),
                started: this.started
            });
        }
    };

    /**
     * Start a game
     * @param playerId Unique identifier of the player, for checking if he is the room master
     */
    this.startGame = function(playerId){
        if(playerId !== this.roomMaster) return;
        this.started = true;

    };

    /**
     * Update the game every seconds
     * @type {exports.Main}
     */
    setInterval(function(){
        if(t.started){
            t.updateGame();
        }
    },1000/UPS);

    /**
     * Set if a player is walking or placing a bomb.
     * This method is specially to prevent faster walk when pressing 2 keys in the same direction, like 'w' and 'arrow up'.
     * @param keys The keys the player is pressing
     * @param playerId
     */
    this.setKeys = function(keys, playerId){
        this.walkingPlayers[playerId] = {up: false, left: false, down: false, right: false, spacebar: false};
        for(var key in keys){
            if(!keys.hasOwnProperty(key)) continue;
            switch (parseInt(key)){
                case 87:
                case 38:
                    // Up
                    this.walkingPlayers[playerId].up = true;
                    break;
                case 65:
                case 37:
                    // Left
                    this.walkingPlayers[playerId].left = true;
                    break;
                case 83:
                case 40:
                    // Down
                    this.walkingPlayers[playerId].down = true;
                    break;
                case 68:
                case 39:
                    // Right
                    this.walkingPlayers[playerId].right = true;
                    break;
                case 32:
                    // Spacebar - Place bomb and remove after 3 seconds.
                    this.keyHandle(32, playerId);
                    break;
            }
        }
    };

    /**
     * Handles the pressed keys.
     * @param keyId Key id which is pressed
     * @param playerId Unique identifier of the player
     */
    this.keyHandle = function(keyId, playerId){
        // WASD: 87, 65, 83, 68
        // Pijltjes zelfde volgorde: 38, 37, 40, 39
        // Spatie: 32

        if(!this.started) return;
        var player = this.board.getPlayerById(playerId);
        if(typeof player == 'undefined' || player.isDead()) return;
        if(typeof player != 'undefined'){
            var playerPos = player.getPosition();
            var movementBlocked = [-1, 1, 2, 21, 22, 23];
            // Calculate speed if updates per second has changed
            var globalSpeed = 4 * ( 60 / UPS );
            var currentBlock = this.board.getBlockXAndY(playerPos.x, playerPos.y);
            // Do a quick check to see if the player is CURRENTLY on a powerup
            var powerups = [10, 11, 12];
            if(powerups.indexOf(this.board.getBlock(currentBlock.x, currentBlock.y)) > -1){
                player.powerUp(this.board.getBlock(currentBlock.x, currentBlock.y));
                this.board.grid[currentBlock.y][currentBlock.x] = 0;
            }
            var playerPoints = player.getCollisionPoints();
            switch (keyId){
                case 87:
                case 38:
                    // Up
                    player.setDirection(3);
                    var blockPoints = this.board.blockCollisions(currentBlock.x, currentBlock.y-1);
                    var moveToBlock = this.board.getBlock(currentBlock.x, currentBlock.y-1);
                    if((blockPoints.bottomLeft.x < playerPoints.topLeft.x &&
                          blockPoints.bottomRight.x > playerPoints.topRight.x &&
                          movementBlocked.indexOf(moveToBlock) <= 0 ) ||
                        currentBlock.y * 50 < playerPos.y-player.speed*globalSpeed + 40 ){
                        player.setPosition(playerPos.x, playerPos.y -= player.speed*globalSpeed);
                    }
                    break;
                case 65:
                case 37:
                    // Left
                    player.setDirection(2);
                    var blockPoints = this.board.blockCollisions(currentBlock.x-1, currentBlock.y);
                    var moveToBlock = this.board.getBlock(currentBlock.x-1, currentBlock.y);
                    if((blockPoints.topRight.y < playerPoints.topLeft.y &&
                            blockPoints.bottomRight.y > playerPoints.bottomLeft.y &&
                            movementBlocked.indexOf(moveToBlock) <= 0 ) ||
                        currentBlock.x * 50 < playerPos.x - player.speed*globalSpeed ){
                        player.setPosition(playerPos.x -= player.speed*globalSpeed, playerPos.y);
                    }
                    break;
                case 83:
                case 40:
                    // Down
                    player.setDirection(1);
                    var blockPoints = this.board.blockCollisions(currentBlock.x, currentBlock.y+1);
                    var moveToBlock = this.board.getBlock(currentBlock.x, currentBlock.y+1);
                    if((blockPoints.topLeft.x < playerPoints.bottomLeft.x &&
                            blockPoints.topRight.x > playerPoints.bottomRight.x &&
                            movementBlocked.indexOf(moveToBlock) <= 0 ) ||
                        currentBlock.y * 50 < playerPos.y+player.speed*globalSpeed ){
                        player.setPosition(playerPos.x, playerPos.y += player.speed*globalSpeed);
                    }
                    break;
                case 68:    
                case 39:
                    // Right
                    player.setDirection(4);
                    var blockPoints = this.board.blockCollisions(currentBlock.x+1, currentBlock.y);
                    var moveToBlock = this.board.getBlock(currentBlock.x+1, currentBlock.y);
                    if((blockPoints.topLeft.y < playerPoints.topRight.y &&
                            blockPoints.bottomLeft.y > playerPoints.bottomRight.y &&
                            movementBlocked.indexOf(moveToBlock) <= 0 ) ||
                        currentBlock.x * 50 > playerPos.x - 5 ){
                        player.setPosition(playerPos.x += player.speed*globalSpeed, playerPos.y);
                    }
                    break;
                case 32:
                    // Spacebar - Place bomb and remove after 3 seconds.
                    if(player.placeBomb() !== null){
                        var gridCoords = this.board.getBlockXAndY(playerPos.x+20, playerPos.y+20);
                        var currentCell = this.board.grid[gridCoords.y][gridCoords.x];
                        this.board.grid[gridCoords.y][gridCoords.x] = 21;
                        var board = this.board;
                        var tempGame = this;
                        var fireCells;
                        if(typeof board.bombs[gridCoords.y] === 'undefined') board.bombs[gridCoords.y] = [];
                        board.bombs[gridCoords.y][gridCoords.x] = playerId;

                        setTimeout(function(){
                            if(board.bombs[gridCoords.y][gridCoords.x] === false) return; // Return when bomb already exploded
                            setTimeout(function(){
                                if(board.bombs[gridCoords.y][gridCoords.x] === false) return;
                                setTimeout(function(){
                                    if(board.bombs[gridCoords.y][gridCoords.x] === false) return;
                                        fireCells = board.spawnFire(gridCoords, playerId);
                                        setTimeout(function(){
                                            for(var i = 0; i < fireCells.length; i++) {
                                                // 10 - Extra bomb
                                                // 11 - Extra bomb power
                                                // 12 - Faster player movement
                                                var powerups = [10, 11, 12];
                                                // Prevent powerups from being overwritten again
                                                if(powerups.indexOf(board.getBlock(fireCells[i].x, fireCells[i].y)) < 0){
                                                    board.grid[fireCells[i].y][fireCells[i].x] = 0;
                                                }
                                            }
                                        }, 1000);
                                }, 600);
                                tempGame.board.grid[gridCoords.y][gridCoords.x] = 23;
                            }, 600);
                            tempGame.board.grid[gridCoords.y][gridCoords.x] = 22;
                        }, 600);
                    }
                    break;
            }
        }
    };
    return this;
};

/**
 * Board class/function that handles the board.
 * @constructor
 */
function Board(){
    this.grid = []; // Contains which field is what type of block
    this.players = {}; // Players in the game

    // Board size
    this.width = 19;
    this.height = 19;

    // Cell size
    this.cellWidth = 50;
    this.cellHeight = 50;

    this.playerNumbers = [4,3,2,1];// Numbers players can be
    this.bombs = []; // placed bombs

    /**
     * Add a player to the game/board
     * @param id Unique identifier of a player
     * @param name Name of the player
     */
    this.addPlayer = function(id, name){
        if(Object.size(this.players) === 4) return;
        this.players[id] = new Player(id, name);
        var playerNumber = this.playerNumbers.pop();
        this.players[id].setNumber(playerNumber);
        switch (playerNumber){
            case 1:
                this.players[id].setPosition(55, 20);
                break;
            case 2:
                this.players[id].setPosition(this.cellWidth*(this.width-2) + 5, 20);
                break;
            case 3:
                this.players[id].setPosition(55, this.cellHeight*(this.height-2) - 30);
                break;
            case 4:
                this.players[id].setPosition(this.cellWidth*(this.width-2) + 5, this.cellHeight*(this.height-2) - 30);
                break;
        }
    };


    /**
     * Set a player's name
     * @param id Unique identifier of the player
     * @param name New name for the player
     */
    this.setPlayerName = function (id, name){
        if(typeof this.players[id] !== 'undefined'){
            this.players[id].name = name;
        }
    };

    /**
     * Remove a player from the game
     * @param id Unique identifier of the player
     */
    this.removePlayer = function(id){
        if(typeof this.players[id] !== 'undefined'){
            this.playerNumbers[this.playerNumbers.length] = this.players[id].getNumber();
            delete this.players[id];
        }
    };

    /**
     * Get a player by his id
     * @param id Unique identifier of the player
     * @return Player
     */
    this.getPlayerById = function(id){
        for(var p in this.players){
            if(p === id){
                return this.players[id];
            }
        }
    };

    /**
     * Get all players
     * @return {Player} Object of players
     */
    this.getPlayers = function(){
        return this.players;
    };

    /**
     * Generate a board.
     */
    this.createBoard = function(){
        // Kijkt of het bord beedte/hoogte even is
        var evenWidth = this.width % 2 === 0;
        var evenHeight = this.height % 2 === 0;
        // Het midden van de x- en y-as
        var middleWidth = this.width/2;
        var middleHeight = this.height/2;

        for(var y=0; y < this.height ;y++){
            this.grid[y] = [];
            for(var x=0; x < this.width ;x++){
                if(y === 0 || x === 0 || y === this.height-1 || x === this.width-1){
                    this.grid[y][x] = 1;
                }else{
                    this.grid[y][x] = 0;
                    // Breakable blocks (sides)
                    if( (x > 4 && x < this.width-5 && ( y === 1 || y === this.height-2 ) ) || // Top and bottom
                        (y > 4 && y < this.height-5 && ( x === 1 || x === this.width-2 ) ) ){ // Left and right
                        this.grid[y][x] = 2;
                    }
                    // Breakable blocks (whole board)
                    if( (x % 3 === ( !evenWidth || x < middleWidth ? 0 : 1 ) && x > 1 && x < this.width-2  ) ||
                        (y % 3 === ( !evenHeight || y < middleHeight ? 0 : 1 ) && y > 1 && y < this.height-2 )
                    ){
                        this.grid[y][x] = 2;
                    }
                    // Stones in the middle
                    if( y % 2 === ( !evenHeight || y < middleHeight ? 0 : 1 ) &&
                        x % 2 === ( !evenWidth || x < middleWidth ? 0 : 1 ) ){
                        this.grid[y][x] = 1;
                    }
                }
            }
        }
    };

    /**
     * Returns the board grid
     * @return {Array} The board grid as [y:[x]]
     */
    this.getGridData = function(){
        return this.grid;
    };

    /**
     * Get the sizes of the board
     * @return {{width: *, height: *, cellWidth: *, cellHeight: *}}
     */
    this.getSize = function(){
        return {width: this.width, height: this.height, cellWidth: this.cellWidth, cellHeight: this.cellHeight};
    };

    /**
     * Get a block by x and y position
     * @param x Position x of the player
     * @param y Position y of the player
     * @return {{x: Number, y: Number, xInBlock: number, yInBlock: number}}
     */
    this.getBlockXAndY = function(x, y){
        return {
            x: parseInt( ( x ) / this.cellWidth),
            y: parseInt( ( y + 40 ) / this.cellHeight),
            xInBlock: x % this.cellWidth,
            yInBlock: y % this.cellHeight
        };
    };

    /**
     * Get Block by x and y
     * @param x Position x
     * @param y Position y
     * @return int Block type
     */
    this.getBlock = function(x,y){
        return this.grid[y][x];
    };

    /**
     * Check if a player is in fire or not
     * @param fireCells Cells which are in fire
     */
    this.playerDamager = function(fireCells){
        for(var player in this.players){
            var playerPos = this.players[player].getPosition();
            var playerBlock = this.getBlockXAndY(playerPos.x, playerPos.y);
            
            for(var i = 0; i < fireCells.length; i++){
                if(fireCells[i].x === playerBlock.x && fireCells[i].y === playerBlock.y){
                    this.players[player].hit();
                }
            }
        }
    };

    /**
     * Get the players view
     */
    this.getPlayerView = function(){
        // this.players
        var playerView = {};
        for(var playerId in this.players){
            if(!this.players.hasOwnProperty(playerId)) continue;
            var player = this.players[playerId];
            var pos = player.getPosition();

            playerView[playerId] = {
                direction: [null,'front', 'left','back','right'][player.getDirection()],
                x: pos.x,
                y: pos.y,
                playerNumber: player.getNumber(),
                lives: player.lives,
                name: player.name
            };

        }
        return playerView;
    };

    /**
     * Spawn fire for a player's bomb
     * @param gridCoords X and Y position of the bomb
     * @param id Unique identifier of the player
     * @return {[]} Returns the cells who are in fire
     */
    this.spawnFire = function(gridCoords, id){
        // Check if the player who placed the bomb is still connected, otherwise return only the start coords.
        if(typeof this.getPlayerById(id) == 'undefined') return fireCells = [{x: gridCoords.x, y: gridCoords.y}];

        var bombPower = this.getPlayerById(id).getBombPower();
        var fireCells = [{x: gridCoords.x, y: gridCoords.y}];
        this.grid[gridCoords.y][gridCoords.x] = 24;
        // Up
        for(var i = 1; i <= bombPower; i++){
            var handler = this.handleGridFire({y: gridCoords.y-i,x: gridCoords.x});
            if(handler !== 0){
                fireCells.push({y: gridCoords.y-i,x: gridCoords.x});
                if(handler === 2) break;
            }else{
                break;
            }
        }
        // Down
        for(var i = 1; i <= bombPower; i++){
            var handler = this.handleGridFire({y: gridCoords.y+i,x: gridCoords.x});
            if(handler !== 0){
                fireCells.push({y: gridCoords.y+i,x: gridCoords.x});
                if(handler === 2) break;
            }else{
                break;
            }
        }
        // left
        for(var i = 1; i <= bombPower; i++){
            var handler = this.handleGridFire({y: gridCoords.y,x: gridCoords.x-i});
            if(handler !== 0){
                fireCells.push({y: gridCoords.y,x: gridCoords.x-i});
                if(handler === 2) break;
            }else{
                break;
            }
        }
        // right
        for(var i = 1; i <= bombPower; i++){
            var handler = this.handleGridFire({y: gridCoords.y, x: gridCoords.x+i});
            if(handler !== 0){
                fireCells.push({x: gridCoords.x+i, y: gridCoords.y});
                if(handler === 2) break;
            }else{
                break;
            }
        }
        this.playerDamager(fireCells); // To check if players should be receiving damage at the explosion
        return fireCells;
    };

    /**
     * Handle the grid fire for special block like a bomb or a breakable block
     * @param gridCoords X and Y position of the bomb
     * @return {number} Type
     */
    this.handleGridFire = function(gridCoords) {
        var blockType = this.grid[gridCoords.y][gridCoords.x];
        if(typeof blockType !== 'undefined'){
            if(blockType !== 1){
                this.grid[gridCoords.y][gridCoords.x] = 25;
                if(blockType >= 21 && blockType <= 23){
                    // Explode bomb of other
                    this.otherBomb(gridCoords);
                }
                if(blockType === 2){
                    this.spawnRandomPowerup(gridCoords);
                    return 2;
                }
                return 1;
            }else{
                return 0;
            }
        }
    };

    /**
     * Let another bomb explode
     * @param gridCoords X and Y position of the Bomb
     */
    this.otherBomb = function(gridCoords){
        // Explode bomb of other
        var otherFireCells = this.spawnFire(gridCoords, this.bombs[gridCoords.y][gridCoords.x]);
        this.bombs[gridCoords.y][gridCoords.x] = false;
        var board = this;
        setTimeout(function(){
            for(var i = 0; i < otherFireCells.length; i++) {
                if( board.grid[otherFireCells[i].y][otherFireCells[i].x] !== 24 &&
                    board.grid[otherFireCells[i].y][otherFireCells[i].x] !== 25){
                    continue;
                }
                board.grid[otherFireCells[i].y][otherFireCells[i].x] = 0;
            }
        }, 1000);
    };

    /**
     * Spawn a random powerup
     * @param gridCoords X and Y position for the powerup
     */
    this.spawnRandomPowerup = function(gridCoords){
        // 10 - Extra bomb
        // 11 - Extra bomb power
        // 12 - Faster player movement
        var powerups = [10, 11, 12];

        // Lets first see if a powerup should spawn at all (50% chance)
        var spawnChance = Math.random();
        if(spawnChance <= 0.5){
            var randomPowerup = Math.floor(Math.random() * powerups.length);
            this.grid[gridCoords.y][gridCoords.x] = powerups[randomPowerup];
        }
    };

    /**
     * Gets the block collisions
     * @param x Position x
     * @param y Position y
     * @return {{topLeft: {x: number, y: number}, topRight: {x: *, y: number}, bottomLeft: {x: number, y: *}, bottomRight: {x: *, y: *}}}
     */
    this.blockCollisions = function(x, y){
        return {
            topLeft: {
                x: x*this.cellWidth,
                y: y*this.cellHeight,
            },
            topRight: {
                x: x*this.cellWidth + this.cellWidth,
                y: y*this.cellHeight,
            },
            bottomLeft: {
                x: x*this.cellWidth,
                y: y*this.cellHeight + this.cellHeight,
            },
            bottomRight: {
                x: x*this.cellWidth + this.cellWidth,
                y: y*this.cellHeight + this.cellHeight,
            },
        };
    };

}

/**
 * A player class/function which contains data and methods for a player.
 * @param id Unique identifier of the player
 * @param name Name of the player
 */
function Player(id, name){
    this.id = id;
    this.name = name;
    this.xPosition = null;
    this.yPosition = null;
    this.lives = 3; // Lives of the player
    this.bombs = [new Bomb()]; // The bombs the player have
    this.speed = 1; // Current speed
    this.dead = false;
    this.direction = 1; // Direction the player is pointing to
    this.number = null; // Number of the player
    this.bombs[0].updateTimestamp();
    this.score = 0;

    /**
     * Chech if a player can place a bomb
     * @return Bomb or null
     */
    this.placeBomb = function(){
        for(var i=0; i < this.bombs.length; i++){
            if(this.bombs[i].canPlace()){
                this.bombs[i].updateTimestamp();
                return this.bombs[i];
            }
        }
        return null;
    };

    /**
     * Get the player's collisions
     * @return {{topLeft: {x: null, y: *}, topRight: {x: *, y: *}, bottomLeft: {x: null, y: *}, bottomRight: {x: *, y: *}}}
     */
    this.getCollisionPoints = function(){
        return {
            topLeft: {
                x: this.xPosition,
                y: this.yPosition+40,
            },
            topRight: {
                x: this.xPosition+40,
                y: this.yPosition+40,
            },
            bottomLeft: {
                x: this.xPosition,
                y: this.yPosition+80,
            },
            bottomRight: {
                x: this.xPosition+40,
                y: this.yPosition+80,
            },
        };
    };

    /**
     * Get the bomb power of a player
     * (using first bomb because all bombs have the same power)
     */
    this.getBombPower = function(){
        return this.bombs[0].getPower();
    };

    /**
     * When a player is hit by a bomb
     */
    this.hit = function(){
        this.lives--;
        if(this.lives === 0){
            this.dead = true;
        }
    };

    /**
     * Handle powerups for the player
     * @param type Type of the powerup
     */
    this.powerUp = function(type) {
        switch(type){
            case 10:
                this.bombs.push(new Bomb());
                break;
            case 11:
                for(var i = 0; i < this.bombs.length; i++){
                    this.bombs[i].morePower();
                }
                break;
            case 12:
                this.speed += 0.1;
                break;
        }
    };

    /**
     * Get the position of the player
     * @return {{x: null, y: null}}
     */
    this.getPosition = function(){
        return {x: this.xPosition, y: this.yPosition};
    };

    /**
     * Set the player's position
     * @param x
     * @param y
     */
    this.setPosition = function(x, y){
        this.xPosition = x;
        this.yPosition = y;
    };

    /**
     * Get the player's direction where he/she is pointing to
     * @return {number}
     */
    this.getDirection = function(){
        return this.direction;
    };

    /**
     * Set the direction the player is poiting to
     * @param direction
     */
    this.setDirection = function(direction){
        this.direction = direction;
    };

    /**
     * Check if the player is dead or not
     * @return {boolean}
     */
    this.isDead = function(){
        return this.dead;
    };

    /**
     * Get the id of the player
     * @return Number
     */
    this.getId = function(){
        return this.id;
    };

    /**
     * Set the number of the player
     * @param number
     */
    this.setNumber = function(number){
        this.number = number;
    };

    /**
     * Get the number of the player
     * @return Number
     */
    this.getNumber = function(){
        return this.number;
    };

    /**
     * Add points to the player if he won a game
     */
    this.won = function(){
        this.score++;
    };

    /**
     * Get score of the player
     * @return Number
     */
    this.getScore = function(){
        return this.score;
    };
}

/**
 * A Bomb class/function which contains data and methods for the player's bomb(s)
 */
function Bomb(){
    this.timestamp = Date.now();
    this.bombPower = 1;
    this.firstTime = true; // First time placing a bomb so you don't need to wait 3 seconds


    /**
     * Check if the bomb can be placed
     * @return {boolean}
     */
    this.canPlace = function(){
        if(this.firstTime){
            this.firstTime = false;
            return true;
        }
        return Date.now() - this.timestamp > 3000;
    };

    /**
     * Update the timestamp
     */
    this.updateTimestamp = function() {
        this.timestamp = Date.now();
    };

    /**
     * Give more power to the bomb
     */
    this.morePower = function(){
        if(this.bombPower === 5) return;
        this.bombPower++;
    };

    /**
     * Give less power to the bomb
     */
    this.lessPower = function(){
        if(this.bombPower === 1) return;
        this.bombPower--;
    };

    /**
     * Get the current power of the bomb
     * @return {number}
     */
    this.getPower = function(){
        return this.bombPower;
    }


}

/**
 * Function to get the size of an object.
 */
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};