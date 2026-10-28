/* global Phaser, COIN_DASH */
// Backgrounds are drawn from shapes like everything else; the first one is the default.
const BACKGROUNDS = [
  { id: 'grid', name: 'Night grid', draw: (g, w, h) => {
    g.fillStyle(COIN_DASH.colors.background).fillRect(0, 0, w, h);
    g.lineStyle(1, 0x24334b, 0.45);
    for (let x = 0; x <= w; x += 40) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += 40) g.lineBetween(0, y, w, y);
  } },
  { id: 'stars', name: 'Starfield', draw: (g, w, h) => {
    g.fillStyle(0x05070f).fillRect(0, 0, w, h);
    g.fillStyle(0x3d2c6b, 0.5).fillCircle(w * 0.82, h * 0.78, 70);
    // A fixed seed keeps the same sky every time the background is drawn.
    const rng = new Phaser.Math.RandomDataGenerator(['coin-dash-stars']);
    for (let i = 0; i < 160; i++) {
      g.fillStyle(0xffffff, rng.realInRange(0.25, 1))
        .fillCircle(rng.between(0, w), rng.between(0, h), rng.realInRange(0.5, 1.8));
    }
  } },
  { id: 'ocean', name: 'Deep ocean', draw: (g, w, h) => {
    fillGradient(g, w, h, 0x0b4f6c, 0x01161e);
    g.lineStyle(2, 0x5fa8d3, 0.22);
    for (let row = 30; row < h; row += 50) {
      const points = [];
      for (let x = 0; x <= w; x += 10) points.push({ x, y: row + Math.sin((x + row) / 40) * 6 });
      g.strokePoints(points);
    }
  } },
  { id: 'sunset', name: 'Sunset hills', draw: (g, w, h) => {
    fillGradient(g, w, h, 0x1b0f3a, 0x7a2c55);
    g.fillStyle(0xff9e57, 0.45).fillCircle(w / 2, h * 0.72, 120);
    g.fillStyle(0x12081f).fillPoints([{ x: 0, y: h }, { x: 0, y: h * 0.7 }, { x: w * 0.25, y: h * 0.62 },
      { x: w * 0.5, y: h * 0.74 }, { x: w * 0.78, y: h * 0.6 }, { x: w, y: h * 0.68 }, { x: w, y: h }], true);
  } },
  { id: 'retro', name: 'Retro grid', draw: (g, w, h) => {
    const horizon = h * 0.42;
    fillGradient(g, w, horizon, 0x0d0221, 0x2a0a4a);
    g.fillStyle(0x0d0221).fillRect(0, horizon, w, h - horizon);
    g.lineStyle(1, 0xff2a6d, 0.45);
    for (let x = -w; x <= 2 * w; x += 80) g.lineBetween(w / 2, horizon, x, h);
    for (let step = 1; step <= 10; step++) {
      const y = horizon + (h - horizon) * (step / 10) ** 2;
      g.lineBetween(0, y, w, y);
    }
  } },
  { id: 'meadow', name: 'Meadow', draw: (g, w, h) => {
    g.fillStyle(0x1d3b2a).fillRect(0, 0, w, h);
    g.fillStyle(0x24482f);
    for (let y = 0; y < h; y += 40) for (let x = (y / 40) % 2 * 40; x < w; x += 80) g.fillRect(x, y, 40, 40);
  } }
];

// Vertical gradient from bands, so it looks the same with the WebGL and canvas renderers.
function fillGradient(g, w, h, top, bottom) {
  const from = Phaser.Display.Color.ValueToColor(top);
  const to = Phaser.Display.Color.ValueToColor(bottom);
  const bands = 50;
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, bands - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(0, h * i / bands, w, h / bands + 1);
  }
}

function addBackground(scene, id) {
  const background = BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
  const g = scene.add.graphics().setDepth(-10).setName(background.id);
  background.draw(g, COIN_DASH.width, COIN_DASH.height);
  return g;
}

