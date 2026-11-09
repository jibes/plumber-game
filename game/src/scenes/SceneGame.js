// SceneGame - Main gameplay scene

class SceneGame extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGame' });
        this.levelData = null;
        this.player = null;
        this.cursors = null;
        this.touchControls = null;
        this.score = 0;
        this.timeLeft = 120;
        this.timer = null;
        this.scoreText = null;
        this.timeText = null;
        this.currentLevel = 1;
        this.coinsCollected = 0;
        this.totalCoins = 0;
        this.gameOver = false;
        this.victory = false;
    }

    init(data) {
        this.currentLevel = data.level || 1;
        this.score = data.score || 0;
    }

    create() {
        // Load level data
        this.loadLevel(this.currentLevel);
        
        // Create isometric world
        this.createWorld();
        
        // Create UI
        this.createUI();
        
        // Create player
        this.createPlayer();
        
        // Create controls
        this.createControls();
        
        // Create objects and enemies
        this.createObjects();
        this.createEnemies();
        
        // Setup camera
        this.setupCamera();
        
        // Setup collisions
        this.setupCollisions();
        
        // Start timer
        this.startTimer();
        
        // Fade in
        this.cameras.main.fadeIn(500);
    }

    loadLevel(levelNum) {
        // Use cached level data or load from cache
        const cacheKey = `level_${levelNum}`;
        if (this.cache.json.has(cacheKey)) {
            this.levelData = this.cache.json.get(cacheKey);
        } else {
            // Fallback to generated level
            this.levelData = this.generateLevel(levelNum);
        }
        
        // Count total collectibles
        this.totalCoins = this.levelData.objects.filter(o => o.type === 'coin').length;
    }

    generateLevel(levelNum) {
        // Generate a simple level programmatically
        const size = 10 + levelNum * 2;
        const data = {
            size: { width: size, height: size },
            tiles: [],
            objects: [],
            enemies: [],
            start: { x: 1, y: 1 },
            exit: { x: size - 2, y: size - 2 }
        };

        // Create floor tiles
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                // Create a checkerboard pattern for floor
                if (x >= 1 && x < size - 1 && y >= 1 && y < size - 1) {
                    data.tiles.push({
                        x: x,
                        y: y,
                        type: (x + y) % 2 === 0 ? 'floor1' : 'floor2',
                        solid: true
                    });
                }
                // Add some walls
                if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
                    if (!(x === data.start.x && y === data.start.y) && 
                        !(x === data.exit.x && y === data.exit.y)) {
                        data.tiles.push({
                            x: x,
                            y: y,
                            type: 'wall',
                            solid: true
                        });
                    }
                }
            }
        }

        // Add platforms
        if (levelNum >= 2) {
            data.tiles.push({ x: 3, y: 3, type: 'floor1', solid: true });
            data.tiles.push({ x: 4, y: 3, type: 'floor1', solid: true });
            data.tiles.push({ x: 5, y: 3, type: 'floor1', solid: true });
        }

        // Add coins
        for (let i = 0; i < levelNum * 3; i++) {
            const angle = (i / (levelNum * 3)) * Math.PI * 2;
            const radius = Math.floor(size / 3);
            const cx = Math.floor(size / 2);
            const cy = Math.floor(size / 2);
            const x = cx + Math.floor(Math.cos(angle) * radius);
            const y = cy + Math.floor(Math.sin(angle) * radius);
            
            // Make sure coin is on a solid tile
            const existingTile = data.tiles.find(t => t.x === x && t.y === y && t.solid);
            if (existingTile) {
                data.objects.push({ x: x, y: y, type: 'coin', collected: false });
            }
        }

        // Add enemies
        if (levelNum >= 1) {
            data.enemies.push({ x: 2, y: 2, type: 'drone', patrol: [{x: 2, y: 2}, {x: 4, y: 2}] });
        }
        if (levelNum >= 2) {
            data.enemies.push({ x: 5, y: 5, type: 'blob', patrol: [{x: 5, y: 5}, {x: 5, y: 7}] });
        }

        // Add exit portal
        data.objects.push({ x: data.exit.x, y: data.exit.y, type: 'portal' });

        return data;
    }

    createWorld() {
        this.tileGroup = this.add.group();
        this.objectGroup = this.add.group();
        this.enemyGroup = this.add.group();
        this.effectGroup = this.add.group();

        // Draw tiles
        this.levelData.tiles.forEach(tile => {
            this.createTile(tile.x, tile.y, tile.type, tile.solid);
        });
    }

    createTile(x, y, type, solid) {
        const isoPos = IsoUtils.cartToIso(x, y);
        
        let frame = 0;
        switch(type) {
            case 'floor1': frame = 0; break;
            case 'floor2': frame = 1; break;
            case 'wall': frame = 2; break;
            case 'pipe': frame = 3; break;
            default: frame = 0;
        }

        const tile = this.add.sprite(isoPos.x, isoPos.y, 'tiles', frame);
        tile.setDepth(IsoUtils.getDepth(x, y));
        tile.setData({ x: x, y: y, type: type, solid: solid, isoX: isoPos.x, isoY: isoPos.y });
        
        if (solid) {
            tile.setData('collidable', true);
        }
        
        this.tileGroup.add(tile);
        return tile;
    }

    createPlayer() {
        const start = this.levelData.start;
        const isoPos = IsoUtils.cartToIso(start.x, start.y, 0);
        
        this.player = this.physics.add.sprite(isoPos.x, isoPos.y, 'player');
        this.player.setDepth(IsoUtils.getDepth(start.x, start.y) + 1);
        this.player.setData({
            x: start.x,
            y: start.y,
            cartX: start.x,
            cartY: start.y,
            speed: CONFIG.playerSpeed,
            jumping: false,
            canJump: false,
            health: 3,
            invulnerable: false,
            invulnerableTimer: 0
        });
        
        this.player.setCollideWorldBounds(true);
        this.player.setGravityY(CONFIG.gravity);
        
        // Player animations
        this.player.play('player_idle');
        
        // Shadow
        this.playerShadow = this.add.sprite(isoPos.x + 8, isoPos.y + 16, 'tiles', 0);
        this.playerShadow.setDepth(IsoUtils.getDepth(start.x, start.y));
        this.playerShadow.setAlpha(0.5);
        this.playerShadow.setTint(0x000000);
        this.playerShadow.setScale(0.8);
        
        this.playerGroup = this.add.group([this.player, this.playerShadow]);
    }

    createObjects() {
        this.levelData.objects.forEach(obj => {
            this.createObject(obj);
        });
    }

    createObject(data) {
        const isoPos = IsoUtils.cartToIso(data.x, data.y, 0);
        
        let sprite, frame = 0;
        
        switch(data.type) {
            case 'coin':
                sprite = this.physics.add.sprite(isoPos.x, isoPos.y, 'objects', 0);
                sprite.play('core_spin');
                sprite.setData({ ...data, collected: false });
                break;
            case 'portal':
                sprite = this.add.sprite(isoPos.x, isoPos.y, 'objects', 4);
                sprite.play('portal_spin');
                sprite.setData({ ...data });
                break;
            default:
                sprite = this.add.sprite(isoPos.x, isoPos.y, 'objects', 0);
                sprite.setData({ ...data });
        }
        
        sprite.setDepth(IsoUtils.getDepth(data.x, data.y) + 1);
        sprite.setData('cartX', data.x);
        sprite.setData('cartY', data.y);
        
        this.objectGroup.add(sprite);
        return sprite;
    }

    createEnemies() {
        this.levelData.enemies.forEach(enemyData => {
            this.createEnemy(enemyData);
        });
    }

    createEnemy(data) {
        const startPos = data.patrol[0];
        const isoPos = IsoUtils.cartToIso(startPos.x, startPos.y, 0);
        
        let frame = 0;
        let animKey = 'drone_move';
        
        switch(data.type) {
            case 'drone':
                frame = 0;
                animKey = 'drone_move';
                break;
            case 'blob':
                frame = 4;
                animKey = 'blob_move';
                break;
        }
        
        const enemy = this.physics.add.sprite(isoPos.x, isoPos.y, 'enemies', frame);
        enemy.play(animKey);
        enemy.setDepth(IsoUtils.getDepth(startPos.x, startPos.y) + 1);
        enemy.setData({
            ...data,
            cartX: startPos.x,
            cartY: startPos.y,
            currentPatrolIndex: 0,
            patrolTimer: 0,
            patrolSpeed: 1,
            direction: 1,
            health: 1
        });
        
        this.enemyGroup.add(enemy);
        return enemy;
    }

    createUI() {
        // Score
        this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, {
            font: '20px monospace',
            fill: '#00ff00'
        });
        this.scoreText.setDepth(1000);
        
        // Time
        this.timeText = this.add.text(16, 48, `Time: ${this.timeLeft}s`, {
            font: '20px monospace',
            fill: '#00ffff'
        });
        this.timeText.setDepth(1000);
        
        // Level
        this.levelText = this.add.text(CONFIG.width - 150, 16, `Level: ${this.currentLevel}`, {
            font: '20px monospace',
            fill: '#ff00ff'
        });
        this.levelText.setDepth(1000);
        
        // Coins
        this.coinText = this.add.text(CONFIG.width - 150, 48, `Cores: ${this.coinsCollected}/${this.totalCoins}`, {
            font: '20px monospace',
            fill: '#ffff00'
        });
        this.coinText.setDepth(1000);
        
        // Touch controls placeholder
        if (this.sys.game.device.os.desktop === false) {
            this.add.rectangle(CONFIG.width - 100, CONFIG.height - 50, 80, 80, 0x333333, 0.5)
                .setDepth(1000);
            this.add.text(CONFIG.width - 100, CONFIG.height - 50, 'JUMP', {
                font: '16px monospace',
                fill: '#ffffff'
            }).setOrigin(0.5).setDepth(1001);
        }
    }

    createControls() {
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Touch controls for mobile
        if (this.sys.game.device.os.desktop === false) {
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        // Create touch zones
        const touch = this.input;
        
        // Left side for movement
        const moveZone = this.add.zone(0, 0, CONFIG.width / 2, CONFIG.height)
            .setInteractive()
            .setDepth(1000)
            .setAlpha(0.01);
        
        // Right side for jump
        const jumpZone = this.add.zone(CONFIG.width / 2, 0, CONFIG.width / 2, CONFIG.height)
            .setInteractive()
            .setDepth(1000)
            .setAlpha(0.01);
        
        let touchX = 0, touchY = 0;
        let isTouching = false;
        
        moveZone.on('pointerdown', (pointer) => {
            isTouching = true;
            touchX = pointer.x;
            touchY = pointer.y;
        });
        
        moveZone.on('pointermove', (pointer) => {
            if (isTouching) {
                touchX = pointer.x;
                touchY = pointer.y;
            }
        });
        
        moveZone.on('pointerup', () => {
            isTouching = false;
            this.touchMove = { x: 0, y: 0 };
        });
        
        jumpZone.on('pointerdown', () => {
            this.touchJump = true;
        });
        
        jumpZone.on('pointerup', () => {
            this.touchJump = false;
        });
        
        // Store touch state
        this.touchMove = { x: 0, y: 0 };
        this.touchJump = false;
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, CONFIG.width * 2, CONFIG.height * 2);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    setupCollisions() {
        // Player vs tiles
        this.physics.add.collider(this.player, this.tileGroup, (player, tile) => {
            const tileData = tile.getData();
            if (tileData.solid) {
                this.handleTileCollision(player, tileData);
            }
        });
        
        // Player vs coins
        this.physics.add.overlap(this.player, this.objectGroup, (player, obj) => {
            const objData = obj.getData();
            if (objData.type === 'coin' && !objData.collected) {
                this.collectCoin(obj);
            } else if (objData.type === 'portal') {
                this.reachPortal(obj);
            }
        });
        
        // Player vs enemies
        this.physics.add.collider(this.player, this.enemyGroup, (player, enemy) => {
            this.handleEnemyCollision(player, enemy);
        });
    }

    handleTileCollision(player, tileData) {
        const playerData = player.getData();
        
        // Check if player is on top of tile
        if (player.body.velocity.y > 0 && player.body.bottom <= tileData.isoY + 32) {
            playerData.canJump = true;
            playerData.jumping = false;
            
            // Snap player to tile top in cartesian space
            playerData.cartX = tileData.x;
            playerData.cartY = tileData.y;
            playerData.x = tileData.x;
            playerData.y = tileData.y;
            
            // Update position
            const isoPos = IsoUtils.cartToIso(tileData.x, tileData.y, 0);
            player.setPosition(isoPos.x, isoPos.y);
            this.playerShadow.setPosition(isoPos.x + 8, isoPos.y + 16);
            player.setDepth(IsoUtils.getDepth(tileData.x, tileData.y) + 1);
        }
    }

    collectCoin(coin) {
        if (coin.getData('collected')) return;
        
        coin.setData('collected', true);
        coin.play('collect'); // Will use coin animation
        this.score += 100;
        this.coinsCollected++;
        this.scoreText.setText(`Score: ${this.score}`);
        this.coinText.setText(`Cores: ${this.coinsCollected}/${this.totalCoins}`);
        
        if (window.PIPE_RUNNER this.sound.play('collect');this.sound.play('collect'); window.PIPE_RUNNER.collectSound) window.PIPE_RUNNER.collectSound();
        
        // Remove coin after animation
        this.time.delayedCall(300, () => {
            coin.destroy();
        });
    }

    reachPortal(portal) {
        if (this.victory || this.gameOver) return;
        
        this.victory = true;
        this.gameOver = true;
        
        if (window.PIPE_RUNNER this.sound.play('complete');this.sound.play('complete'); window.PIPE_RUNNER.completeSound) window.PIPE_RUNNER.completeSound();
        
        // Stop timer
        if (this.timer) this.timer.destroy();
        
        // Calculate bonus
        const timeBonus = Math.floor(this.timeLeft * 10);
        const coinBonus = this.coinsCollected * 50;
        const totalBonus = timeBonus + coinBonus;
        
        this.score += totalBonus;
        this.scoreText.setText(`Score: ${this.score} + ${totalBonus} BONUS`);
        
        // Fade out and go to level complete
        this.cameras.main.fadeOut(1000, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                this.scene.start('SceneLevelComplete', {
                    level: this.currentLevel,
                    score: this.score,
                    timeLeft: this.timeLeft,
                    coins: this.coinsCollected,
                    totalCoins: this.totalCoins
                });
            }
        });
    }

    handleEnemyCollision(player, enemy) {
        if (this.gameOver) return;
        
        const playerData = player.getData();
        const enemyData = enemy.getData();
        
        // Check if player is falling on enemy (jump attack)
        if (player.body.velocity.y > 0 && 
            player.body.bottom <= enemy.body.top + 10 &&
            Math.abs(player.x - enemy.x) < 20) {
            
            // Player jumps on enemy
            enemyData.health--;
            playerData.canJump = true;
            playerData.jumping = false;
            
            // Bounce player
            player.setVelocityY(-200);
            
            // Hurt enemy
            if (window.PIPE_RUNNER this.sound.play('hurt');this.sound.play('hurt'); window.PIPE_RUNNER.hurtSound) window.PIPE_RUNNER.hurtSound();
            enemy.play('player_hurt'); // Reuse animation
            
            if (enemyData.health <= 0) {
                // Kill enemy
                enemy.destroy();
                this.score += 200;
                this.scoreText.setText(`Score: ${this.score}`);
            }
        } else if (!playerData.invulnerable) {
            // Player gets hurt
            playerData.health--;
            playerData.invulnerable = true;
            playerData.invulnerableTimer = 0;
            
            if (window.PIPE_RUNNER this.sound.play('hurt');this.sound.play('hurt'); window.PIPE_RUNNER.hurtSound) window.PIPE_RUNNER.hurtSound();
            player.play('player_hurt');
            
            // Blink effect
            this.tweens.add({
                targets: player,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 3
            });
            
            if (playerData.health <= 0) {
                this.gameOver = true;
                if (window.PIPE_RUNNER this.sound.play('hurt');this.sound.play('hurt'); window.PIPE_RUNNER.hurtSound) window.PIPE_RUNNER.hurtSound();
                
                this.cameras.main.shake(500, 0.05);
                this.time.delayedCall(1000, () => {
                    this.scene.start('SceneGameOver', {
                        level: this.currentLevel,
                        score: this.score
                    });
                });
            }
        }
    }

    startTimer() {
        this.timeLeft = 120;
        this.timeText.setText(`Time: ${this.timeLeft}s`);
        
        if (this.timer) this.timer.destroy();
        
        this.timer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.timeText.setText(`Time: ${this.timeLeft}s`);
                
                if (this.timeLeft <= 0) {
                    this.gameOver = true;
                    if (window.PIPE_RUNNER this.sound.play('hurt');this.sound.play('hurt'); window.PIPE_RUNNER.hurtSound) window.PIPE_RUNNER.hurtSound();
                    this.cameras.main.shake(500, 0.05);
                    this.time.delayedCall(1000, () => {
                        this.scene.start('SceneGameOver', {
                            level: this.currentLevel,
                            score: this.score
                        });
                    });
                }
            },
            loop: true
        });
    }

    update(time, delta) {
        if (this.gameOver) return;
        
        const playerData = this.player.getData();
        
        // Handle invulnerability timer
        if (playerData.invulnerable) {
            playerData.invulnerableTimer += delta;
            if (playerData.invulnerableTimer >= 2000) {
                playerData.invulnerable = false;
                playerData.invulnerableTimer = 0;
                this.player.clearAlpha();
            }
        }
        
        // Movement
        let moveX = 0;
        let moveY = 0;
        
        // Keyboard input
        if (this.cursors.left.isDown) moveX = -1;
        if (this.cursors.right.isDown) moveX = 1;
        if (this.cursors.up.isDown) moveY = -1;
        if (this.cursors.down.isDown) moveY = 1;
        
        // Touch input
        if (this.touchMove) {
            if (this.touchMove.x < -10) moveX = -1;
            if (this.touchMove.x > 10) moveX = 1;
            if (this.touchMove.y < -10) moveY = -1;
            if (this.touchMove.y > 10) moveY = 1;
        }
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }
        
        // Calculate target cartesian position
        const targetCartX = playerData.cartX + moveX * (delta / 1000) * 5;
        const targetCartY = playerData.cartY + moveY * (delta / 1000) * 5;
        
        // Check if target position is valid (on a solid tile)
        const targetTile = this.findTileAt(targetCartX, targetCartY);
        
        if (targetTile && targetTile.solid) {
            playerData.cartX = targetCartX;
            playerData.cartY = targetCartY;
            playerData.x = Math.round(targetCartX);
            playerData.y = Math.round(targetCartY);
            
            // Update player position in isometric space
            const isoPos = IsoUtils.cartToIso(playerData.x, playerData.y, 0);
            this.player.setPosition(isoPos.x, isoPos.y);
            this.playerShadow.setPosition(isoPos.x + 8, isoPos.y + 16);
            this.player.setDepth(IsoUtils.getDepth(playerData.x, playerData.y) + 1);
            this.playerShadow.setDepth(IsoUtils.getDepth(playerData.x, playerData.y));
            
            // Update animation
            if (moveX !== 0 || moveY !== 0) {
                this.player.play('player_run');
                // Flip based on direction
                if (moveX < 0) {
                    this.player.setFlipX(true);
                } else if (moveX > 0) {
                    this.player.setFlipX(false);
                }
            } else {
                this.player.play('player_idle');
            }
        }
        
        // Jumping
        if ((this.cursors.space.isDown || this.touchJump) && playerData.canJump && !playerData.jumping) {
            playerData.jumping = true;
            playerData.canJump = false;
            
            if (window.PIPE_RUNNER this.sound.play('jump');this.sound.play('jump'); window.PIPE_RUNNER.jumpSound) window.PIPE_RUNNER.jumpSound();
            this.player.play('player_jump');
            
            // Calculate jump direction based on current movement
            const jumpIsoPos = IsoUtils.cartToIso(playerData.x + moveX, playerData.y + moveY, -1);
            
            this.tweens.add({
                targets: this.player,
                x: jumpIsoPos.x,
                y: jumpIsoPos.y,
                duration: 300,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    playerData.jumping = false;
                    // Check if landed on tile
                    const newTile = this.findTileAt(Math.round(playerData.x + moveX), Math.round(playerData.y + moveY));
                    if (newTile && newTile.solid) {
                        playerData.cartX = Math.round(playerData.x + moveX);
                        playerData.cartY = Math.round(playerData.y + moveY);
                        playerData.x = playerData.cartX;
                        playerData.y = playerData.cartY;
                        playerData.canJump = true;
                    }
                }
            });
            
            this.tweens.add({
                targets: this.playerShadow,
                x: jumpIsoPos.x + 8,
                y: jumpIsoPos.y + 16,
                duration: 300,
                ease: 'Sine.easeOut'
            });
        }
        
        // Reset jump input
        this.touchJump = false;
        
        // Update enemies
        this.enemyGroup.getChildren().forEach(enemy => {
            this.updateEnemy(enemy, delta);
        });
    }

    findTileAt(cartX, cartY) {
        const x = Math.floor(cartX);
        const y = Math.floor(cartY);
        
        for (let i = 0; i < this.tileGroup.getChildren().length; i++) {
            const tile = this.tileGroup.getChildren()[i];
            const tileData = tile.getData();
            if (tileData.x === x && tileData.y === y) {
                return tileData;
            }
        }
        return null;
    }

    updateEnemy(enemy, delta) {
        const enemyData = enemy.getData();
        const patrol = enemyData.patrol;
        const currentIndex = enemyData.currentPatrolIndex;
        const nextIndex = (currentIndex + 1) % patrol.length;
        const currentPos = patrol[currentIndex];
        const nextPos = patrol[nextIndex];
        
        // Move towards next patrol point
        enemyData.patrolTimer += delta;
        const moveSpeed = enemyData.patrolSpeed * (delta / 1000);
        
        const dx = nextPos.x - currentPos.x;
        const dy = nextPos.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const progress = enemyData.patrolTimer * moveSpeed / distance;
            
            if (progress >= 1) {
                // Reached next point
                enemyData.currentPatrolIndex = nextIndex;
                enemyData.patrolTimer = 0;
                enemyData.cartX = nextPos.x;
                enemyData.cartY = nextPos.y;
            } else {
                // Moving towards next point
                enemyData.cartX = currentPos.x + dx * progress;
                enemyData.cartY = currentPos.y + dy * progress;
            }
            
            // Update position
            const isoPos = IsoUtils.cartToIso(enemyData.cartX, enemyData.cartY, 0);
            enemy.setPosition(isoPos.x, isoPos.y);
            enemy.setDepth(IsoUtils.getDepth(enemyData.cartX, enemyData.cartY) + 1);
            
            // Flip based on direction
            if (dx < 0) {
                enemy.setFlipX(true);
            } else if (dx > 0) {
                enemy.setFlipX(false);
            }
        }
    }
}
