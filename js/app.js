// cache of various measurements frequently used in calculations
var dimensions = {
    boardWidth : 505,
    boardHeight : 606,
    tileWidth : 101,
    // adjust for precision of collision detection
    playerWidth : 60,
    enemyWidth : 101,
    tileFullHeight : 101,
    tileOverlappedHeight : 83
};

// cache of information describing the game in progress
var gameState = {
    gameOver : false,
    lives : 3,
    livesLeft : 3,
    // how many times player has reached the water
    winCount : 0,
    // When array contains row and column numbers, an image change for a water
    // tile is signalled.
    markTile : [-1, -1],
    // When water tile has been changed, this holds a Timer object.
    tileTimer : false,
    enemyCount : 3,
    // initial enenmy speed in px/sec; return to this when enemy added
    baseSpeed : 30,
    // how much enemy speed will be boosted with each arrival at water
    speedIncrement : 10,
    // slowest enemy speed at the moment
    currentBaseSpeed : 30
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

/**************************************************************
 **************************** ENEMY ***************************
 **************************************************************/

// Enemies our player must avoid
var Enemy = function (row) {

    // Variables applied to each of our instances go here,
    // we've provided one for you to get started (this.sprite)

    if (row) {
        this.row = row;
    } else {
        this.row = this.getEnemyRow();
    }
    this.y = this.getEnemyYCoord();
    this.x = this.initialBugX();
    this.speed = this.getEnemyRate();

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.sprite = 'images/enemy-bug.png';

    allEnemies.push(this);
};

// Return a random row for an enemy bug.  Possible rows are numbered 1, 2,
// or 3 (top row of game board is considered 0).
Enemy.prototype.getEnemyRow = function () {
    return Math.ceil(Math.random() * 3);
};

// Assign negative number no bigger than enemyWidth so bug emerges from off-screen.
// Since lanes are randomly assigned, there is a chance that bugs may overlap.
// To prevent this, we check our lane for an off-screen or partially off-screen
// enemy, and put our new bug behind it.  Collision detection will then handle any
// differences of speed.
Enemy.prototype.initialBugX = function () {
    var maybeColliding = laneContents(this.row);
    var finalX = -dimensions.enemyWidth;
    if (maybeColliding.length == 0) {
        return finalX;
    }
    // If there are other bugs in our row, set our bug's position relative
    // to the leftmost bug.
    var leftmostX = 0;
    for (var idx = 0; idx < maybeColliding.length; idx++) {
        if (maybeColliding[idx] != this && maybeColliding[idx].x < leftmostX) {
            leftmostX = maybeColliding[idx].x;
        }
    }
    // Ensure at least one bug-width clearance for our bug.
    return finalX + leftmostX - dimensions.enemyWidth;
};

// Convert enemy's row into a Y-coordinate on our canvas.
Enemy.prototype.getEnemyYCoord = function () {
    var tileOverlap = dimensions.tileFullHeight - dimensions.tileOverlappedHeight;
    var yPos = this.row * dimensions.tileOverlappedHeight;
    // Correct for different alignment of bug relative to image height.
    yPos -= tileOverlap + 5;
    return yPos;
};

// Get a random rate for a bug.
Enemy.prototype.getEnemyRate = function () {
    // speeds range from 1x through 4x
    var multiplier = Math.ceil(Math.random() * 4);
    return gameState.currentBaseSpeed * multiplier;
};

// Would moving a bug into this lane be bug-collision free?
Enemy.prototype.canMoveHere = function (lane) {
    var contents = laneContents(lane);
    for (var idx = 0; idx < contents.length; idx++) {
        if (contents[idx].x >= this.x &&
            contents[idx].x - this.x < dimensions.enemyWidth)
            return false;
    }
    return true;
}

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks (elapsed seconds)
Enemy.prototype.update = function (dt) {

    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x += this.speed * dt;

    // When a bug goes off screen, remove it and create a fresh bug.
    if (this.x > dimensions.boardWidth) {
        allEnemies.splice(allEnemies.indexOf(this), 1);
        new Enemy();
    }
    // When level gets high enough, increase the number of bugs.
    // Decrease speed to initial level when this happens.
    if ((gameState.winCount == 10 && gameState.enemyCount == 3) ||
        (gameState.winCount == 20 && gameState.enemyCount == 4) ||
        (gameState.winCount == 30 && gameState.enemyCount == 5)) {
        new Enemy();
        gameState.enemyCount += 1;
        gameState.currentBaseSpeed = gameState.baseSpeed;
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
Enemy.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

/**************************************************************
 **************************** PLAYER **************************
 **************************************************************/

var Player = function () {
    this.col = 2;
    this.row = 5;
    // flag for successful arrival at water
    this.madeIt = false;
    this.player = 'images/char-boy.png';
};

Player.prototype.getPlayerX = function () {
    return this.col * dimensions.tileWidth;
};

Player.prototype.getPlayerY = function () {
    return this.row * dimensions.tileOverlappedHeight - 30;
};

// If player and bug collide, return true, otherwise false.
Player.prototype.detectCollision = function () {
    // bugs in our row
    var potentials = laneContents(this.row);
    for (var idx = 0; idx < potentials.length; idx++) {
        // Distance between left edge of enemy and player is less than
        // player's width ==> collision
        if ((Math.max(this.x, potentials[idx].x) - Math.min(this.x, potentials[idx].x)) <= dimensions.playerWidth) {
            return true;
        }
    }
    return false;
};

// Change player's position and handle consequences of position change.
Player.prototype.update = function () {
    // When the street is successfully crossed...
    if (this.madeIt) {
        gameState.winCount += 1;
        score.update(10);
        // Set array to real values to signal image change.
        gameState.markTile[0] = this.col;
        gameState.markTile[1] = 0;
        // Reset player's position.
        this.col = 2;
        this.row = 5;
        // speed up after five wins
        if (gameState.winCount % 5 == 0) {
            gameState.currentBaseSpeed += gameState.speedIncrement;
        }
        // Initiate timed change of water tile.
        gameState.tileTimer = new Timer(30, function () {
                gameState.markTile[0] = -1;
                gameState.markTile[1] = -1;
            });
        // Do the above only once per win!
        this.madeIt = false;
    } else if (this.row < 4 && this.detectCollision()) { // We're hit!
        gameState.livesLeft -= 1;
        if (gameState.livesLeft == 0) {
            gameState.gameOver = true;
        } else {
            this.col = 2;
            this.row = 5;
        }
    }
    // Update player position for redraw.
    this.x = this.getPlayerX();
    this.y = this.getPlayerY();
};

// Draw the player.
Player.prototype.render = function () {
    ctx.drawImage(Resources.get(this.player), this.x, this.y);
};

// Handler for arrow-key input.
Player.prototype.handleInput = function (request) {
    // Honor requests but do not allow player to move off-board.
    switch (request) {
    case 'left':
        if (this.col > 0) {
            this.col -= 1;
        }
        break;
    case 'right':
        if (this.col < 4) {
            this.col += 1;
        }
        break;
    case 'down':
        if (this.row < 5) {
            this.row += 1;
        }
        break;
    case 'up':
        // Signal a success if we get to top, but don't draw player over the water.
        // One reason for this is that player's head emerges above the canvas, so
        // it will not be erased when canvas is redrawn.
        if (this.row == 1) {
            this.madeIt = true;
        } else {
            this.row -= 1;
        }
        break;
    }
};

/**************************************************************
 **************************** SCORE ***************************
 **************************************************************/

var Score = function () {
    this.score = 0;
    this.update = function (offset) {
        this.score += offset;
    };
    this.render = function () {
        ctx.font = '400 30px Roboto';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'white';
        ctx.fillText(this.score, dimensions.boardWidth - 15, 55);
    };
};

/**************************************************************
 **************************** TIMER ***************************
 **************************************************************/

// Create objects which time a function call with the number of frames
// elapsed.  After a specified number of frames, a function is called.
// This takes advantage of the requestAnimationFrame loop in progress,
// avoiding usage of setTimeout, which is not synchronized with screen
// redraw.

var Timer = function (frameCount, exitFunction) {
    this.frameCount = frameCount;
    this.exitFunction = exitFunction || function () {};
};

// Call this method once per frame to count timer down and eventually call
// delayed function.
Timer.prototype.decrementer = function () {
    if (this.frameCount > 0) {
        this.frameCount -= 1;
    } else {
        this.exitFunction();
    }
};

// Now instantiate your objects.

/**************************************************************
 ******************** INSTANTIATE OBJECTS *********************
 **************************************************************/

// Place all enemy objects in an array called allEnemies
var allEnemies = [];

// NOTE: We don't assign Enemy instances to global variables.  We don't need
// them once they're off-screen, yet they won't be garbage collected.
new Enemy();
new Enemy();
new Enemy();

// Place the player object in a variable called player
var player = new Player();

var score = new Score();

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function (e) {
    var allowedKeys = {
        37 : 'left',
        38 : 'up',
        39 : 'right',
        40 : 'down',
    };

    player.handleInput(allowedKeys[e.keyCode]);
});
