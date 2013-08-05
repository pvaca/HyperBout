/**************************************************
** GAME VARIABLES
**************************************************/
var localPlayer;
var remotePlayers;
var socket;

//Box2d measures things in meters, to compensate we are going to be converting it to pixels. 
//Scale to convert is 30. 
var SCALE = 30;
var world;

/**************************************************
** BOX2D NAMESPACE CREATION
**************************************************/
//Creating a box2d namespace, so we can call the instances
//by just doing box2d.b2Vec2 etc.
var box2d = {
   b2Vec2 : Box2D.Common.Math.b2Vec2,
   b2BodyDef : Box2D.Dynamics.b2BodyDef,
   b2Body : Box2D.Dynamics.b2Body,
   b2FixtureDef : Box2D.Dynamics.b2FixtureDef,
   b2Fixture : Box2D.Dynamics.b2Fixture,
   b2World : Box2D.Dynamics.b2World,
   b2MassData : Box2D.Collision.Shapes.b2MassData,
   b2PolygonShape : Box2D.Collision.Shapes.b2PolygonShape,
   b2CircleShape : Box2D.Collision.Shapes.b2CircleShape,
   b2DebugDraw : Box2D.Dynamics.b2DebugDraw
};

/**************************************************
** SOCKET ENABLE
**************************************************/
var setupSockets = function()
{
    // Initialise socket connection
    socket = io.connect("http://localhost", {port: 8000, transports: ["websocket"]});

    // Socket connection successful
    socket.on("connect", onSocketConnected);

    // Socket disconnection
    socket.on("disconnect", onSocketDisconnect);

    // New player message received
    socket.on("new player", onNewPlayer);

    // Player move message received
    socket.on("move player", onMovePlayer);

    // Player removed message received
    socket.on("remove player", onRemovePlayer);

    socket.on("update id", updateID);
};

/**************************************************
** SOCKET FUNCTIONS
**************************************************/
// Socket connected

function updateID(data){
    localPlayer.id = data.id;
    localPlayer.playerNumber = data.playerNumber;
}

function onSocketConnected() {
    console.log("Connected to socket server");

    // Send local player data to the game server
    socket.emit("new player", {x: localPlayer.getX(), y: localPlayer.getY()});
};

// Socket disconnected
function onSocketDisconnect() {
    console.log("Disconnected from socket server");
};

// New player
function onNewPlayer(data) {
    console.log("New player connected: "+data.id);
    
    // Initialise the new player
    var newPlayer = new HyperPlayer();
    newPlayer.id = data.id;
    newPlayer.playerNumber = data.playerNumber;
    
    // Add new player to the remote players array
    remotePlayers.push(newPlayer);

    //Refresh the game so everyone starts back at their spawn points
    setTimeout(function()
    {
        localPlayer.moveToSpawn();
        for(i = 0; i < remotePlayers.length; i++) 
        {        
            console.log("HIT");
            console.log(remotePlayers[i].id);
            console.log(remotePlayers[i].playerNumber);
            remotePlayers[i].moveToSpawn();
        }
    }, 1000)

};

// Move player
function onMovePlayer(data) {
    //Get the player that moved
    var movePlayer = playerById(data.id);
    
    // Player not found
    if (!movePlayer) {
        console.log("Player not found: "+data.id);
        return;
    };

    // Update player position
    //movePlayer.setX(data.x);
    //movePlayer.setY(data.y);
    console.log(data);
    movePlayer.remotePlayerMove(data);
    
    //console.log(movePlayer.id + " moved to x position " + movePlayer.getX() + "and y position "+ movePlayer.getY());

};

// Remove player
function onRemovePlayer(data) {
    //Get player that disconnected
    var removePlayer = playerById(data.id);

    // Player not found
    if (!removePlayer) {
        console.log("Player not found: "+data.id);
        return;
    };

    // Remove player from array
    remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);
};


/**************************************************
** ENGINE
**************************************************/
var hyperBout = function()
{
    this.width = 1122;
    this.height = 548;
    return new CanvasWrapper('backgroundCanvas', 'entityCanvas', 'animationCanvas', width, height);
};

