exports.Main = function(roomId, socket){


    this.board = new Board();
    this.socket = socket;
    this.roomId = roomId;

    this.getBoard = function (){
        return this.board;
    };
    this.createGame = function () {
        this.board.createBoard();
        socket.broadcast.to(roomId).emit("updateGame", {board: this.board.getGridData()});
    };

    return this;
};

function Board(){
    this.grid = [];
    this.players = {};
    this.width = 20;
    this.height = 20;
    this.cellWidth = 50;
    this.cellHeight = 50;

    this.addPlayer = function(id, name){
        this.players[id] = new Player(id, name);
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

                    // For an X
                    //   ( (x+y === this.width-1 || x+y === this.height-1) && x > 1  && y > 1 ) || (x === y && x !== 1 && x !== this.width-2)
                    //

                    this.grid[y][x] = 0;

                    // Breakable blocks as an X
                    if( ( (x+y === this.width-1 || x+y === this.height-1) && x > 1  && y > 1 ) || (x === y && x !== 1 && x !== this.width-2) ){
                        // this.grid[y][x] = 2;
                    }

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
    }

}

function Player(id, name){
    this.id = id;
    this.name = name;
    this.xPosition = null;
    this.yPosition = null;
    this.lives = 3;
    this.bombs = [new Bomb()];
    this.speed = 10;
    this.dead = false;
    this.direction = 1;

    this.bombs[0].updateTimestamp();
    /**
     *
     * @return Bomb
     *
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

    this.hit = function(){

    };

    this.powerUp = function(type) {

    }

}

function Bomb(){
    this.timestamp = 0;
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
}