class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const c = COIN_DASH;
    const style = { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 };
    this.background = addBackground(this, loadBackground());
    this.panel = this.add.rectangle(c.width / 2, c.height / 2, 680, 340, 0x0a1120, 0.95);
    this.text = this.add.text(c.width / 2, c.height / 2, '', style).setOrigin(0.5);
    // The picker sits on the left so the chosen background shows on the right as a preview.
    this.pickerPanel = this.add.rectangle(210, c.height / 2, 380, 440, 0x0a1120, 0.92);
    this.pickerText = this.add.text(40, c.height / 2, '',
      { font: '20px monospace', color: '#ffffff', lineSpacing: 8 }).setOrigin(0, 0.5);
    this.showMain();
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (this.view === 'main') {
        if (key === '1') this.scene.start('CoinDash', { mode: 1 });
        else if (key === '2') this.showTwoPlayerHelp();
        else if (key === 'b') this.showBackgrounds();
      } else if (this.view === 'twoPlayerHelp') {
        if (event.code === 'Space') this.scene.start('CoinDash', { mode: 2 });
      } else if (this.view === 'backgrounds') {
        const choice = BACKGROUNDS[Number(key) - 1];
        if (choice) this.chooseBackground(choice.id);
        else if (key === 'enter' || key === 'escape' || key === 'b') this.showMain();
      }
    });
  }

  setView(view) {
    this.view = view;
    const picking = view === 'backgrounds';
    this.panel.setVisible(!picking);
    this.text.setVisible(!picking);
    this.pickerPanel.setVisible(picking);
    this.pickerText.setVisible(picking);
  }

  showMain() {
    this.setView('main');
    this.text.setFontSize(24).setText('COIN DASH\n\nPress 1 for single player\nPress 2 for two players\n'
      + 'Press B to choose a background');
  }

  showTwoPlayerHelp() {
    this.setView('twoPlayerHelp');
    this.text.setFontSize(20).setText('TWO PLAYERS\n\nPlayer 1: arrow keys\n'
      + 'Player 2: W/S up and down, A/D left and right\n\n'
      + `Collect the most coins in ${COIN_DASH.twoPlayerSeconds} seconds.\n`
      + 'A drone knocks you out, but your coins still count!\n\nPress SPACE to start');
  }

  showBackgrounds() {
    this.setView('backgrounds');
    const current = loadBackground();
    const list = BACKGROUNDS.map((b, i) => `${b.id === current ? '>' : ' '} ${i + 1}. ${b.name}`);
    this.pickerText.setText(['BACKGROUND', '', ...list, '', 'Number: choose', 'Enter: back to menu'].join('\n'));
  }

  chooseBackground(id) {
    saveBackground(id);
    this.background.destroy();
    this.background = addBackground(this, id);
    this.showBackgrounds();
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
    // The scene clock's "now" is stale until its first update (it dates from game boot), so
    // time the round from the game loop or the first round loses the time spent in the menu.
    this.deadline = this.game.loop.time + roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.background = addBackground(this, loadBackground());
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
    // Tint the arena background so the player notices mid-run without stopping play.
    this.add.rectangle(c.width / 2, c.height / 2, c.width, c.height, c.colors.recordBackground, 0.6)
      .setDepth(-5);
    this.cameras.main.flash(400, 255, 209, 102);
    const banner = this.add.text(c.width / 2, 80, 'NEW RECORD!',
      { font: 'bold 32px monospace', color: '#ffd166' }).setOrigin(0.5);
    this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 800,
      onComplete: () => banner.destroy() });
  }

  addPlayer(x, controls, color) {
    const sprite = this.add.rectangle(x, COIN_DASH.height / 2, 24, 24, color);
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
function loadBackground() {
  try { return localStorage.getItem(COIN_DASH.backgroundKey) || BACKGROUNDS[0].id; } catch { return BACKGROUNDS[0].id; }
}
function saveBackground(id) {
  try { localStorage.setItem(COIN_DASH.backgroundKey, id); } catch { /* ignore */ }
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
