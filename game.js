const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 360, height: 640 },
    backgroundColor: '#0a0a1a',
    physics: { default: 'arcade', arcade: { gravity: { y: 1200 } } },
    scene: { create: create, update: update }
};

const game = new Phaser.Game(config);

// Переменные состояния
let player, scoreText, isDead = false, movingPlatforms = [];
let currentLevelIndex = 0; // Номер текущего уровня

// --- СПИСОК УРОВНЕЙ ---
const levels = [
    [ // УРОВЕНЬ 1: Обучение
        "         ",
        "         ",
        "      3  ", // Монетка
        "    111  ",
        "         ",
        "         ",
        "  11     ",
        "         ",
        "     5   ", // ДВЕРЬ (ФИНИШ)
        "111111111"
    ],
    [ // УРОВЕНЬ 2: Опасность
        "      5  ",
        "    111  ",
        "         ",
        "  3      ",
        " 111     ",
        "     222 ", // Шипы
        "         ",
        " 11      ",
        "         ",
        "111111111"
    ],
    [ // УРОВЕНЬ 3: Движение
        " 5       ",
        " 11      ",
        "      4  ", // Платформа
        "         ",
        "    3    ",
        "   111   ",
        "         ",
        " 4       ",
        "         ",
        "111111111"
    ]
];

function create() {
    isDead = false;
    movingPlatforms = [];
    
    // Рисуем текстуру искры (если вдруг забыли)
    let graphics = this.add.graphics();
    graphics.fillStyle(0x00aaff, 1);
    graphics.fillRect(0, 0, 6, 6);
    graphics.generateTexture('spark', 6, 6);
    graphics.destroy();

    const levelMap = levels[currentLevelIndex]; // Берем карту текущего уровня
    let platforms = this.physics.add.staticGroup();
    let dangers = this.physics.add.staticGroup();
    let cells = this.physics.add.staticGroup();
    let door = this.physics.add.staticGroup();

    // Генерация из массива
    for (let y = 0; y < levelMap.length; y++) {
        for (let x = 0; x < levelMap[y].length; x++) {
            let char = levelMap[y][x];
            let px = x * 40 + 20; let py = y * 40 + 20;

            if (char === '1') platforms.add(this.add.rectangle(px, py, 40, 40, 0x004400));
            if (char === '2') dangers.add(this.add.rectangle(px, py, 40, 40, 0xff0000));
            if (char === '3') cells.add(this.add.rectangle(px, py, 20, 20, 0xffff00));
            if (char === '4') {
                let mp = this.add.rectangle(px, py, 80, 20, 0x008800);
                this.physics.add.existing(mp);
                mp.body.setAllowGravity(false).setImmovable(true).setVelocityX(100);
                movingPlatforms.push(mp);
            }
            if (char === '5') door.add(this.add.rectangle(px, py, 30, 50, 0xffffff)); // Белая дверь
        }
    }

    player = this.add.rectangle(40, 560, 30, 30, 0x00aaff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    this.physics.add.collider(player, platforms);
    movingPlatforms.forEach(p => this.physics.add.collider(player, p));

    // Сбор монетки
    this.physics.add.overlap(player, cells, (p, c) => c.destroy());

    // Касание двери - ПЕРЕХОД НА СЛЕДУЮЩИЙ УРОВЕНЬ
    this.physics.add.overlap(player, door, () => {
        currentLevelIndex++; // Прибавляем номер уровня
        if (currentLevelIndex >= levels.length) {
            currentLevelIndex = 0; // Если уровни кончились - на первый
            alert("Поздравляю! Ты прошел все уровни!");
        }
        this.scene.restart();
    });

    // Смерть
    this.physics.add.overlap(player, dangers, () => {
        if (isDead) return;
        isDead = true;
        this.add.particles(player.x, player.y, 'spark', { speed: 200, lifespan: 600, quantity: 30, emitting: false }).explode();
        player.setVisible(false);
        this.time.delayedCall(800, () => this.scene.restart());
    });

    // Кнопки (упрощено для понимания)
    createButton(this, 60, 600, "<-", () => movingLeft = true, () => movingLeft = false);
    createButton(this, 160, 600, "->", () => movingRight = true, () => movingRight = false);
    createButton(this, 300, 600, "UP", () => { if(player.body.touching.down) player.body.setVelocityY(-600) });
}

let movingLeft = false, movingRight = false;

function createButton(scene, x, y, text, downFn, upFn) {
    let btn = scene.add.rectangle(x, y, 70, 50, 0x333333).setInteractive();
    scene.add.text(x-10, y-10, text);
    btn.on('pointerdown', downFn);
    if(upFn) { btn.on('pointerup', upFn); btn.on('pointerout', upFn); }
}

function update() {
    if (isDead) return;
    player.body.setVelocityX(movingLeft ? -200 : (movingRight ? 200 : 0));
    movingPlatforms.forEach(p => {
        if (p.x > 300) p.body.setVelocityX(-100);
        else if (p.x < 60) p.body.setVelocityX(100);
    });
}
