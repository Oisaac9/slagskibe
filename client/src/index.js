import Phaser from "phaser";
import GridCell from "./GridCell.js";
import io from 'socket.io-client';

//import logoImg from "./assets/logo.png";

var gameStateData = {
    socket: null,
    playerBoard: null,
    switchBoard: null,
    clientPlayer:null,
    activePlayer: "A",
    getOpponentPlayer:function() {
        if(this.clientPlayer === "A") {
            return "B";
        } else {
            return "A";
        }
    },
    switchPlayer:function() {
        if (this.activePlayer === "A") {
            this.activePlayer = "B";
        } else {
            this.activePlayer = "A";
        }
        console.log("activePlayer: " + this.activePlayer);
        this.activeCorrectScene();
    },
    activeCorrectScene:function() {
        if(this.activePlayer === this.clientPlayer) {
            //gameStateData.switchPlayer();
            this.switchBoard.statusText.setText('It is your turn... make your move');
            //this.scene.launch('playerBoard');
            //game.scene.stop('switchBoard');
            //this.switchBoard = null;
            this.switchBoard.scene.switch('playerBoard');
            if(this.playerBoard !== null) {
                this.playerBoard.updateView();
            }
        } else {
            this.switchBoard.statusText.setText('Waiting for player '+this.getOpponentPlayer());
            //this.scene.remove('playerBoard');
            //game.scene.stop('playerBoard');
            //this.playerBoard = null;
            if(this.playerBoard !== null) {
                this.playerBoard.scene.switch('switchBoard');
            }
        }
    },
    player: {
      shipLocation: null,
      explosionLocation: null,
      bombLocation:null,
      hitpoints: 5,
    },
    playerOther: {
      shipLocation: null,
      explosionLocation: null,
      bombLocation:null,
      hitpoints: 5,
    },
    getPlayer:function() {
      return this.player;
    },
    getOtherPlayer:function() {
      return this.playerOther;
    },
    initConnection:function() {
        if(this.socket === null) {
            console.log("Connecting...");
            this.socket = io('http://127.0.0.1:3000', { transport : ['websocket'] });
            this.socket.on('connect', function () {
                console.log('Connected! (', this);
            });
            this.socket.on('message', function (msg) {
                console.log('message! ', msg);
                switch(msg.action) {
                    case "start":
                        this.send({action:"chat", message:"Hello, player "+gameStateData.clientPlayer+" is ready"});
                        gameStateData.activeCorrectScene();
                        break;
                    case "end":
                        console.log("TODO, Game ended, reason: "+msg.reason);
                        break;
                    case "assign":
                        gameStateData.clientPlayer = msg.player;
                        console.log(gameStateData);
                        gameStateData.switchBoard.statusText.setText('You are player '+gameStateData.clientPlayer);
                        break;
                    case "update":
                        //gameStateData.clientPlayer = msg.gameStateData.clientPlayer;
                        gameStateData.playerOther = msg.player;
                        gameStateData.player.explosionLocation = gameStateData.playerOther.bombLocation;
                        gameStateData.switchPlayer();
                        break;
                    case "chat":
                        console.log("CHAT: ", msg.message);
                        break;
                    default:
                        console.log("Unknown action: ", msg);
                        break;

                }
            });
        }
    }
};

