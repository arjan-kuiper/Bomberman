exports.Main = function(roomId, io, roomMaster){
    this.board = new Board();
    this.io = io;
    this.roomId = roomId;
    this.roomMaster = roomMaster;
    this.started = false;
    this.removedPlayers = [];

    this.getBoard = function (){
        return this.board;
    };

    this.createGame = function () {
        this.board.createBoard();
        this.board.addPlayer(roomMaster, 'Player 1');
    };
    this.addPlayer = function(id, name) {
            this.board.addPlayer(id, name);
    };

    this.removePlayer = function(id){
        this.board.removePlayer(id);
        this.removedPlayers[this.removedPlayers.length] = id;
        this.updateGame();
    };

    this.updateGame = function(){

        this.io.sockets.in(this.roomId).emit("updateGame", {
            board: this.board.getGridData(),
            roomPlayers: this.board.getPlayers(),
            playerView: this.board.getPlayerView(),
            size: this.board.getSize(),
            started: this.started,
            removedPlayers: this.removedPlayers
        });
    };
    var t = this;
    setInterval(function(){
        t.updateGame();
    },50/3);

    this.startGame = function(playerId){
        if(playerId !== this.roomMaster) return;
        this.started = true;
        this.updateGame();
    };

    this.keyHandle = function(keyId, playerId){
        // WASD: 87, 65, 83, 68
        // Pijltjes zelfde volgorde: 38, 37, 40, 39
        // Spatie: 32
        this.started = true;
        if(!this.started) return;

        var player = this.board.getPlayerById(playerId);
        var playerPos = player.getOldPosition();
        var movementBlocked = [-1, 1, 2, 25];
        switch (keyId){
            case 87:
            case 38:
                // Up
                //console.log(this.board.getRelativeBlock(player.xPosition, player.yPosition, 'up'));
                var moveToBlock = this.board.getBlockByCoords(playerPos.x, playerPos.y - this.board.cellHeight);
                if(movementBlocked.indexOf(moveToBlock) <= 0){
                    player.goToPos(playerPos.x, playerPos.y -= player.step);
                }
                break;
            case 65:
            case 37:
                // Left
                var moveToBlock = this.board.getBlockByCoords(playerPos.x - this.board.cellWidth, playerPos.y);
                if(movementBlocked.indexOf(moveToBlock) <= 0){
                    player.goToPos(playerPos.x -= player.step, playerPos.y);
                }
                break;
            case 83:
            case 40:
                // Down
                var moveToBlock = this.board.getBlockByCoords(playerPos.x, playerPos.y + this.board.cellHeight);
                if(movementBlocked.indexOf(moveToBlock) <= 0){
                    player.goToPos(playerPos.x, playerPos.y += player.step);
                }
                break;
            case 68:    
            case 39:
                // Right
                var moveToBlock = this.board.getBlockByCoords(playerPos.x + this.board.cellWidth, playerPos.y);
                if(movementBlocked.indexOf(moveToBlock) <= 0){
                    player.goToPos(playerPos.x += player.step, playerPos.y);
                }
                break;
            case 32:
                // Spacebar - Place bomb and remove after 3 seconds.
                if(player.placeBomb() != null){
                    var gridCoords = this.board.getGridFromCoords(playerPos.x, playerPos.y);
                    var currentCell = this.board.grid[gridCoords.y][gridCoords.x];

                    this.board.grid[gridCoords.y][gridCoords.x] = 25;

                    var board = this.board;
                    var tempGame = this;
                    var fireCells;

                    setTimeout(function(){
                        fireCells = board.spawnFire(gridCoords, playerId);
                        tempGame.updateGame();
                        console.log(fireCells);

                        setTimeout(function(){
                            for(var i = 0; i < fireCells.length; i++){
                                board.grid[fireCells[i].y][fireCells[i].x] = 0;
                            }
                            tempGame.updateGame();
                        }, 1000);
                    }, 3000);
                }
                break;
        }

        this.updateGame();
    };

    return this;
};

