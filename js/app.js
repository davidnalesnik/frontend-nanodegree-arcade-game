var dimensions = {
    boardWidth: 505,
    boardHeight: 606,
    tileWidth: 101,
    enemyWidth: 101,
    tileFullHeight: 101,
    tileOverlappedHeight: 83
};

var gameState = {
    gameOver: false,
    lives: 3,
    livesLeft: 3
};

// For general collision detection.  What bugs are in this lane?  Note: returned
// object will include our bug if function is passed this.row after creation.
// May need to check for this in caller.  As this function is used by both
// Enemy and Player, it is declared globally.
function laneContents(lane) {
    var contents = [];
    for (var idx = 0; idx < allEnemies.length; idx++) {
        if (allEnemies[idx].row == lane) {
            contents.push(allEnemies[idx]);
        }
    }
    return contents;
}

/** ENEMY **/

// Enemies our player must avoid
var Enemy = function(row) {

    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // Row may be specified.
    if (row) {
        this.row = row;
    } else { this.row = this.getEnemyRow(); }
    this.y = this.getEnemyYCoord();
    this.x = this.initialBugX();
    this.speed = this.getEnemyRate();

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.sprite = 'images/enemy-bug.png';
    allEnemies.push(this);
};

// How may times did player reach the water?  Used to set the level.
var winCount = 0;

// Return a random row for an enemy bug.  Possible rows are numbered 1, 2,
// or 3 (top row of game board is considered 0).
Enemy.prototype.getEnemyRow = function() {
    return Math.ceil(Math.random() * 3);
};

// Assign negative number no bigger than enemyWidth so bug emerges from off-screen.
// Since lanes are randomly assigned, there is a chance that bugs may overlap.
// To prevent this, we check our lane for an off-screen or partially off-screen
// enemy, and put our new bug behind it.  Collision detection will then handle any
// differences of speed.
Enemy.prototype.initialBugX = function() {
    var maybeColliding = laneContents(this.row);
    var finalX = -dimensions.enemyWidth;
    if (maybeColliding.length == 0) { return finalX; }
    var leftmostX = 0;
    for (var idx = 0; idx < maybeColliding.length; idx++) {
        if (maybeColliding[idx] != this && maybeColliding[idx].x < leftmostX) {
            leftmostX = maybeColliding[idx].x;
        }
    }
    return finalX + leftmostX - dimensions.enemyWidth;
};

// Convert enemy's row into a Y-coordinate on our canvas.
Enemy.prototype.getEnemyYCoord = function() {
    var tileOverlap = dimensions.tileFullHeight - dimensions.tileOverlappedHeight;
    var yPos = this.row * dimensions.tileOverlappedHeight;
    // correct for different alignment of bug relative to image height; 5
    // is eyeball factor.
    yPos -= tileOverlap + 5;
    return yPos;
};

// Get a random rate for a bug.
// TODO: introduce factor to speed up game.
Enemy.prototype.getEnemyRate = function() {
    var basePixelsPerSecond = 60;
    // speed up with every 5 wins
    var levelOffset = Math.floor(winCount / 5) * 20;
    // speeds range from 1x through 4x
    var multiplier = Math.ceil(Math.random() * 4);
    return basePixelsPerSecond * multiplier + levelOffset;
};

