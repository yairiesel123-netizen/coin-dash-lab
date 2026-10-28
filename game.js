/* global Phaser, COIN_DASH */
const AVATARS = [
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'bird', label: 'Bird' },
  { key: 'man', label: 'Man' }
];

// Characters are drawn in white once, then tinted with each player's colour.
function createAvatarTextures(scene) {
  if (scene.textures.exists('avatar-rectangle')) return;
  const dark = COIN_DASH.colors.background;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff).fillRect(0, 0, 34, 20);
  g.generateTexture('avatar-rectangle', 34, 20).clear();
  g.fillStyle(0xffffff).fillEllipse(15, 16, 26, 16);
  g.fillTriangle(6, 14, 20, 14, 11, 2);
  g.fillTriangle(27, 13, 33, 16, 27, 19);
  g.fillStyle(dark).fillCircle(22, 13, 2);
  g.generateTexture('avatar-bird', 34, 26).clear();
  g.fillStyle(0xffffff).fillCircle(12, 5, 5);
  g.lineStyle(3, 0xffffff);
  g.lineBetween(12, 10, 12, 21);
  g.lineBetween(3, 14, 21, 14);
  g.lineBetween(12, 20, 5, 30);
  g.lineBetween(12, 20, 19, 30);
  g.generateTexture('avatar-man', 24, 31).destroy();
}