var Engine = function()
{   
    //Create a new hyperBout object.
    this.hyperBout = hyperBout();

    //Create an image and set the source to the background, add it to HyperBout canvas context
    var backgroundImg = new Image();
    backgroundImg.src = 'images/Background.png';
    this.hyperBout.ctx.drawImage(backgroundImg, 0, 0);


    //Variable reference to this eventngine
    var self = this;
    
    //Set dem physics
    self.setupPhysics();
   
    //Create the player
    localPlayer = new HyperPlayer();
    this.hyperBout.entityCanvas.addEventListener('click', function(event) {localPlayer.bombThrow(event);}, false);
    // Initialise remote players array
    remotePlayers = [];

    //Enable Sockets
    setupSockets();
    
    /*
    entityCanvas.onclick = function()
    {
        var slash = Engine.prototype.MuteUnmuteAudio('audiofiles/stab.wav', false);

        var fixDef = new box2d.b2FixtureDef();
        fixDef.density = 1;
        fixDef.friction = 0.5;
        fixDef.restiution = 0.5;

        var bodyDef = new box2d.b2BodyDef();
        bodyDef.type = box2d.b2Body.b2_dynamicBody; //We're setting the ground to static.
        bodyDef.position.x =Math.random()*1122 / SCALE; //Registration point is in the center for box2d entities.
        bodyDef.position.y = 0;
        fixDef.shape = new box2d.b2CircleShape(Math.random()*100 / SCALE); //setting the shape of the ground.
        
        world.CreateBody(bodyDef).CreateFixture(fixDef);
        
    }
    */
    //Start the engine, vroom!
    $(document).ready(function() { self.start(); });
};



//Awe yeah sweeet physaks
Engine.prototype.setupPhysics = function()
{
    //The b2Vec2 require 2 variables, gravity for X and Y axis. Since we don't want
    //any gravity on the X axis, we set it to 0 and we'll set Y to 50 for now.
    //true at the end means we're allowing bodies to sleep, this improves performance
    //when entities come to a halt.
    world = new box2d.b2World(new box2d.b2Vec2(0,50), true);

    //Ground Image
    var floorImage = new Image();
    floorImage.src = 'images/floor.png';

    //Create ground
    var fixDef = new box2d.b2FixtureDef();
    fixDef.density = 1;
    fixDef.friction = 0.5;

    //Now we need to define the body, static (not affected by gravity), dynamic (affected by grav)
    var bodyDef = new box2d.b2BodyDef();
    bodyDef.type = box2d.b2Body.b2_staticBody; //We're setting the ground to static.
    bodyDef.position.x = 1122 / 2 / SCALE; //Registration point is in the center for box2d entities.
    bodyDef.position.y = 548 / SCALE;
    fixDef.shape = new box2d.b2PolygonShape; //setting the shape of the ground.
    fixDef.shape.SetAsBox((1122 / SCALE) / 2, (20 / SCALE)/2);
    
    //Add the ground to the world, yeah!
    var floorFixture = world.CreateBody(bodyDef).CreateFixture(fixDef);
    this.hyperBout.ctx.drawImage(floorImage, (floorFixture.GetBody().GetPosition().x ) - 20, (floorFixture.GetBody().GetPosition().y * SCALE) - 20);

    /***Create Platforms***/
    var platformImage = new Image();
    platformImage.src = 'images/log.png';

    //Top Left - P1 Start
    var testFix = new box2d.b2FixtureDef();
    testFix.density = 1;
    testFix.friction = 0.5;
    var testDef = new box2d.b2BodyDef();
    testDef.type = box2d.b2Body.b2_staticBody;
    testDef.position.x = 400 / 2 / SCALE;
    testDef.position.y = 200 / 2 / SCALE;
    testFix.shape = new box2d.b2PolygonShape;
    testFix.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    world.CreateBody(testDef).CreateFixture(testFix);
    this.hyperBout.ctx.drawImage(platformImage, testDef.position.x * 6, testDef.position.y * 25);

    //Top Right - P2 Start
    var testFix2 = new box2d.b2FixtureDef();
    testFix2.density = 1;
    testFix2.friction = 0.5;
    var testDef2 = new box2d.b2BodyDef();
    testDef2.type = box2d.b2Body.b2_staticBody;
    testDef2.position.x = 1800 / 2 / SCALE;
    testDef2.position.y = 200 / 2 / SCALE;
    testFix2.shape = new box2d.b2PolygonShape;
    testFix2.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    world.CreateBody(testDef2).CreateFixture(testFix2);
    this.hyperBout.ctx.drawImage(platformImage, testDef2.position.x * 25 - 6, testDef2.position.y * 25);

    //Bottom Left - P3 Start
    var testFix3 = new box2d.b2FixtureDef();
    testFix3.density = 1;
    testFix3.friction = 0.5;
    var testDef3 = new box2d.b2BodyDef();
    testDef3.type = box2d.b2Body.b2_staticBody;
    testDef3.position.x = 400 / 2 / SCALE;
    testDef3.position.y = 800 / 2 / SCALE;
    testFix3.shape = new box2d.b2PolygonShape;
    testFix3.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    world.CreateBody(testDef3).CreateFixture(testFix3);
    this.hyperBout.ctx.drawImage(platformImage, testDef3.position.x * 6, testDef3.position.y *28 + 10);

    //Bottom Right - P4 Start
    var testFix4 = new box2d.b2FixtureDef();
    testFix4.density = 1;
    testFix4.friction = 0.5;
    var testDef4 = new box2d.b2BodyDef();
    testDef4.type = box2d.b2Body.b2_staticBody;
    testDef4.position.x = 1800 / 2 / SCALE;
    testDef4.position.y = 800 / 2 / SCALE;
    testFix4.shape = new box2d.b2PolygonShape;
    testFix4.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    world.CreateBody(testDef4).CreateFixture(testFix4);
    this.hyperBout.ctx.drawImage(platformImage, testDef4.position.x * 25 - 6 , testDef4.position.y *28 + 10);

    //Box2d has some nice default drawing, so let's draw the ground.
    var debugDraw = new box2d.b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("entityCanvas").getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    //Says what we want to draw
    debugDraw.SetFlags(box2d.b2DebugDraw.e_shapeBit | box2d.b2DebugDraw.e_jointBit);
    world.SetDebugDraw(debugDraw);
    
}

