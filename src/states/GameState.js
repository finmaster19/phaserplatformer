import Phaser from 'phaser'
import Hero from '../sprites/Hero'
import Spider from '../sprites/Spider'

const LEVEL_COUNT = 2;

export default class GameState extends Phaser.State {

  init (data) {
    this.game.renderer.renderSession.roundPixels = true;
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP // add this line
    });
    this.keys.up.onDown.add(()=> {
        let didJump = this.hero.jump();
        if (didJump) {
            this.sfx.jump.play();
        }
    }, this);
    this.coinPickupCount = 0;
    this.hasKey = false;
    this.level = (data.level || 0) % LEVEL_COUNT;

  }
  preload () {
    this.game.load.json('level:0', '../../assets/data/level00.json');
    this.game.load.json('level:1', '../../assets/data/level01.json');
    this.game.load.image('background', '../../assets/images/background.png');
    this.game.load.image('ground', '../../assets/images/ground.png');
    this.game.load.image('grass:8x1', '../../assets/images/grass_8x1.png');
    this.game.load.image('grass:6x1', '../../assets/images/grass_6x1.png');
    this.game.load.image('grass:4x1', '../../assets/images/grass_4x1.png');
    this.game.load.image('grass:2x1', '../../assets/images/grass_2x1.png');
    this.game.load.image('grass:1x1', '../../assets/images/grass_1x1.png');
    this.game.load.image('invisible-wall', '../../assets/images/invisible_wall.png');
    this.game.load.image('icon:coin', '../../assets/images/coin_icon.png');
    this.game.load.image('font:numbers', '../../assets/images/numbers.png');
    this.game.load.image('key', '../../assets/images/key.png');

    this.game.load.spritesheet('hero', '../../assets/images/hero.png', 36, 42);
    this.game.load.spritesheet('door', '../../assets/images/door.png', 42, 66);
    this.game.load.spritesheet('coin', '../../assets/images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('spider', '../../assets/images/spider.png', 42, 32);
    this.game.load.spritesheet('icon:key', '../../assets/images/key_icon.png', 34, 30);

    this.game.load.audio('sfx:jump', '../../assets/audio/jump.wav');
    this.game.load.audio('sfx:coin', '../../assets/audio/coin.wav');
    this.game.load.audio('sfx:stomp', '../../assets/audio/stomp.wav');
    this.game.load.audio('sfx:key', '../../assets/audio/key.wav');
    this.game.load.audio('sfx:door', '../../assets/audio/door.wav');
  }

  create () {
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door'),
    };
    this.game.add.image(0, 0, 'background');
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
    this._createHud();
  }

  render () {

  }

  _createHud() {
    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
          NUMBERS_STR, 6);
    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.position.set(10, 10);
    this.hud.add(coinScoreImg);
    this.hud.add(this.keyIcon);
  };

  _loadLevel(data) {
    // create all the groups/layers that we need
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

      // spawn all platforms
      data.platforms.forEach(this._spawnPlatform, this);
      // spawn hero and enemies
      this._spawnCharacters({hero: data.hero, spiders: data.spiders});
      // spawn important objects
      data.coins.forEach(this._spawnCoin, this);
      this._spawnDoor(data.door.x, data.door.y);
      this._spawnKey(data.key.x, data.key.y);

      // enable gravity
      const GRAVITY = 1200;
      this.game.physics.arcade.gravity.y = GRAVITY;
  };

  _spawnCoin(coin) {
      let sprite = this.coins.create(coin.x, coin.y, 'coin');
      sprite.anchor.set(0.5, 0.5);
      sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
      sprite.animations.play('rotate');
      this.game.physics.enable(sprite);
      sprite.body.allowGravity = false;
  };

  _spawnKey(x, y) {
      this.key = this.bgDecoration.create(x, y, 'key');
      this.key.anchor.set(0.5, 0.5);
      this.game.physics.enable(this.key);
      this.key.body.allowGravity = false;
      this.key.y -= 3;
      this.game.add.tween(this.key)
          .to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
          .yoyo(true)
          .loop()
          .start();
  };

  _spawnPlatform(platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
  };

  _spawnDoor(x, y) {
      this.door = this.bgDecoration.create(x, y, 'door');
      this.door.anchor.setTo(0.5, 1);
      this.game.physics.enable(this.door);
      this.door.body.allowGravity = false;
  };

  _spawnEnemyWall(x, y, side) {
      let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
      // anchor and y displacement
      sprite.anchor.set(side === 'left' ? 1 : 0, 1);

      // physic properties
      this.game.physics.enable(sprite);
      sprite.body.immovable = true;
      sprite.body.allowGravity = false;
  };

  _spawnCharacters(data) {
    // spawn spiders
     data.spiders.forEach(function (spider) {
         let sprite = new Spider(this.game, spider.x, spider.y);
         this.spiders.add(sprite);
     }, this);
      // spawn hero

    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);
  };

  _handleCollisions() {
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin,
       null, this);
    this.game.physics.arcade.overlap(this.hero, this.spiders,
       this._onHeroVsEnemy, null, this);
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey,
       null, this);
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
           // ignore if there is no key or the player is on air
           function (hero, door) {
               return this.hasKey && hero.body.touching.down;
           }, this);
  };

  _onHeroVsDoor(hero, door) {
      this.sfx.door.play();
      this.game.state.restart(true, false, { level: this.level + 1 });
  }

  _onHeroVsEnemy(hero, enemy) {
    if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
      hero.bounce();
      // make sure you remove enemy.kill() !!!
      enemy.die();
      this.sfx.stomp.play();
    }
    else { // game over -> restart the game
      this.sfx.stomp.play();
      this.game.state.restart(true, false, {level: this.level});
    }
  }

  _onHeroVsKey(hero, key) {
      this.sfx.key.play();
      key.kill();
      this.hasKey = true;
  }

  _onHeroVsCoin(hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
  }

  _handleInput() {
      if (this.keys.left.isDown) { // move hero left
        this.hero.move(-1);
      }
      else if (this.keys.right.isDown) { // move hero right
        this.hero.move(1);
      }
      else { // stop
        this.hero.move(0);
      }
  }

  update() {
      this._handleCollisions();
      this._handleInput();
      this.coinFont.text = `x${this.coinPickupCount}`;
      this.keyIcon.frame = this.hasKey ? 1 : 0;
  }
}
