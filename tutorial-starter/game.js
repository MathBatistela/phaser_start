'use strict'

/* Game code goes here! */

var VALUES = {
    SHIP_ACCELERATION:  1300,
    SHIP_MAX_VELOCITY:  400
}

var config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920, // FULL HD
        height: 1080
    },
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 300 },
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
// backgrounds
var bgStars
var parallax
// logic
var launchCounter
var launchTime

function preload() {
    this.load.spritesheet('ship', 'assets/ship_124x48.png',
            { frameWidth: 124, frameHeight: 48 } )
    this.load.spritesheet('bullet', 'assets/bullet_20x21.png',
            { frameWidth: 20, frameHeight: 21 } )
    this.load.spritesheet('bullet-enemy', 'assets/bullet-enemy_20x21.png',
            { frameWidth: 20, frameHeight: 21 } )
    this.load.spritesheet('enemy', 'assets/enemy2_64x73.png',
            { frameWidth: 64, frameHeight: 73 } )
    this.load.spritesheet('explosion', 'assets/explosion_31x31.png',
            { frameWidth: 31, frameHeight: 31 } )

    this.load.image('cannon', 'assets/cannon.png')
    this.load.image('target', 'assets/target.png')
    this.load.image('asteroid', 'assets/meteor.png')

    this.load.image('stars', 'assets/background1.png')
    this.load.image('parallax', 'assets/background0.png')
}

function createBackground(context, speed, scale, tint) {
    var bg = context.add.tileSprite(
        game.renderer.width/2,
        game.renderer.height-240/2*scale, 
        game.renderer.width,
        240*scale, 'parallax')
    bg.scrollSpeed = speed
    bg.tileScaleY = scale
    bg.setTint(tint)
    return bg
}

