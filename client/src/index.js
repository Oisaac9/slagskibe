import Phaser from "phaser";
import GridCell from "./GridCell.js";
import io from 'socket.io-client';

//import logoImg from "./assets/logo.png";

var gameStateData = {
    clientPlayer:null,
  activePlayer: "A",
  switchPlayer:function() {
      if(this.activePlayer == "A") {
          this.activePlayer = "B";
      } else {
          this.activePlayer = "A";
      }
  },
  playerA: {
      shipLocation: null,
      explosionLocation: null,
  },
  playerB: {
      shipLocation: null,
      explosionLocation: null,
  },
  getPlayer:function() {
      return this.activePlayer == 'A' ? this.playerA : this.playerB;
  },
  getOtherPlayer:function() {
      return this.activePlayer == 'A' ? this.playerB : this.playerA;
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

  },

  create: function  ()
  {
      this.socket = io('http://localhost:3000', { transport : ['websocket'] });
      this.socket.on('connect', function () {
        console.log('Connected! (', this);
      });  
      this.socket.on('message', function (msg) {
        console.log('message! ', msg);
        switch(msg.action) {
            case "start":
                this.send({action:"chat", message:"Hello, player "+gameStateData.clientPlayer+" is ready"});
                break;
            case "end":
                console.log("TODO, Game ended, reason: "+msg.reason);
                break;
            case "assign":
                gameStateData.clientPlayer = msg.player;
                break;
            case "chat":
                console.log("CHAT: ", msg.message);
                break;
            default:
                console.log("Unknown action: ", msg);
                break;

        }
      });


     this.add.image(400, 300, "map");
     this.cameras.main.backgroundColor = Phaser.Display.Color.HexStringToColor("#3498db");
      // WHo is playing
      this.add.text(550, 543, 'You are player '+gameStateData.activePlayer, { fill: '#0f0' });


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

      this.spaceship = this.add.sprite(0, 0, 'spaceship');
      this.actions = this.add.sprite(0, 0, 'actions');
      this.actions.visible = false;



      if(this.isFirstTurn) {
          this.add.text(100, 120, 'Place your ship', { fill: '#0f0' });
          // Place your ship
          this.spaceship.visible = false;
      } else {
          this.add.text(100, 120, 'Shoot or move', { fill: '#0f0' });
          // Show the ship - let the player choose to bomb a square
          this.moveToCell(this.spaceship, gameStateData.getPlayer().shipLocation);

          if(gameStateData.getPlayer().explosionLocation != null) {
              let explosion = this.add.image(0,0,'explosion');
              this.moveToCell(explosion, gameStateData.getPlayer().explosionLocation);

              // TODO: Deal damage

              gameStateData.getPlayer().explosionLocation = null;
          }
      }

      // Add the switch button (hidden)
      let clickCount = 0;
      this.switchButton = this.add.text(200, 500, 'I am done', { fill: '#0f0' });
      this.switchButton.setInteractive();
      this.switchButton.on('pointerdown', () => { this.clickSwitchButton(++clickCount); });
      this.switchButton.visible = false;
  },
  moveToCell(obj, dest) {
      obj.x = this.xStart + dest.x * 20;
      obj.y = this.yStart + dest.y * 20;
  },

  clickSwitchButton(clickCount) {
      this.switchButton.setText(`Button has been clicked ${clickCount} times.`);
      if(clickCount > 1) {
          if(this.isFirstTurn) {
              // Do nothing
          } else {
              if(this.actions.action == "shoot") {
                  // TODO: Shoot the other player
                  gameStateData.getOtherPlayer().explosionLocation = this.actions.cellId;
              } else {
                  // Move
                  gameStateData.getPlayer().shipLocation = this.actions.cellId;
              }
          }

          this.scene.start('switchBoard');
      }
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

var switchBoard = new Phaser.Class({

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
      this.add.image(400, 300, 'switch_bg');

      let clickCount = 0;
      this.switchButton = this.add.text(200, 500, 'I am done', { fill: '#0f0' });
      this.switchButton.setInteractive();
      this.switchButton.on('pointerdown', () => { this.clickSwitchButton(++clickCount); });
  },
  clickSwitchButton(clickCount) {
      this.switchButton.setText(`Button has been clicked ${clickCount} times.`);
      if(clickCount > 1) {
          gameStateData.switchPlayer();
          this.scene.start('playerBoard');
      }
  },

  update: function() {
      console.log('switching');
  }

});


var config = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  physics: {
      default: 'arcade',
      arcade: {
          gravity: { y: 200 }
      }
  },
  scene: [playerBoard, switchBoard]
};

const game = new Phaser.Game(config);