//Array of input handlers
Engine.InputHandlers = [ ];

Engine.InputHandler = function(tag, handler) {
    this.tag = tag;
    this.handler = handler;
};

Engine.UpdateState = function(){
    //Stores all of the current powerups on the field
    var powerUps = new Array();
    //Stores the time left inside the game.
    var timeLeft;
    //STores the number of players currently inside the game.
    var players;
    //Top player stores the current player with the most points
    var topPlayer;

}

Engine.RegisterInputHandler = function(inputHandler) {
    if (!(inputHandler instanceof Engine.InputHandler)) {
        throw "Error, I only accept Engine.InputHandler types";
    } 
    Engine.InputHandlers.push(inputHandler);
};

Engine.HandleInput = function(event) {
    for (var i = 0; i < Engine.InputHandlers.length; i++) {
        Engine.InputHandlers[i].handler(event);
    }
};

Engine.RemoveInputHandler = function(tag) {
    for (var i = 0; i < Engine.InputHandlers.length; i++) {
        if (Engine.InputHandlers[i].tag == tag) {
            // an array in javascript is just a list
            // splice(startIndex, numElementsToRemove, [elementsToAdd])
            // the following line just removes the element at i
            Engine.InputHandlers.splice(i, 1);
        }
    }
}

/**************************************************
** AUDIO
**************************************************/
//play music without loop if bool sets to false
//returns the audio object.
Engine.prototype.MusicPlayer = function(soundFile, bool)
{
    //create a new audio
    var myAudio = document.createElement('audio');
    //set the source to soundfile
    myAudio.setAttribute('src', soundFile);
    myAudio.loop = bool;
    //audio is not muted at first.
    myAudio.muted = false;
    myAudio.play();
    return myAudio;
}

//mainly for sound effects. For a check if the mute button is pressed or not.
Engine.prototype.MuteUnmuteAudio = function(soundFile, bool)
{
    if(mute == false)
    {
        var slash = Engine.prototype.MusicPlayer(soundFile, bool);
    }
}

/**************************************************
** GAME START
**************************************************/
//Set the frames per second to 30
var FPS = 30;