function create() {
    launchCounter = 0
    launchTime = 120

    bgStars = this.add.tileSprite(
        game.renderer.width/2, game.renderer.height/2,
        game.renderer.width, game.renderer.height, 'stars')
    bgStars.fxCounter = 0
    
    parallax = []
    parallax[0] = createBackground(this, 5, 2.4, 0xAAAAAA)
    parallax[1] = createBackground(this, 15, 1.5, 0xFFFFFF)
    parallax[2] = createBackground(this, 20, 0.3, 0x888888)

    ship = this.physics.add.sprite(
        game.renderer.width/2, game.renderer.height/2, 'ship')
    ship.setDrag(VALUES.SHIP_ACCELERATION)
    ship.setMaxVelocity(VALUES.SHIP_MAX_VELOCITY)
    ship.setScale(0.75)
    ship.setSize(ship.width-40, ship.height-30)
    ship.setOffset(30,20)
    ship.hitCounter = 0

    cannon = this.physics.add.sprite(ship.x, ship.y, 'cannon')
    cannon.isShooting = false
    cannon.shotCounter = 0
    cannon.shotRate = 3

    target = this.physics.add.sprite(ship.x, ship.y, 'target')

    asteroids = this.physics.add.group()
    for (var i = 0; i < 5; i++) {
        var x = Phaser.Math.Between(100, game.renderer.width-100)
        var y = Phaser.Math.Between(100, game.renderer.height-100)
        var ast = asteroids.create(x, y, 'asteroid')
        ast.setVelocity(Phaser.Math.Between(-90, -30),
                        Phaser.Math.Between(-50, 50))
        ast.setScale(Phaser.Math.FloatBetween(0.5, 0.8))
        ast.setAngle(Phaser.Math.FloatBetween(-180, 180))
        //ast.setCircle(ast.width/2-20, 20, 20)
        ast.setSize(130,130)
        ast.setOffset(35,35)
        ast.setImmovable(true)
    }

    bullets = this.physics.add.group({
        maxSize: 20,
        defaultKey: 'bullet'
    })
    enemyBullets = this.physics.add.group({
        maxSize: 10,
        defaultKey: 'bullet-enemy'
    })
    enemies = this.physics.add.group({
        maxSize: 30,
        defaultKey: 'enemy'
    })
    explosions = this.physics.add.group({
        maxSize: 30,
        defaultKey: 'explosion'
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
                        { start:0, end: 3 }),
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

    this.input.on('pointerdown', function(pointer) { 
        cannon.isShooting = true
    }, this)

    this.input.on('pointerup', function(pointer) { 
        cannon.isShooting = false
    }, this)

    this.input.on('pointermove', function(pointer) { 
        target.x = pointer.x
        target.y = pointer.y
    }, this)
}

function firePlayerBullet(context) {
    fireBullet(context, bullets, cannon.x, cannon.y, cannon.rotation,
        900, 'bullet-idle')
}

function fireEnemyBullet(context, enemy) {
    var rotation = Phaser.Math.Angle.BetweenPoints(enemy, ship)
    fireBullet(context, enemyBullets, enemy.x, enemy.y, rotation,
        250, 'bullet-enemy-idle')
}

function fireBullet(context, group, x, y, rotation, speed, anim) {
    var bullet = group.get()
    if (!bullet) return
    bullet.enableBody(true, x, y, true, true)
    bullet.rotation = rotation
    var velocity = new Phaser.Math.Vector2()
    context.physics.velocityFromRotation(rotation, speed, velocity)
    bullet.setVelocity(velocity.x, velocity.y)
    bullet.anims.play(anim)
}

function createExplosion(x, y, scale=1) {
    var exp = explosions.get()
    if (!exp)
        return

    exp.enableBody(true, x, y, true, true)
    exp.setScale(scale)
    exp.anims.play('explosion-idle')
    exp.on('animationcomplete', function(anim, frame, target) {
        target.disableBody(true, true)
    }, this)
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

function launchEnemy(context) {
    launchCounter++
    if (launchCounter < launchTime)
        return
    
    // it's time to launch an enemy!
    launchCounter = 0
    var enemy = enemies.get()
    if (!enemy) 
        return

    var x = Phaser.Math.Between(1, game.renderer.width-1)
    var y = Phaser.Math.Between(1, game.renderer.height-1)
    enemy.enableBody(true, x, y, true, true)
    enemy.body.enable = false
    enemy.anims.play('enemy-idle')
    enemy.setTint(0xffffff)
    enemy.setScale(2)
    enemy.alpha = 0
    enemy.dirCounter = 45
    enemy.ready = false
    enemy.health = 5
    enemy.hitCounter = 0
    enemy.attackCounter = 0

    context.tweens.add({
        targets: enemy,
        scaleX: 1,
        scaleY: 1,
        alpha: 0.5,
        ease: 'Power1',
        duration: 3000,
        onComplete: onEnemyStart
    })
}

function onEnemyStart(tween, targets) {
    var enemy = targets[0]
    enemy.alpha = 1
    enemy.ready = true
    enemy.body.enable = true
}

function updateEnemy(context, enemy) {
    if (!enemy.active || !enemy.ready)
        return

    enemy.hitCounter--
    if (enemy.hitCounter <= 0)
        enemy.setTint(0xffffff)

    // attack logic
    enemy.attackCounter++
    if (enemy.attackCounter >= 180) {
        enemy.attackCounter = 0
        fireEnemyBullet(context, enemy)
    }

    // direction change logic
    enemy.dirCounter++
    if (enemy.dirCounter >= 45) {
        enemy.dirCounter = 0
        var velocity = new Phaser.Math.Vector2()
        var rotation = Phaser.Math.Between(-180,180) * Phaser.Math.DEG_TO_RAD
        context.physics.velocityFromRotation(rotation, 80, velocity)
        enemy.setVelocity(velocity.x, velocity.y)
    }
    context.physics.world.wrap(enemy, enemy.width/2)
}

function updateBackgrounds() {
    bgStars.tileScaleX = 1 + Math.cos(bgStars.fxCounter) * 0.2
    bgStars.tileScaleY = 1 + Math.sin(bgStars.fxCounter) * 0.2
    bgStars.fxCounter += 0.01

    for (var bg of parallax) {
        bg.tilePositionX += bg.scrollSpeed
    }
}

function update() {
    updateBackgrounds()
    updatePlayer(this)
    launchEnemy(this)
    for (var bullet of bullets.getChildren()){
        updateBullet(this, bullet)
    }
    for (var bullet of enemyBullets.getChildren()){
        updateBullet(this, bullet)
    }
    for (var enemy of enemies.getChildren()){
        updateEnemy(this, enemy)
    }

    this.physics.world.wrap(asteroids, 50)
    this.physics.world.collide(ship, asteroids)
    this.physics.world.collide(enemies, asteroids)

    this.physics.world.overlap(bullets, asteroids, hitAsteroids, null, this)
    this.physics.world.overlap(enemyBullets, asteroids, hitAsteroids, null, this)
    
    this.physics.world.overlap(bullets, enemies, hitEnemy, null, this)
}

function hitAsteroids(bullet, asteroid) {
    createExplosion(bullet.x, bullet.y)
    bullet.disableBody(true, true)
}

function hitEnemy(bullet, enemy) {
    createExplosion(bullet.x, bullet.y)
    bullet.disableBody(true, true)

    enemy.hitCounter = 7
    enemy.setTint(0xff0000)
    enemy.health--
    if (enemy.health <= 0) {
        createExplosion(enemy.x, enemy.y, 2)
        enemy.disableBody(true, true)
    }
} 