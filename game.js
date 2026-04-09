const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 360,
        height: 640
    },
    backgroundColor: '#0a0a1a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false 
        }
    },
    scene: {
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Переменные
let player;
let movingLeft = false;
let movingRight = false;
let score = 0;
let scoreText;
let isDead = false; // Флаг смерти, чтобы отключить управление
let movingPlatforms = []; // Список всех движущихся платформ

function create() {
    isDead = false;
    movingPlatforms = []; // Очищаем список при рестарте

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
    }

    // --- 1. ГЕНЕРАЦИЯ ТЕКСТУРЫ ДЛЯ ФЕЙЕРВЕРКА ---
    // Phaser требует картинку для частиц, мы рисуем ее кодом (маленький квадрат)
    let graphics = this.add.graphics();
    graphics.fillStyle(0x00aaff, 1);
    graphics.fillRect(0, 0, 6, 6);
    graphics.generateTexture('spark', 6, 6);
    graphics.destroy(); // Удаляем кисть, текстура сохранилась в памяти

    // --- 2. КАРТА УРОВНЯ (ГРИД) ---
    // Размер одного блока будет 40x40 пикселей (360 ширина / 9 блоков)
    const levelMap = [
        "         ", // 0
        "         ", // 1
        "         ", // 2
        "         ", // 3
        "      3  ", // 4  (Цель - 3)
        "    111  ", // 5  (Обычный пол - 1)
        "         ", // 6
        "  4      ", // 7  (Движущаяся платформа - 4)
        "         ", // 8
        "         ", // 9
        " 11      ", // 10
        "         ", // 11
        "         ", // 12
        "      2  ", // 13 (Шипы - 2)
        "111111111"  // 14
    ];

    let platforms = this.physics.add.staticGroup();
    let dangers = this.physics.add.staticGroup();
    let cells = this.physics.add.staticGroup();

    // Цикл: перебираем строки и символы в карте
    for (let y = 0; y < levelMap.length; y++) {
        for (let x = 0; x < levelMap[y].length; x++) {
            let char = levelMap[y][x];
            let posX = x * 40 + 20; // +20 чтобы центр блока был по сетке
            let posY = y * 40 + 20;

            if (char === '1') {
                platforms.add(this.add.rectangle(posX, posY, 40, 40, 0x004400));
            } else if (char === '2') {
                dangers.add(this.add.rectangle(posX, posY, 40, 40, 0xff0000));
            } else if (char === '3') {
                cells.add(this.add.rectangle(posX, posY, 20, 20, 0xffff00));
            } else if (char === '4') {
                // Движущаяся платформа (особая физика)
                let mPlatform = this.add.rectangle(posX, posY, 80, 20, 0x008800);
                this.physics.add.existing(mPlatform);
                mPlatform.body.setAllowGravity(false); // Не падает
                mPlatform.body.setImmovable(true);     // Не прогибается под игроком
                mPlatform.body.setVelocityX(100);      // Едет вправо со старта
                movingPlatforms.push(mPlatform);       // Запоминаем ее
            }
        }
    }

    // --- 3. СОЗДАЕМ ИГРОКА ---
    player = this.add.rectangle(40, 450, 30, 30, 0x00aaff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // --- 4. НАСТРОЙКА СТОЛКНОВЕНИЙ ---
    this.physics.add.collider(player, platforms);
    
    // Столкновение с движущимися платформами
    movingPlatforms.forEach(plat => {
        this.physics.add.collider(player, plat);
    });

    // Сбор ячейки
    this.physics.add.overlap(player, cells, (p, cell) => {
        cell.destroy(); 
        score += 1;
        scoreText.setText('Заряд: ' + score + '/3');
    }, null, this);

    // --- 5. ЭМИТТЕР ЧАСТИЦ И СМЕРТЬ ---
    let particleEmitter = this.add.particles(0, 0, 'spark', {
        speed: { min: 100, max: 400 },
        angle: { min: 0, max: 360 },
        gravityY: 600,
        lifespan: 800,
        quantity: 40,   // 40 искр за раз
        emitting: false // Выключен, пока не позовем
    });

    this.physics.add.overlap(player, dangers, () => {
        if (isDead) return; // Если уже умерли, игнорируем
        isDead = true;      // Блокируем управление
        score = 0;          // Сбрасываем счет
        
        player.setVisible(false); // Прячем героя
        player.body.setVelocity(0, 0); // Останавливаем его
        player.body.setAllowGravity(false);

        // Взрыв фейерверка в координатах игрока!
        particleEmitter.emitParticleAt(player.x, player.y);

        // Ждем 1 секунду и перезапускаем сцену
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }, null, this);

    scoreText = this.add.text(10, 10, 'Заряд: ' + score + '/3', { fontSize: '20px', fill: '#00aaff' });

    // --- 6. МОБИЛЬНЫЕ КНОПКИ ---
    let btnLeft = this.add.rectangle(60, 600, 80, 60, 0x333333).setInteractive();
    btnLeft.on('pointerdown', () => movingLeft = true);
    btnLeft.on('pointerup', () => movingLeft = false);
    btnLeft.on('pointerout', () => movingLeft = false);

    let btnRight = this.add.rectangle(160, 600, 80, 60, 0x333333).setInteractive();
    btnRight.on('pointerdown', () => movingRight = true);
    btnRight.on('pointerup', () => movingRight = false);
    btnRight.on('pointerout', () => movingRight = false);

    let btnJump = this.add.rectangle(300, 600, 80, 60, 0x333333).setInteractive();
    btnJump.on('pointerdown', () => {
        if (!isDead && player.body.touching.down) {
            player.body.setVelocityY(-650);
        }
    });
}

function update() {
    if (isDead) return; // Если умерли - не двигаемся

    // Управление
    if (movingLeft) {
        player.body.setVelocityX(-200);
    } else if (movingRight) {
        player.body.setVelocityX(200);
    } else {
        player.body.setVelocityX(0);
    }

    // Логика движущихся платформ (заставляем их ездить туда-сюда)
    movingPlatforms.forEach(plat => {
        if (plat.x > 300) {
            plat.body.setVelocityX(-100); // Доехала до правого края - едет влево
        } else if (plat.x < 60) {
            plat.body.setVelocityX(100);  // Доехала до левого края - едет вправо
        }
    });
}