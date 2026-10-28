/* global Phaser, COIN_DASH */
class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const c = COIN_DASH;
    const style = { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 };
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.rectangle(c.width / 2, c.height / 2, 680, 340, 0x0a1120, 0.95);
    this.text = this.add.text(c.width / 2, c.height / 2,
      'COIN DASH\n\nPress 1 for single player\nPress 2 for two players', style).setOrigin(0.5);
    this.twoPlayerHelp = false;
    this.input.keyboard.on('keydown', (event) => {
      if (!this.twoPlayerHelp && event.key === '1') this.scene.start('CoinDash', { mode: 1 });
      else if (!this.twoPlayerHelp && event.key === '2') this.showTwoPlayerHelp();
      else if (this.twoPlayerHelp && event.code === 'Space') this.scene.start('CoinDash', { mode: 2 });
    });
  }

  showTwoPlayerHelp() {
    this.twoPlayerHelp = true;
    this.text.setFontSize(20).setText('TWO PLAYERS\n\nPlayer 1: arrow keys\n'
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
    const roundSeconds = this.mode === 2 ? c.twoPlayerSeconds : c.roundSeconds;
    this.deadline = this.time.now + roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
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
      this.hud.setText(`Coins: ${this.players[0].score}                       Time: ${seconds}s`);
    }
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    let summary = `${this.players[0].score} coins collected`;
    if (this.mode === 2) {
      const [p1, p2] = this.players.map(p => p.score);
      const result = p1 === p2 ? "It's a draw!" : `Player ${p1 > p2 ? 1 : 2} wins!`;
      summary = `${result}\nP1: ${p1} coins · P2: ${p2} coins`;
    }
    this.add.rectangle(c.width / 2, c.height / 2, 560, 240, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${summary}\nR: play again · M: menu`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
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
