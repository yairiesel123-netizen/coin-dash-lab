// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  twoPlayerSeconds: 60,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  highScoreKey: 'coinDash.highScore',
  backgroundKey: 'coinDash.background',
  colors: { background: 0x0b1328, player: 0x50f4df, player2: 0xc792ea, coin: 0xffd66b, drone: 0xff638f,
    recordBackground: 0x3b2a5c }
};