// Would moving a bug into this lane be bug-collision free?
Enemy.prototype.canMoveHere = function(lane) {
    var contents = laneContents(lane);
    for (var idx = 0; idx < contents.length; idx++) {
        if (contents[idx].x >= this.x &&
        contents[idx].x - this.x < dimensions.enemyWidth)
        return false;
    }
    return true;
}

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
// dt is number of elapsed _seconds_; animation frame 60/sec
Enemy.prototype.update = function(dt) {

    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x += this.speed * dt;

    // When a bug goes off screen, remove it and create a fresh bug.
    if (this.x > dimensions.boardWidth) {
        allEnemies.splice(allEnemies.indexOf(this), 1);
        new Enemy();
    }
    // Don't allow bugs in the same lane to overlap.  Move to a usable (adjacent)
    // lane.  If this isn't possible, stay in the current lane, exchanging speeds
    // with bug directly in the way.  (An exchange is made so there is no general
    // slowdown.  Also because it looks like a collision!)
    var inMyLane = laneContents(this.row);
    var dodge = false;
    var avoidMe;
    for (var idx = 0; idx < inMyLane.length; idx++) {
        if (inMyLane[idx] != this &&
        inMyLane[idx].x >= this.x &&
        inMyLane[idx].x - this.x <= dimensions.enemyWidth) {
            dodge = true;
            avoidMe = idx;
            break;
        }
    }
    if (dodge) {
        if ((this.row == 3 || this.row == 2) &&
        this.canMoveHere(this.row - 1)) {
            this.row -= 1;
            this.y = this.getEnemyYCoord();
        } else if ((this.row == 1 || this.row == 2) &&
        this.canMoveHere(this.row + 1)) {
            this.row += 1;
            this.y = this.getEnemyYCoord();
            } else {
            var temp = this.speed;
            this.speed = inMyLane[avoidMe].speed;
            inMyLane[avoidMe].speed = temp;
        }
    }
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

/** PLAYER **/

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.

// Since there is only one player, no need for messing with prototype?

var Player = function() {
    this.col = 2;
    this.row = 5;
    // flag for successful arrival at water
    this.madeIt = false;
    this.player = 'images/char-boy.png';
};

Player.prototype.setPlayerX = function() {
    return this.col * dimensions.tileWidth;
};

Player.prototype.setPlayerY = function() {
    // 30 is eyeball factor
    return this.row * dimensions.tileOverlappedHeight - 30;
};

// If player and bug collide, return true, otherwise false.
Player.prototype.detectCollision = function() {
    // bugs in our row
    var potentials = laneContents(this.row);
    for (var idx = 0; idx < potentials.length; idx++) {
        // Distance between left edge of enemy and player is less than
        // enemy's width ==> collision
        if ((Math.max(this.x, potentials[idx].x) - Math.min(this.x, potentials[idx].x)) <= dimensions.enemyWidth) {
            return true;
        }
    }
    return false;
};

Player.prototype.update = function() {
    if (this.madeIt) {
        this.col = 2;
        this.row = 5;
        winCount += 1;
        console.log('you made it');
        score.update(10);
        // set flag to reset
        this.madeIt = false;
    }
    // We're hit
    if (this.detectCollision()) {
        if (score > 0) { score.update(-10); }
        gameState.livesLeft -= 1;
        if (gameState.livesLeft == 0) { gameState.gameOver = true; }
        this.col = 2;
        this.row = 5;
    }
    this.x = this.setPlayerX();
    this.y = this.setPlayerY();
};

Player.prototype.render = function() {
    ctx.drawImage(Resources.get(this.player), this.x, this.y);
};

Player.prototype.handleInput = function(request) {
    // Honor requests but do not allow player to move off board.
    if (request === 'left' && this.col > 0) this.col -= 1;
    if (request === 'right' && this.col < 4) this.col += 1;
    if (request === 'down' && this.row < 5) this.row += 1;
    // Signal a success if we get to top, but don't draw player over the water.
    if (request === 'up') {
        if (this.row == 1) {
            this.madeIt = true;
        } else { this.row -= 1; }
    }
};

/** SCORE **/

var Score = function() {
    this.score = 0;
    this.update = function(offset) {
        this.score += offset;
        //if (this.score < 0) { gameState.gameOver = true; }
    };
    this.render = function() {
        ctx.font = '30px Verdana';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(this.score, dimensions.boardWidth - 15, 55);
    };
};

/** INSTANTIATE OBJECTS **/

// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player

var allEnemies = [];
// NOTE: We don't assign Enemy instances to global variables.  We don't need
// them once they're off-screen, yet they won't be garbage collected.
new Enemy();
new Enemy();
new Enemy();

var player = new Player();

var score = new Score();

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
    };

    player.handleInput(allowedKeys[e.keyCode]);
});