Engine.prototype.start = function()
{
    // use jQuery to bind to all key press events

    $(document).keydown(Engine.HandleInput);
    $(document).keyup(Engine.HandleInput);
    
    //Center the Canvas
    //If you wish to place it back to 0,0 remove this chunk and replace the bomb click function back to SCALE instead of 40
    var canvas = document.getElementById('main');
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var canvasWidth = viewportWidth * 0.8;
    var canvasHeight = canvasWidth / 2;

    canvas.style.position = "absolute";
    canvas.setAttribute("width", canvasWidth);
    canvas.setAttribute("height", canvasHeight);
    canvas.style.top = (viewportHeight - canvasHeight) / 2 + "px";
    canvas.style.left = (viewportWidth - canvasWidth) / 2 + "px";

    var cloudOneImageOne = new Image();
    cloudOneImageOne.src = 'images/clouds.png';
    var x1 = 0;

    var cloudOneImageTwo = new Image();
    cloudOneImageTwo.src = 'images/clouds.png';
    var x2 = 1120;

    var cloudTwoImageOne = new Image();
    cloudTwoImageOne.src = 'images/clouds2.png';
    var x21 = -20;

    var cloudTwoImageTwo = new Image();
    cloudTwoImageTwo.src = 'images/clouds2.png';
    var x22 = 1100

    var cloudThreeImageOne = new Image();
    cloudThreeImageOne.src = 'images/clouds3.png';
    var x31 = -20;

    var cloudThreeImageTwo = new Image();
    cloudThreeImageTwo.src = 'images/clouds3.png';
    var x32 = 1100;
    //Currently set to wait 1 second so that all players can have a position assigned to them
    setTimeout(function()
    {
        localPlayer.moveToSpawn();
        for(i = 0; i < remotePlayers.length; i++) 
        {        
            console.log("HIT");
            console.log(remotePlayers[i].id);
            console.log(remotePlayers[i].playerNumber);
            remotePlayers[i].moveToSpawn();
        }
    }, 1000)

    var self = this;

    setInterval(function()
    {

        self.update();
        self.draw();
        x1 = x1 - 4;
        x2 = x2 - 4;
        x21 = x21 - 2;
        x22 = x22 - 2;
        x31 = x31 - 1;
        x32 = x32 - 1;
        if(x1 <= -1120)
        {
            x1 = 1120;
        }
        if(x2 <= -1120)
        {
            x2 = 1120;
        }
        if(x21 <= -1140)
        {
            x21 = 1100;
        }
        if(x22 <= -1140)
        {
            x22 = 1100;
        }
        if(x31 <= -1140)
        {
            x31 = 1100;
        }
        if(x32 <= - 1140)
        {
            x32 = 1100;
        }
        self.animateClouds(cloudOneImageOne, x1, cloudOneImageTwo, x2, cloudTwoImageOne, x21, cloudTwoImageTwo, x22, cloudThreeImageOne, x31, cloudThreeImageTwo, x32);
        localPlayer.draw(self.hyperBout.entityctx);
        
        
        //console.log("Outside Interval: ID:" + localPlayer.id + " XPosition" + localPlayer.getX() + " YPosition" + localPlayer.getY());

        //Temporary emit to server, need to find more permanent version
        var playerVectorAndDirection = localPlayer.move();
        if(playerVectorAndDirection) {
            socket.emit("move player", playerVectorAndDirection);            
        }

        
        for (i = 0; i < remotePlayers.length; i++) 
        {
            
            //console.log("Inside Interval: ID:" + remotePlayers[i].id + " XPosition" + remotePlayers[i].getX() + " YPosition" + remotePlayers[i].getY());
            remotePlayers[i].draw(self.hyperBout.entityctx);
        };
    }, 1000/FPS);
};

//Draw text to test updating
Engine.prototype.draw = function()
{
    //Clear the canvas
    this.hyperBout.entityctx.clearRect(0, 0, this.hyperBout.width, this.hyperBout.height);
    this.hyperBout.animationctx.clearRect(0, 0, this.hyperBout.width, this.hyperBout.height);

    world.Step(
        1 / FPS
        , 10
        , 10
        );
    world.DrawDebugData();
    world.ClearForces();
}
Engine.prototype.animateClouds = function(cloudImageOne,  x1, cloudImageTwo, x2, cloudTwoImageOne, x21, cloudTwoImageTwo, x22, cloudThreeImageOne, x31, cloudThreeImageTwo, x32)
{
    this.hyperBout.animationctx.drawImage(cloudThreeImageOne, x31, 40);
    this.hyperBout.animationctx.drawImage(cloudThreeImageTwo, x32, 40);

    this.hyperBout.animationctx.drawImage(cloudTwoImageOne, x21, 20);
    this.hyperBout.animationctx.drawImage(cloudTwoImageTwo, x22, 20);

    this.hyperBout.animationctx.drawImage(cloudImageOne, x1, 0);
    this.hyperBout.animationctx.drawImage(cloudImageTwo, x2, 0);
}
//Move the text diagonal
Engine.prototype.update = function()
{
    

}
//Canvas wrapper
function CanvasWrapper(backCanvasId, entityCanvasId, animationCanvasId, width, height) {
    //Canvas for storing the background image
    this.canvas = document.getElementById(backCanvasId);
    this.ctx = this.canvas.getContext('2d');
    //Canvas for drawing entities such as players and projectiles.
    this.entityCanvas = document.getElementById(entityCanvasId);
    this.entityctx = this.entityCanvas.getContext('2d');
    //Canvas for animating clouds and what not
    this.animationCanvas = document.getElementById(animationCanvasId);
    this.animationctx = this.animationCanvas.getContext('2d');

    this.width = width;
    this.height = height;
}

/**************************************************
** HELPER FUNCTIONS
**************************************************/
function playerById(id) {
    var i;
    for (i = 0; i < remotePlayers.length; i++) {
        if (remotePlayers[i].id == id)
            return remotePlayers[i];
    };
    
    return false;
};