function Board(){
    this.grid = [];
    this.players = {};
    this.width = 19;
    this.height = 19;
    this.cellWidth = 50;
    this.cellHeight = 50;
    this.playerNumbers = [4,3,2,1];

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

    this.removePlayer = function(id){
        if(typeof this.players[id] !== 'undefined'){
            this.playerNumbers[this.playerNumbers.length] = this.players[id].getNumber();
            delete this.players[id];
        }
    };

    this.getPlayerById = function(id){
        for(var p in this.players){
            if(p === id){
                return this.players[id];
            }
        }
    }

    this.getPlayers = function(){
        return this.players;
    };

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

                    // Breakable blocks as an X
                    // if( ( (x+y === this.width-1 || x+y === this.height-1) && x > 1  && y > 1 ) || (x === y && x !== 1 && x !== this.width-2) ){
                    //     this.grid[y][x] = 2;
                    // }

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

    this.getGridData = function(){
        return this.grid;
    };
    this.getSize = function(){
        return {width: this.width, height: this.height, cellWidth: this.cellWidth, cellHeight: this.cellHeight};
    };

    this.getGridFromCoords = function(x, y){
        realX = x + 20;
        realY = y + 45;
        
        for(var j = 0; j < this.grid.length; j++){
            for(var i = 0; i < this.grid[j].length; i++){
                cellX = j*this.cellWidth;
                cellY = i*this.cellHeight;

                if(realX > cellX && realX < cellX + this.cellWidth){
                    if(realY > cellY && realY < cellY + this.cellHeight){
                        return {
                            x: j,
                            y: i
                        }
                    }
                }
            }
        }
    }

    this.getBlockByCoords = function(x, y){
        realX = x + 20;
        realY = y + 45;
        
        for(var j = 0; j < this.grid.length; j++){
            for(var i = 0; i < this.grid[j].length; i++){
                cellX = j*this.cellWidth;
                cellY = i*this.cellHeight;

                if(realX > cellX && realX < cellX + this.cellWidth){
                    if(realY > cellY && realY < cellY + this.cellHeight){
                        return this.grid[i][j];
                    }
                }
            }
        }

        return -1;
    }


    this.getPlayerView = function(){
        // this.players
        var playerView = {};
        for(var playerId in this.players){

            if(!this.players.hasOwnProperty(playerId)) continue;
            var player = this.players[playerId];
            var pos = player.getPosition();


            playerView[playerId] = {
                direction: player.getDirection(),
                x: pos.x,
                y: pos.y,
                playerNumber: player.getNumber()
            };

        }
        return playerView;
    };

    this.spawnFire = function(gridCoords, id){
        var bombPower = this.getPlayerById(id).getBombPower();
        var fireCells = [{x: gridCoords.x, y: gridCoords.y}];
        this.grid[gridCoords.y][gridCoords.x] = 26;

        // Needs rework to EXclude diagonal bombing LOL.
        for(var i = -bombPower; i <= bombPower; i++){
            if(this.grid[gridCoords.y][gridCoords.x+i] == 0 || this.grid[gridCoords.y][gridCoords.x+i] == 2){
                fireCells.push({x: gridCoords.x+i, y: gridCoords.y});
                this.grid[gridCoords.y][gridCoords.x+i] = 26;
            }
            if(this.grid[gridCoords.y+i][gridCoords.x] == 0 || this.grid[gridCoords.y+i][gridCoords.x] == 2){
                fireCells.push({x: gridCoords.x, y: gridCoords.y+i});
                this.grid[gridCoords.y+i][gridCoords.x] = 26;
            }
        }

        return fireCells;
    }
}

function Player(id, name){
    this.id = id;
    this.name = name;
    this.xPosition = null;
    this.yPosition = null;
    this.lives = 3;
    this.bombs = [new Bomb()];
    this.step = 50;
    this.speed = 1;
    this.dead = false;
    this.direction = 1;
    this.number = null;
    this.bombs[0].updateTimestamp();
    this.positionToGoTo = {x: null, y: null, time: null};
    this.oldPosition = {x: null, y: null};
    /**
     * @return Bomb
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

    this.getBombPower = function(){
        return this.bombs[0].getPower();
    };

    this.hit = function(){

    };

    this.powerUp = function(type) {

    };

    this.getPosition = function(){
        if(this.positionToGoTo.time !== null){
            if(Date.now() - this.positionToGoTo.time < (2 - this.speed)*1000){
                // if(Date.now() - this.positionToGoTo.time > 100){
                //     this.positionToGoTo.time = null;
                // }
                var stepSizeX = (this.positionToGoTo.x - this.oldPosition.x) / ( (2 - this.speed) * 1000 );
                //
                console.log( "-----");
                // console.log( this.positionToGoTo.x);
                // console.log(  this.oldPosition.x );
                // console.log( stepSizeX );
                // console.log( (Date.now() - this.positionToGoTo.time) );
                // console.log( stepSizeX / (Date.now() - this.positionToGoTo.time) );
                console.log( ( (this.positionToGoTo.x - this.oldPosition.x) / ( (2 - this.speed) * 1000 ) ) * (Date.now() - this.positionToGoTo.time) );
                // console.log( (Date.now() - this.positionToGoTo.time) );
                // console.log( ( (this.positionToGoTo.x - this.oldPosition.x) / ( (2 - this.speed) * 1000 ) ) * (Date.now() - this.positionToGoTo.time) );
                this.xPosition = this.oldPosition.x + ( ( (this.positionToGoTo.x - this.oldPosition.x) / ( (2 - this.speed) * 1000 ) ) * (Date.now() - this.positionToGoTo.time) );
                this.yPosition = this.oldPosition.y + ( ( (this.positionToGoTo.y - this.oldPosition.y) / ( (2 - this.speed) * 1000 ) ) * (Date.now() - this.positionToGoTo.time) );
            }else{
                this.positionToGoTo.time = null;
            }
        }
        return {x: this.xPosition, y: this.yPosition};
    };
    this.goToPos = function(x, y){
        this.setPosition(x, y);
        // this.positionToGoTo = {x: x, y: y, time: Date.now()};
        // this.oldPosition = {x: this.xPosition, y: this.yPosition};
    };

    this.setPosition = function(x, y){
        this.xPosition = x;
        this.yPosition = y;
        this.oldPosition = { x: x, y: y };
    };
    this.getOldPosition = function(){
        return this.oldPosition;
    };

    this.getDirection = function(){
        return [null,'front', 'left','back','right'][this.direction];
    };

    this.getId = function(){
        return this.id;
    };

    this.setNumber = function(number){
        this.number = number;
    };
    this.getNumber = function(){
        return this.number;
    };

}

function Bomb(){
    this.timestamp = Date.now();
    this.bombPower = 1;

    this.canPlace = function(){
        return Date.now() - this.timestamp > 3000;
    };

    this.updateTimestamp = function() {
        this.timestamp = Date.now();
    };

    this.morePower = function(){
        if(this.bombPower === 5) return;
        this.bombPower++;
    };

    this.lessPower = function(){
        if(this.bombPower === 1) return;
        this.bombPower--;
    };

    this.getPower = function(){
        return this.bombPower;
    }
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};