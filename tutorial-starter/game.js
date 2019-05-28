'use strict'

/* Game code goes here! */

var VALUES = {
    SHIP_ACCELERATION: 1300,
    SHIP_MAX_VELOCITY: 400
}

var config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280, // HD
        height: 720
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
}
var game = new Phaser.Game(config)

// sprites
var ship
var cursors
var cannon
var target
// groups
var bullets
var enemies
var enemyBullets
var explosions
var asteroids

function preload() {
    this.load.spritesheet('ship', 'assets/ship_124x48.png',
        { frameWidth: 124, frameHeight: 48 })
    this.load.spritesheet('bullet', 'assets/bullet_20x21.png',
        { frameWidth: 20, frameHeight: 21 })
    this.load.spritesheet('bullet-enemy', 'assets/bullet-enemy_20x21.png',
        { frameWidth: 20, frameHeight: 21 })
    this.load.spritesheet('enemy', 'assets/enemy2_64x73.png',
        { frameWidth: 64, frameHeight: 73 })
    this.load.spritesheet('explosion', 'assets/explosion_31x31.png',
        { frameWidth: 31, frameHeight: 31 })

    this.load.image('cannon', 'assets/cannon.png')
    this.load.image('target', 'assets/target.png')
    this.load.image('asteroid', 'assets/meteor.png')

}

function create() {
    ship = this.physics.add.sprite(
        game.renderer.width / 2, game.renderer.height / 2, 'ship')
    ship.setDrag(VALUES.SHIP_ACCELERATION)
    ship.setMaxVelocity(VALUES.SHIP_MAX_VELOCITY)
    ship.setScale(0.75)
    ship.setSize(ship.width - 40, ship.height - 30)
    ship.setOffset(30, 20)
    ship.hitCounter = 0

    cannon = this.physics.add.sprite(ship.x, ship.y, 'cannon')
    cannon.isShooting = false
    cannon.shotCounter = 0
    cannon.shotRate = 3

    asteroids = this.physics.add.group()
    for (var i =0; i < 5; i++) {
        var x = Phaser.Math.Between(100, game.renderer.width-100)
        var ast = asteroids.create()
    }

    target = this.physics.add.sprite(ship.x, ship.y, 'target')

    bullets = this.physics.add.group({
        maxSize: 20,
        defaultKey: 'bullet'
    })

    this.anims.create({
        key: 'explosion-idle',
        frames: this.anims.generateFrameNumbers('explosion'),
        frameRate: 20
    })

    this.anims.create({
        key: 'enemy-idle',
        frames: this.anims.generateFrameNumbers('enemy'),
        frameRate: 20,
        repeat: -1
    })

    this.anims.create({
        key: 'bullet-enemy-idle',
        frames: this.anims.generateFrameNumbers('bullet-enemy'),
        frameRate: 20,
        repeat: -1,
        yoyo: true
    })

    this.anims.create({
        key: 'bullet-idle',
        frames: this.anims.generateFrameNumbers('bullet',
            { start: 0, end: 3 }),
        frameRate: 20,
        repeat: -1,
        yoyo: true
    })

    this.anims.create({
        key: 'ship-idle',
        frames: this.anims.generateFrameNumbers('ship'),
        frameRate: 20,
        repeat: -1
    })
    ship.anims.play('ship-idle')

    cursors = this.input.keyboard.createCursorKeys()

    this.input.on('pointerdown', function (pointer) {
        cannon.isShooting = true
    }, this)

    this.input.on('pointerup', function (pointer) {
        cannon.isShooting = false
    }, this)

    this.input.on('pointermove', function (pointer) {
        target.x = pointer.x
        target.y = pointer.y
    }, this)
}

function firePlayerBullet(context) {
    fireBullet(context, bullets, cannon.x, cannon.y, cannon.rotation,
        900, 'bullet-idle')
}

function fireBullet(context, group, x, y, rotation, speed, anim) {
    var bullet = group.get()
    if (!bullet) return
    bullet.enableBody(true, x, y, true, true)
    bullet.rotation = rotation
    var velocity = new Phaser.Math.Vector2()
    context.physics.velocityFromRotation(rotation, speed, velocity)
    bullet.setVelocity(velocity.x, velocity.y)
    //bullet.anims.play(anim)
}

function updatePlayer(context) {
    if (!ship.active)
        return

    if (cursors.left.isDown) {
        ship.setAccelerationX(-VALUES.SHIP_ACCELERATION)
    } else
        if (cursors.right.isDown) {
            ship.setAccelerationX(VALUES.SHIP_ACCELERATION)
        } else {
            ship.setAccelerationX(0)
        }

    if (cursors.up.isDown) {
        ship.setAccelerationY(-VALUES.SHIP_ACCELERATION)
    } else
        if (cursors.down.isDown) {
            ship.setAccelerationY(VALUES.SHIP_ACCELERATION)
        } else {
            ship.setAccelerationY(0)
        }

    // context = this
    context.physics.world.wrap(ship)

    cannon.x = ship.x
    cannon.y = ship.y
    cannon.rotation = Phaser.Math.Angle.BetweenPoints(cannon, target)

    cannon.shotCounter++
    if (cannon.isShooting && cannon.shotCounter > cannon.shotRate) {
        cannon.shotCounter = 0
        firePlayerBullet(context)
    }
}

function updateBullet(context, bullet) {
    if (!bullet.active)
        return

    if (!Phaser.Geom.Rectangle.Overlaps(
        context.physics.world.bounds, bullet.getBounds())) {
        bullet.disableBody(true, true)
    }
}

function update() {
    updatePlayer(this)
    for (var bullet of bullets.getChildren()) {
        updateBullet(this, bullet)
    }
}