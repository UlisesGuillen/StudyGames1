import { createAnimations } from "./animations.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#fff',
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);

function preload() {
  this.load.image('background', 'assets/scenery/overworld/background.png');
  this.load.image('bush1', 'assets/scenery/overworld/bush1.png');
  this.load.spritesheet('mario', 'assets/entities/mario.png', {
    frameWidth: 18,
    frameHeight: 16
  });
  this.load.spritesheet('goomba', 'assets/entities/overworld/goomba.png', {
    frameWidth: 18,
    frameHeight: 16
  });
  this.load.image('shell', 'assets/entities/fireball-explosion.png'); // Cargar sprite del proyectil
}

function create() {
  // Dimensiones del mapa, que es más grande que la vista de la cámara
  this.mapWidth = 2000;
  this.mapHeight = 2000;

  // Crear el fondo y asegurar que cubre todo el mapa
  this.background = this.add.tileSprite(0, 0, this.mapWidth, this.mapHeight, 'background')
    .setOrigin(0, 0);

  // Definir el tamaño de cada cuarto
  const quarterWidth = this.mapWidth / 2;
  const quarterHeight = this.mapHeight / 2;

  // Elegir el cuarto en el que quieres que aparezca Mario (por ejemplo, el cuarto superior izquierdo)
  const marioQuarterX = quarterWidth / 2;
  const marioQuarterY = quarterHeight / 2;

  // Crear a Mario en el centro del cuarto elegido
  this.mario = this.physics.add.sprite(marioQuarterX, marioQuarterY, 'mario')
    .setOrigin(0.5, 0.5)
    .setCollideWorldBounds(true)
    .setSize(16, 16)
    .setOffset(1, 0);

  // Configurar la cámara para seguir a Mario y limitarse al área del mapa
  this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
  this.cameras.main.startFollow(this.mario);

  // Crear un grupo de enemigos
  this.enemies = this.physics.add.group({
    key: 'goomba',
    repeat: 0, // Inicialmente no hay enemigos
    setXY: { x: 0, y: 0 } // Posición inicial no importa aquí
  });

  // Agregar colisión entre Mario y los enemigos
  this.physics.add.overlap(this.mario, this.enemies, hitEnemy, null, this);

  createAnimations(this);

  // Configurar las teclas de control (WASD)
  this.keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
  });

  // Crear un grupo de proyectiles
  this.projectiles = this.physics.add.group({
    defaultKey: 'shell',
    maxSize: 3
  });

  // Configurar la colisión entre proyectiles y enemigos
  this.physics.add.collider(this.projectiles, this.enemies, hitEnemyWithProjectile, null, this);

  // Animar enemigos y asignarles un comportamiento de movimiento aleatorio
  this.enemies.children.iterate(function (enemy) {
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1); // Hace que los enemigos reboten en los bordes
    enemy.speed = Phaser.Math.Between(50, 100); // Velocidad aleatoria de cada enemigo
  });

  // Crear enemigos continuamente
  this.time.addEvent({
    delay: 1500, // Cada 2 segundos
    callback: createEnemy,
    callbackScope: this,
    loop: true
  });

  // Inicializar puntuación
  this.score = 0;

  // Crear texto para mostrar la puntuación
  this.scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#fff'
  });

  // Hacer que el texto de puntuación siga a la cámara
  this.scoreText.setScrollFactor(0);
}

