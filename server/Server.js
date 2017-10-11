exports.Main = function(){


    this.board = new Board();

    this.getBoard = function (){
        return this.board;
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
