/** ENEMY **/

// TODO: put some of these functions within class or prototype!!!!

// TODO: make variables for some magic numbers?

// TODO: make Enemy.y create itself automatically from Enemy.row


// Return a random row for an enemy bug.  Possible rows are numbered 1, 2,
// or 3 (top row of game board is considered 0).
function getEnemyRow() {
    return Math.ceil(Math.random() * 3);
}

// Given a row number, calculate a Y coordinate.
function getEnemyYCoord(row) {
    var rowTotalHeight = 101;
    var rowOverlappedHeight = 83;
    var offset = 5;
    var tileOverlap = rowTotalHeight - rowOverlappedHeight;
    // Bug may occupy rows 1-3 (counting from top = 0)
    // row 0 drawn at y = 0, row 1 at y = 1 * 83, etc.
    var yPos = row * rowOverlappedHeight;
    // correct for different alignment of bug relative to image height
    yPos -= tileOverlap + offset;
    return yPos;
}

// Get a random rate for a bug.
function getEnemyRate() {
    var basePixelsPerSecond = 60;
    var multiplier = Math.ceil(Math.random() * 4);
    return basePixelsPerSecond * multiplier;
}

// For bug-bug collision detection.  What bugs are in this lane?  Note: this will
// include our bug if lane is passed this.row.  May need to check for this
// in caller.
function laneContents(lane) {
    var contents = [];
    for (var idx = 0; idx < allEnemies.length; idx++) {
        if (allEnemies[idx].row == lane) {
            contents.push(allEnemies[idx]);
        }
    }
    return contents;
}

// Would moving a bug into this lane be bug-collision free?
function canMoveHere(enemy, lane) {
    var contents = laneContents(lane);
    for (var idx = 0; idx < contents.length; idx++) {
        if (contents[idx].x >= enemy.x && contents[idx].x - enemy.x < 101)
        return false;
    }
    return true;
}

// Off-screen collisions.  We randomly assign a lane for bug introduction, so
// overlaps can occur.  There is more than one way to solve this.  Here, we check
// our lane for an off-screen or partially off-screen enemy, and set 'x' of our
// new bug to be behind it.  Collision detection will then handle any
// differences of speed.
function initialBugX() {
    if (allEnemies.length == 0) { return -101; }
    for (var idx = 0; idx < allEnemies.length; idx++) {
        if (allEnemies[idx].row == this.row && allEnemies[idx].x < 0) {
            // at least 2 bug-lengths separation
            return allEnemies[idx].x - 202;
        } else { return -101; }
    }
}

// Enemies our player must avoid
var Enemy = function(row) {

    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // Row may be specified.  This is used so that when game begins, bugs aren't
    // accidentally stacked in the same row.  Not necessary now.
    if (row) {
        this.row = row;
    } else { this.row = getEnemyRow(); }
    this.y = getEnemyYCoord(this.row);
    // negative number no bigger than -101 so bug emerges from left
    this.x = initialBugX();
    this.speed = getEnemyRate();

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.sprite = 'images/enemy-bug.png';

    allEnemies.push(this);
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
// dt is number of elapsed _seconds_; animation frame 60/sec
Enemy.prototype.update = function(dt) {

    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x += this.speed * dt;

    // When a bug goes off screen, remove it and create a fresh bug.
    if (this.x > 505) {
        allEnemies.splice(allEnemies.indexOf(this), 1);
        new Enemy();
    }
    // Don't allow bugs in the same lane to overlap.  Move to a usable (adjacent)
    // lane.  If this isn't possible, stay in the current lane, exchanging speeds
    // with bug directly in the way.
    var inMyLane = laneContents(this.row);
    var dodge = false;
    var avoidMe;
    for (var idx = 0; idx < inMyLane.length; idx++) {
        if (inMyLane[idx] != this &&
        inMyLane[idx].x >= this.x &&
        inMyLane[idx].x - this.x <= 101) {
            dodge = true;
            avoidMe = idx;
            break;
        }
    }
    if (dodge) {
        if ((this.row == 3 || this.row == 2) &&
        canMoveHere(this, this.row - 1)) {
            this.row -= 1;
            this.y = getEnemyYCoord(this.row);
        } else if ((this.row == 1 || this.row == 2) &&
        canMoveHere(this, this.row + 1)) {
            this.row += 1;
            this.y = getEnemyYCoord(this.row);
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
function setPlayerX(col) {
    return col * 101;
}

function setPlayerY(row) {
    var alignedWithTile = 83;
    var offset = 30;
    return row * alignedWithTile - offset;
}

var Player = function() {
    this.col = 2;
    this.row = 5;
    // Note: this.x and this.y are set by Player.prototype.update()
    // this.x = 202;
    // this.y = 415;
    this.madeIt = false;
    this.player = 'images/char-boy.png';
};

// If player and bug collide, return true, otherwise false.
Player.prototype.detectCollision = function() {
    // bugs in our row
    var potentials = laneContents(this.row);
    for (var idx = 0; idx < potentials.length; idx++) {
        if ((Math.max(this.x, potentials[idx].x) - Math.min(this.x, potentials[idx].x)) <= 101) {
            return true;
        }
    }
    return false;
};

Player.prototype.update = function() {
    if (this.row == 1 && this.madeIt) {
        this.col = 2;
        this.row = 5;
        console.log('you made it');
        score.inc(); // NB
        // TODO: update score; delay? ; update speed variable based on number of successes
        // reset
        this.madeIt = false;
    }
    if (this.detectCollision()) {
        score.dec();
        this.col = 2;
        this.row = 5;
    }
    this.x = setPlayerX(this.col);
    this.y = setPlayerY(this.row);
};

Player.prototype.render = function() {
    ctx.drawImage(Resources.get(this.player), this.x, this.y);
};

Player.prototype.handleInput = function(request) {
    if (request === 'left' && this.col > 0) this.col -= 1;
    if (request === 'right' && this.col < 4) this.col += 1;
    if (request === 'down' && this.row < 5) this.row += 1;
    // Signal a success if we get to top, but don't draw hero over the water!
    // TODO: pause hero over water before resetting position
    if (request === 'up' && this.row >= 1) {
        if (this.row == 1) {
            this.madeIt = true;
        } else { this.row -= 1; }
    }
};

/** SCORE **/

var Score = function() {
    this.score = 0;
    this.inc = function() {
        this.score += 10;
    };
    this.dec = function() {
        this.score -= 10;
    }
    this.render = function() {
        // set these variables in engine?
        ctx.font = '30px Verdana';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(this.score, 490, 55);
    };
};

/** INSTANTIATE OBJECTS **/

// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player

var allEnemies = [];
var enemyFirst = new Enemy(1);
var enemySecond = new Enemy(2);
var enemyThird = new Enemy(3);

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
        80: 'pause' // how to make this work?
    };

    player.handleInput(allowedKeys[e.keyCode]);
});