function update() {
  let isMoving = false;
  let backgroundVelocityX = 0;
  let backgroundVelocityY = 0;

  // Movimiento de Mario y detección de bordes
  if (this.keys.left.isDown && this.mario.x > this.mario.width / 2) {
    this.mario.setVelocityX(-100);
    this.mario.flipX = true;
    backgroundVelocityX = 4; // Mueve el fondo a la derecha
    isMoving = true;
  } else if (this.keys.right.isDown && this.mario.x < this.mapWidth - this.mario.width / 2) {
    this.mario.setVelocityX(100);
    this.mario.flipX = false;
    backgroundVelocityX = -4; // Mueve el fondo a la izquierda
    isMoving = true;
  } else {
    this.mario.setVelocityX(0);
  }

  if (this.keys.up.isDown && this.mario.y > this.mario.height / 2) {
    this.mario.setVelocityY(-100);
    backgroundVelocityY = 4; // Mueve el fondo hacia abajo
    isMoving = true;
  } else if (this.keys.down.isDown && this.mario.y < this.mapHeight - this.mario.height / 2) {
    this.mario.setVelocityY(100);
    backgroundVelocityY = -4; // Mueve el fondo hacia arriba
    isMoving = true;
  } else {
    this.mario.setVelocityY(0);
  }

  // Actualiza la posición del fondo solo si Mario se mueve
  if (isMoving) {
    this.background.tilePositionX -= backgroundVelocityX;
    this.background.tilePositionY -= backgroundVelocityY;
  }

  // Reproduce la animación de caminar solo si se está moviendo
  if (isMoving) {
    if (!this.mario.anims.isPlaying || this.mario.anims.currentAnim.key !== 'mario-walk') {
      this.mario.anims.play('mario-walk', true);
    }
  } else {
    // Verifica si Mario está en un borde
    const isAtLeftEdge = this.mario.x <= this.mario.width / 2;
    const isAtRightEdge = this.mario.x >= this.mapWidth - this.mario.width / 2;
    const isAtTopEdge = this.mario.y <= this.mario.height / 2;
    const isAtBottomEdge = this.mario.y >= this.mapHeight - this.mario.height / 2;

    if (isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge) {
      // Si está en cualquier borde, cambia a la animación de inactividad
      if (!this.mario.anims.isPlaying || this.mario.anims.currentAnim.key !== 'mario-idle') {
        this.mario.anims.play('mario-idle', true);
      }
    } else {
      // Si no está en un borde y no se mueve, sigue la animación de inactividad
      if (!this.mario.anims.isPlaying || this.mario.anims.currentAnim.key !== 'mario-idle') {
        this.mario.anims.play('mario-idle', true);
      }
    }
  }

  // Hacer que cada enemigo siga a Mario
  this.enemies.children.iterate((enemy) => {
    this.physics.moveToObject(enemy, this.mario, enemy.speed);
  });

  // Disparar proyectiles hacia el mouse
  if (this.input.activePointer.isDown) {
    shootProjectile(this);
  }
}

// Función para crear enemigos en ubicaciones aleatorias
function createEnemy() {
  const x = Phaser.Math.Between(0, this.mapWidth);
  const y = Phaser.Math.Between(0, this.mapHeight);

  const enemy = this.enemies.create(x, y, 'goomba');
  enemy.setCollideWorldBounds(true);
  enemy.setBounce(1); // Hace que los enemigos reboten en los bordes
  enemy.speed = Phaser.Math.Between(50, 200); // Velocidad aleatoria de cada enemigo
}

// Función para disparar un proyectil hacia la posición del mouse
function shootProjectile(scene) {
  const pointer = scene.input.activePointer;
  const projectile = scene.projectiles.get(scene.mario.x, scene.mario.y);

  if (projectile) {
    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.setScale(0.5); // Ajustar tamaño del proyectil si es necesario
    projectile.setCollideWorldBounds(true);
    projectile.setBounce(1); // Hacer que el proyectil rebote

    const angle = Phaser.Math.Angle.Between(scene.mario.x, scene.mario.y, pointer.x, pointer.y);
    const speed = 400; // Velocidad del proyectil

    projectile.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Destruir el proyectil después de un tiempo
    scene.time.addEvent({
      delay: 1000,
      callback: () => {
        projectile.setActive(false);
        projectile.setVisible(false);
        projectile.setVelocity(0);
      },
      callbackScope: scene
    });
  }
}

// Función para manejar el contacto entre proyectiles y enemigos
function hitEnemyWithProjectile(projectile, enemy) {
  projectile.setActive(false);
  projectile.setVisible(false);
  projectile.setVelocity(0);
  enemy.destroy(); // Destruir el enemigo

  // Aumentar la puntuación
  this.score += 1;
  this.scoreText.setText('Score: ' + this.score);
}

// Función para manejar el contacto entre Mario y los enemigos
function hitEnemy(mario, enemy) {
  this.scene.restart(); // Reinicia la escena
}