class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const c = COIN_DASH;
    const style = { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 };
    createAvatarTextures(this);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.rectangle(c.width / 2, c.height / 2, 680, 380, 0x0a1120, 0.95);
    this.text = this.add.text(c.width / 2, 110, 'COIN DASH', style).setOrigin(0.5);
    this.choice = [
      this.add.text(c.width / 2, 160, 'YOUR CHOICE', { font: 'bold 20px monospace', color: '#ffd166' })
        .setOrigin(0.5),
      this.add.text(c.width / 2, 300, '\u2190 \u2192 to pick your character',
        { font: '16px monospace', color: '#9fb0c8' }).setOrigin(0.5),
      this.add.text(c.width / 2, 365, 'Press 1 for single player\nPress 2 for two players', style)
        .setOrigin(0.5)
    ];
    this.frame = this.add.rectangle(0, 225, 120, 100).setStrokeStyle(2, c.colors.coin);
    this.choice.push(this.frame);
    AVATARS.forEach((avatar, i) => {
      const x = c.width / 2 + (i - 1) * 150;
      this.choice.push(this.add.image(x, 215, `avatar-${avatar.key}`).setTint(c.colors.player),
        this.add.text(x, 255, avatar.label, { font: '16px monospace', color: '#ffffff' }).setOrigin(0.5));
    });
    this.selectAvatar(Math.max(0, AVATARS.findIndex(a => a.key === this.registry.get('avatar'))));
    this.twoPlayerHelp = false;
    this.input.keyboard.on('keydown', (event) => {
      if (!this.twoPlayerHelp && event.code === 'ArrowLeft') this.selectAvatar(this.selected - 1);
      else if (!this.twoPlayerHelp && event.code === 'ArrowRight') this.selectAvatar(this.selected + 1);
      else if (!this.twoPlayerHelp && event.key === '1') this.scene.start('CoinDash', { mode: 1 });
      else if (!this.twoPlayerHelp && event.key === '2') this.showTwoPlayerHelp();
      else if (this.twoPlayerHelp && event.code === 'Space') this.scene.start('CoinDash', { mode: 2 });
    });
  }

  selectAvatar(index) {
    this.selected = Phaser.Math.Wrap(index, 0, AVATARS.length);
    this.registry.set('avatar', AVATARS[this.selected].key);
    this.frame.x = COIN_DASH.width / 2 + (this.selected - 1) * 150;
  }

  showTwoPlayerHelp() {
    this.twoPlayerHelp = true;
    this.choice.forEach(o => o.setVisible(false));
    this.text.setY(COIN_DASH.height / 2).setFontSize(20).setText('TWO PLAYERS\n\nPlayer 1: arrow keys\n'
      + 'Player 2: W/S up and down, A/D left and right\n\n'
      + `Collect the most coins in ${COIN_DASH.twoPlayerSeconds} seconds.\n`
      + 'A drone knocks you out, but your coins still count!\n\nPress SPACE to start');
  }
}

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  init(data) { this.mode = data.mode || 1; }

  create() {
    const c = COIN_DASH;
    this.finished = false;
    this.highScore = loadHighScore();
    // Only celebrate beating a record that already exists, not the very first coin ever.
    this.recordToBeat = this.highScore;
    this.recordBroken = false;
    const roundSeconds = this.mode === 2 ? c.twoPlayerSeconds : c.roundSeconds;
    this.deadline = this.time.now + roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.background = this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,M');
    const wasd = { up: this.keys.W, down: this.keys.S, left: this.keys.A, right: this.keys.D };
    // Single player accepts both arrows and WASD; in two-player mode each player has one set.
    this.players = this.mode === 2
      ? [this.addPlayer(c.width / 3, [this.cursors], c.colors.player),
        this.addPlayer(c.width * 2 / 3, [wasd], c.colors.player2)]
      : [this.addPlayer(c.width / 2, [this.cursors, wasd], c.colors.player)];
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.players.forEach((player) => {
      this.physics.add.overlap(player.sprite, this.coin, () => {
        if (this.finished) return;
        player.score++;
        // The record is for single-player rounds, which have different rules from two-player ones.
        if (this.mode === 1) this.updateHighScore();
        this.placeCoin();
      });
      this.physics.add.overlap(player.sprite, this.drones, () => {
        if (this.mode === 1) this.finish('A drone caught you!');
        else this.knockOut(player);
      });
    });
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ mode: this.mode }));
    this.input.keyboard.on('keydown-M', () => this.scene.start('Menu'));
  }

  updateHighScore() {
    const score = this.players[0].score;
    if (score <= this.highScore) return;
    this.highScore = score;
    saveHighScore(this.highScore);
    if (!this.recordBroken && this.recordToBeat > 0 && score > this.recordToBeat) {
      this.recordBroken = true;
      this.celebrateRecord();
    }
  }

  celebrateRecord() {
    const c = COIN_DASH;
    // Switch the arena background so the player notices mid-run without stopping play.
    this.background.setFillStyle(c.colors.recordBackground, 1);
    this.cameras.main.flash(400, 255, 209, 102);
    const banner = this.add.text(c.width / 2, 80, 'NEW RECORD!',
      { font: 'bold 32px monospace', color: '#ffd166' }).setOrigin(0.5);
    this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 800,
      onComplete: () => banner.destroy() });
  }

  addPlayer(x, controls, color) {
    createAvatarTextures(this);
    const avatar = this.registry.get('avatar') || AVATARS[0].key;
    const sprite = this.add.image(x, COIN_DASH.height / 2, `avatar-${avatar}`).setTint(color);
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);
    return { sprite, controls, score: 0, out: false };
  }

  // A caught player leaves the field but keeps their coins; the round goes on for the other.
  knockOut(player) {
    if (this.finished || player.out) return;
    player.out = true;
    player.sprite.setVisible(false);
    player.sprite.body.enable = false;
    if (this.players.every(p => p.out)) this.finish('Both players were caught!');
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath a player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (this.players.some(p => !p.out
      && Phaser.Math.Distance.Between(x, y, p.sprite.x, p.sprite.y) < 60));
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const held = (controls, key) => controls.some(set => set[key].isDown);
    for (const player of this.players.filter(p => !p.out)) {
      const dx = Number(held(player.controls, 'right')) - Number(held(player.controls, 'left'));
      const dy = Number(held(player.controls, 'down')) - Number(held(player.controls, 'up'));
      const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
      player.sprite.body.setVelocity(direction.x, direction.y);
    }
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    if (this.mode === 2) {
      const label = (p, i) => `P${i + 1}: ${p.score}${p.out ? ' (OUT)' : ''}`;
      this.hud.setText(`${label(this.players[0], 0)}          Time: ${seconds}s          `
        + label(this.players[1], 1));
    } else {
      this.hud.setText(`Coins: ${this.players[0].score}        Record: ${this.highScore}        Time: ${seconds}s`);
    }
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    let summary = `${this.players[0].score} coins collected${this.recordBroken ? ' - new record!' : ''}\n`
      + `Record: ${this.highScore}`;
    if (this.mode === 2) {
      const [p1, p2] = this.players.map(p => p.score);
      const result = p1 === p2 ? "It's a draw!" : `Player ${p1 > p2 ? 1 : 2} wins!`;
      summary = `${result}\nP1: ${p1} coins · P2: ${p2} coins`;
    }
    this.add.rectangle(c.width / 2, c.height / 2, 560, 260, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${summary}\nR: play again · M: menu`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
// The best score survives page reloads; storage can be unavailable (e.g. private mode).
function loadHighScore() {
  try { return Number(localStorage.getItem(COIN_DASH.highScoreKey)) || 0; } catch { return 0; }
}
function saveHighScore(score) {
  try { localStorage.setItem(COIN_DASH.highScoreKey, String(score)); } catch { /* ignore */ }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [Menu, CoinDash]
});