var playerBoard = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize:

  function PlayerBoard ()
  {
      Phaser.Scene.call(this, { key: 'playerBoard' });
  },

  preload:function()
  {
      this.load.spritesheet('grid_cell', 'images/grid_cell.png', { frameWidth: 20, frameHeight: 20 });
      this.load.spritesheet('spaceship', 'images/spaceship.png', { frameWidth: 20, frameHeight: 20 });
      this.load.spritesheet('actions', 'images/actions.png', { frameWidth: 20, frameHeight: 20 });
      this.load.spritesheet('explosion', 'images/explosion.png', { frameWidth: 60, frameHeight: 60 });
      this.load.image('map', 'images/map.png');
      this.load.image('vitory_image', 'images/victory-1.jpg');
      this.load.audio('song','audio/BoxCat Games - Battle (Special).mp3')
      this.load.audio('lose effect','audio/61233899.mp3')
      this.load.audio('song_victory','audio/Ultimate-Victory-WST010901.mp3')
      this.load.audio('victory effect','audio/victory sound.mp3')


  },

  create: function() {
      gameStateData.playerBoard = this;

      this.add.image(400, 300, "map");
      this.music = this.sound.add('song');
      this.music_victory = this.sound.add('song_victory');
      this.music.play();
      this.cameras.main.backgroundColor = Phaser.Display.Color.HexStringToColor("#3498db");
      // WHo is playing
      this.youArePlayer = this.add.text(550, 543, '', {fill: '#0f0'});
      this.youArePlayer.setText('You are player ' + gameStateData.clientPlayer + "\nHitpoints: "+gameStateData.getPlayer().hitpoints);


      this.actionText = this.add.text(100, 120, '...', { fill: '#0f0' });
      // Add the switch button (hidden)
      this.switchButton = this.add.text(200, 500, 'I am done', { fill: '#0f0' });
      this.switchButton.setInteractive();
      this.switchButton.on('pointerdown', () => { this.clickSwitchButton(); });
      this.switchButton.visible = false;
      this.spaceship = this.add.sprite(0, 0, 'spaceship');
      this.actions = this.add.sprite(0, 0, 'actions');
      this.explosion = this.add.image(0,0,'explosion');
      this.explosion.visible = false;

      this.updateView();
  },
  updateView: function() {
      this.isFirstTurn = (gameStateData.getPlayer().shipLocation == null);

      this.yStart = 150;
      this.xStart = 250;
      for(let y = 0; y < 15; y++) {
          for(let x = 0; x < 15; x++) {
              let gridCell = new GridCell({
                  'scene': this,
                  'key':'grid_cell',
                  'up': 0,
                  'over':1,
                  'down':2,
                  'x': this.xStart + x * 20,
                  'y': this.yStart + y * 20
              });
              gridCell.cellId = {x:x, y:y};
              gridCell.on('pointerdown',() => { this.clickGridCell(gridCell); });
          }
      }

      this.actions.visible = false;



      if(this.isFirstTurn) {
          this.actionText.setText('Place your ship');
          // Place your ship
          this.spaceship.visible = false;
      } else {
          this.actionText.setText('Shoot or move');
          // Show the ship - let the player choose to bomb a square
          this.moveToCell(this.spaceship, gameStateData.getPlayer().shipLocation);

          if(gameStateData.getPlayer().explosionLocation != null) {
              this.explosion.visible = true;
              this.moveToCell(this.explosion, gameStateData.getPlayer().explosionLocation);

              // TODO: Deal damage
              let sl = gameStateData.getPlayer().shipLocation;
              let el = gameStateData.getPlayer().explosionLocation;
              let dx = Math.abs(sl.x - el.x);
              let dy = Math.abs(sl.y - el.y);
              if(dx <= 0 && dy <= 0) {
                  gameStateData.getPlayer().hitpoints -= 2;
              } else if(dx <= 1 && dy <= 1) {
                  gameStateData.getPlayer().hitpoints -= 1;
              } else if(dx <= 2 && dy <= 2) {
                  //gameStateData.getPlayer().hitpoints -= 1;
              }

              this.youArePlayer.setText('You are player ' + gameStateData.clientPlayer + "\nHitpoints: "+gameStateData.getPlayer().hitpoints);

              if(gameStateData.getPlayer().hitpoints <= 0) {
                  this.youArePlayer.setText("U ded!");
                  this.music.stop();
                  var ded = this.sound.add('lose effect');
                  ded.play();


                  // TODO: End the game
              } else if(gameStateData.getOtherPlayer().hitpoints <= 0) {
                this.music.stop();
                this.music_victory.play();
                this.add.image(400, 300, "victory_image");
                var win = this.sound.add('victory effect');
                win.play();

              }

              gameStateData.getPlayer().explosionLocation = null;
          } else {
              this.explosion.visible = false;
          }
      }
  },
  moveToCell(obj, dest) {
      obj.x = this.xStart + dest.x * 20;
      obj.y = this.yStart + dest.y * 20;
  },

  clickSwitchButton() {
    if(this.isFirstTurn) {
      // Do nothing
    } else {
      if(this.actions.action === "shoot") {
          gameStateData.getPlayer().bombLocation = this.actions.cellId;
      } else {
          // Move
          gameStateData.getPlayer().shipLocation = this.actions.cellId;
      }
    }
    gameStateData.switchPlayer();
    console.log("sending",gameStateData.getPlayer());
    gameStateData.socket.send({'action':'update', 'player':gameStateData.getPlayer()});
    gameStateData.getPlayer().bombLocation = null;
  },
  clickGridCell(gridCell) {
      console.log(gridCell.cellId);
      if(this.isFirstTurn) {
          this.spaceship.x = gridCell.x;
          this.spaceship.y = gridCell.y;
          gameStateData.getPlayer().shipLocation = gridCell.cellId;
          this.spaceship.visible = true;
          this.switchButton.visible = true;
      } else {
          // Do somthing else with the cell (shoot or move)
          let sl = gameStateData.getPlayer().shipLocation;
          let dx = Math.abs(sl.x - gridCell.cellId.x);
          let dy = Math.abs(sl.y - gridCell.cellId.y);
          if(dx == 0 && dy == 0) {
              // Ignore
          } else if(dx <= 3 && dy <= 3) {
              // Shoot the bomp
              this.actions.visible = true;
              this.actions.cellId = gridCell.cellId;
              this.actions.action = (dx <= 1 && dy <= 1) ? "move" : "shoot";
              this.moveToCell(this.actions, gridCell.cellId);
              this.actions.setFrame((dx <= 1 && dy <= 1) ? 0 : 1);
              this.switchButton.visible = true;
          } else {
              console.log("Retard?");
          }
      }

  },
  update: function() {
      //console.log('hest');
  }
});

// TODO: Make an invisible scene which keeps the gameStateData and connnection to server.

let switchBoard = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize:

  function SwitchBoard ()
  {
      Phaser.Scene.call(this, { key: 'switchBoard' });
  },

  preload: function ()
  {
      this.load.image('switch_bg', 'images/switch_background.jpg');

  },

  create: function ()
  {
      gameStateData.switchBoard = this;
      console.log("Assigned switchBoard");

      this.add.image(400, 300, 'switch_bg');


      // WHo is playing
      this.statusText = this.add.text(550, 543, 'Connecting...', { fill: '#0f0' });

      //let clickCount = 0;
      //this.switchButton = this.add.text(200, 500, 'I am done', { fill: '#0f0' });
      //this.switchButton.setInteractive();
      //this.switchButton.on('pointerdown', () => { this.clickSwitchButton(++clickCount); });
      gameStateData.initConnection();
  },

  update: function() {
      //console.log('switching');
  }

});


let config = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  physics: {
      default: 'arcade',
      arcade: {
          gravity: { y: 200 }
      }
  },
  scene: [switchBoard, playerBoard]
};

const game = new Phaser.Game(config);