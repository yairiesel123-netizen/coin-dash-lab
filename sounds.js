// One audio controller for the page: scene restarts do not add listeners or contexts.
(() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let context;
  let muted = false;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-toggle';
  button.setAttribute('aria-label', 'Mute scoring sounds');
  button.setAttribute('aria-pressed', 'false');
  button.textContent = AudioContext ? 'Sound: on · M to mute' : 'Sound unavailable';
  button.disabled = !AudioContext;
  document.querySelector('main').appendChild(button);

  function unlock() {
    if (!AudioContext || muted) return;
    try {
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch (_) {
      // Audio may be blocked by the browser; collecting coins must still work.
    }
  }

  function toggle() {
    if (!AudioContext) return;
    muted = !muted;
    button.textContent = muted ? 'Sound: off · M to unmute' : 'Sound: on · M to mute';
    button.setAttribute('aria-label', muted ? 'Unmute scoring sounds' : 'Mute scoring sounds');
    button.setAttribute('aria-pressed', String(muted));
    if (!muted) unlock();
  }

  button.addEventListener('click', toggle);
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.code === 'KeyM' && !event.repeat) toggle();
    else unlock();
  });

  window.coinDashSounds = {
    collect() {
      if (muted || !context || context.state !== 'running') return;
      try {
        const start = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, start);
        oscillator.frequency.setValueAtTime(1320, start + 0.06);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      } catch (_) {
        // A failed audio device must never interrupt gameplay.
      }
    }
  };
})();
