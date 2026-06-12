/* ===== WebAudio 音效（无音频文件，全部程序生成） ===== */
window.SFX = (() => {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = localStorage.getItem('dyt_muted') === '1';

  // 浏览器自动播放策略：必须在用户手势后创建/恢复 AudioContext
  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type = 'square', vol = 0.5, slideTo = null) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol = 0.4) {
    if (!ctx || muted) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(master);
    src.start();
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('dyt_muted', muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.32;
    return muted;
  }

  return {
    init,
    toggleMute,
    get muted() { return muted; },
    click()      { tone(1200, 0.04, 'square', 0.15); },
    shoot()      { tone(740, 0.06, 'square', 0.12, 420); },
    hit()        { tone(320, 0.04, 'triangle', 0.2); },
    kill()       { tone(220, 0.12, 'square', 0.25, 70); noise(0.08, 0.15); },
    explode()    { noise(0.45, 0.5); tone(90, 0.4, 'sawtooth', 0.3, 40); },
    pickup()     { tone(620, 0.07, 'sine', 0.3); setTimeout(() => tone(930, 0.09, 'sine', 0.3), 70); },
    thesisHurt() { tone(130, 0.25, 'sawtooth', 0.35, 60); },
    playerHurt() { tone(240, 0.1, 'triangle', 0.3, 120); },
    wave()       { [440, 590, 780].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.22), i * 90)); },
    boss()       { tone(75, 0.7, 'sawtooth', 0.4, 55); setTimeout(() => tone(62, 0.7, 'sawtooth', 0.4, 45), 350); },
    gameover()   { [392, 311, 246, 130].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.3), i * 220)); },
  };
})();
