/* ===== Quran Sleep PWA — app.js (v15) ===== */

/* ---------- DOM ---------- */
const audio = document.getElementById('audio');
const items = Array.from(document.querySelectorAll('#playlist .item'));
const titleEl = document.getElementById('trackTitle');
const subEl = document.getElementById('trackSub');
const playBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seek = document.getElementById('seek');
const cur = document.getElementById('currentTime');
const dur = document.getElementById('duration');
const loopTrack = document.getElementById('loopTrack');
const loopAll = document.getElementById('loopAll');
const vol = document.getElementById('volume');
const sleepTimerSel = document.getElementById('sleepTimer');
const playAllBtn = document.getElementById('playAllBtn');
const stopBtn = document.getElementById('stopBtn');
const installBtn = document.getElementById('installBtn');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');

const splash = document.getElementById('splash');
const acc = document.querySelector('.accordion');
const accBtn = document.getElementById('togglePlaylist');

/* ---------- State ---------- */
let idx = 0;
let sleepTimeout = null;
let deferredPrompt = null;
let seeking = false;
/* iOS/PWA: إجبار أول إيماءة لبدء التنزيل والتشغيل */
let firstGestureNeeded = true;

/* ---------- Utils ---------- */
const fmt = t => {
  if (!isFinite(t)) return '0:00';
  t = Math.max(0, Math.floor(t));
  const m = Math.floor(t / 60), s = String(t % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function hideSplashNow() {
  if (!splash) return;
  splash.classList.add('hide');
  setTimeout(() => splash.remove?.(), 300);
}

/* ---------- Boot ---------- */
window.addEventListener('load', hideSplashNow);
window.addEventListener('DOMContentLoaded', () => setTimeout(hideSplashNow, 200));

items.forEach(el => {
  if (!el.innerHTML.trim()) {
    const t = el.dataset.title || 'مقطع', s = el.dataset.sub || '';
    el.innerHTML = `<div class="tit">${t}</div><div class="sub">${s}</div>`;
  }
});

/* خلفيات */
function setBg(name) {
  document.body.classList.remove('bg-night', 'bg-dawn', 'bg-stars');
  const map = { night: 'bg-night', dawn: 'bg-dawn', stars: 'bg-stars' };
  document.body.classList.add(map[name] || 'bg-night');
  localStorage.setItem('sleep_bg', name);
  document.querySelectorAll('.segBtn[data-bg]').forEach(b => b.classList.toggle('active', b.dataset.bg === name));
}
setBg(localStorage.getItem('sleep_bg') || 'night');

/* إعدادات */
settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
closeSettings.addEventListener('click', () => settingsModal.classList.remove('show'));
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') settingsModal.classList.remove('show'); });
document.addEventListener('click', e => {
  const el = e.target.closest('.segBtn[data-bg]');
  if (el) setBg(el.dataset.bg);
});

/* Accordion */
accBtn.addEventListener('click', () => {
  acc.classList.toggle('open');
  accBtn.textContent = acc.classList.contains('open') ? 'إخفاء القائمة' : 'قائمة السور';
});

/* ---------- Player ---------- */
function load(i) {
  idx = (i + items.length) % items.length;
  items.forEach(el => el.classList.remove('active'));
  const it = items[idx]; it.classList.add('active');

  const src = it.dataset.src, title = it.dataset.title || '', sub = it.dataset.sub || '';
  titleEl.textContent = title; subEl.textContent = sub;

  audio.pause();
  audio.src = src;                 // إعادة تعيين المصدر
  audio.loop = loopTrack.checked;
  audio.load();                    // إجبار iOS على بدء التحضير

  seek.value = 0; cur.textContent = '0:00'; dur.textContent = '0:00';

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'تلاوات مختارة', album: 'قرآن النوم' });
  }
}

function forcePrimeAudioChain() {
  // يُستدعى داخل الإيماءة الأولى فقط
  try {
    const s = audio.src || (items[idx]?.dataset.src || '');
    audio.pause();
    audio.src = ''; audio.load();   // تفريغ كامل
    audio.src = s;  audio.load();   // إعادة تهيئة المصدر داخل نفس الإيماءة
  } catch (_) {}
}

/* زر التشغيل: يخفي Splash ثم ي priming ثم يشغّل */
playBtn.addEventListener('click', async () => {
  hideSplashNow();

  if (firstGestureNeeded) {
    forcePrimeAudioChain();
    firstGestureNeeded = false;
  }
  try {
    await audio.play();
    playBtn.textContent = '⏸';
  } catch {
    try { audio.muted = true; await audio.play(); audio.muted = false; playBtn.textContent = '⏸'; } catch {}
  }
});

prevBtn.addEventListener('click', () => { load(idx - 1); playBtn.click(); });
nextBtn.addEventListener('click', () => { load(idx + 1); playBtn.click(); });

audio.addEventListener('loadedmetadata', () => {
  seek.max = Math.floor(audio.duration || 0);
  dur.textContent = fmt(audio.duration);
});

/* Seek */
function applySeek() { audio.currentTime = Number(seek.value || 0); seeking = false; }
seek.addEventListener('input', () => { seeking = true; cur.textContent = fmt(Number(seek.value || 0)); });
seek.addEventListener('change', applySeek);
seek.addEventListener('mouseup', applySeek);
seek.addEventListener('touchend', applySeek);
seek.addEventListener('pointerup', applySeek);
seek.addEventListener('touchcancel', () => { seeking = false; });
seek.addEventListener('mouseleave', () => { if (seeking) applySeek(); });

audio.addEventListener('timeupdate', () => {
  if (seeking) return;
  const ct = Math.floor(audio.currentTime || 0);
  seek.value = ct; cur.textContent = fmt(ct);
  const p = (audio.currentTime / (audio.duration || 1)) * 100;
  seek.style.background = `linear-gradient(90deg, var(--accent) ${p}%, rgba(255,255,255,.12) ${p}%)`;
});

audio.addEventListener('ended', () => {
  if (loopTrack.checked) return;
  if (loopAll.checked) { load(idx + 1); playBtn.click(); } else { audio.pause(); playBtn.textContent = '▶️'; }
});

/* حجم الصوت */
const savedVol = localStorage.getItem('sleep_quran_vol');
if (savedVol != null) { audio.volume = Number(savedVol); if (vol) vol.value = savedVol; }
if (vol) vol.addEventListener('input', () => {
  audio.volume = Number(vol.value);
  localStorage.setItem('sleep_quran_vol', vol.value);
});

/* تكرار */
const savedLoopTrack = localStorage.getItem('sleep_quran_loop_track');
const savedLoopAll = localStorage.getItem('sleep_quran_loop_all');
if (savedLoopTrack !== null) loopTrack.checked = savedLoopTrack === '1';
if (savedLoopAll !== null) loopAll.checked = savedLoopAll === '1';
audio.loop = loopTrack.checked;
loopTrack.addEventListener('change', () => { audio.loop = loopTrack.checked; localStorage.setItem('sleep_quran_loop_track', loopTrack.checked ? '1' : '0'); });
loopAll.addEventListener('change', () => { localStorage.setItem('sleep_quran_loop_all', loopAll.checked ? '1' : '0'); });

/* اختيار من القائمة: يخفي Splash ويُفعّل priming ثم تشغيل */
items.forEach((el, i) => el.addEventListener('click', async () => {
  hideSplashNow();
  load(i);
  if (firstGestureNeeded) { forcePrimeAudioChain(); firstGestureNeeded = false; }
  try { await audio.play(); playBtn.textContent = '⏸'; } catch {}
}));

/* مؤقّت النوم */
sleepTimerSel.addEventListener('change', () => {
  if (sleepTimeout) { clearTimeout(sleepTimeout); sleepTimeout = null; }
  const mins = Number(sleepTimerSel.value || 0);
  if (mins > 0) sleepTimeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; playBtn.textContent = '▶️'; }, mins * 60 * 1000);
});

/* أزرار سريعة */
playAllBtn.addEventListener('click', () => {
  if (!loopAll.checked) { loopAll.checked = true; localStorage.setItem('sleep_quran_loop_all', '1'); }
  load(0); playBtn.click();
});
stopBtn.addEventListener('click', () => { audio.pause(); audio.currentTime = 0; playBtn.textContent = '▶️'; });

/* Media Session */
if ('mediaSession' in navigator) {
  const play = () => playBtn.click();
  const pauseA = () => { audio.pause(); playBtn.textContent = '▶️'; };
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', pauseA);
  navigator.mediaSession.setActionHandler('previoustrack', () => { load(idx - 1); play(); });
  navigator.mediaSession.setActionHandler('nexttrack', () => { load(idx + 1); play(); });
  navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
  const jump = s => { audio.currentTime = Math.max(0, Math.min((audio.currentTime || 0) + s, audio.duration || Infinity)); };
  navigator.mediaSession.setActionHandler('seekforward', () => jump(10));
  navigator.mediaSession.setActionHandler('seekbackward', () => jump(-10));
}

/* WebAudio priming + استئناف عند العودة */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx;
  function unlockAll() {
    try {
      if (AC) {
        ctx = ctx || new AC();
        const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination);
        const o = ctx.createOscillator(); o.frequency.value = 440; o.connect(g); o.start(0); o.stop(ctx.currentTime + 0.01);
        if (ctx.state === 'suspended') ctx.resume();
      }
    } catch {}
  }
  const kick = () => { unlockAll(); window.removeEventListener('touchstart', kick); window.removeEventListener('click', kick); };
  window.addEventListener('touchstart', kick, { passive: true });
  window.addEventListener('click', kick);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx && ctx.state === 'suspended') ctx.resume(); });
})();

/* PWA install */
function hideInstallIfStandalone() {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) { installBtn?.remove(); }
}
window.addEventListener('DOMContentLoaded', hideInstallIfStandalone);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
installBtn?.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.hidden = true; });
window.addEventListener('appinstalled', () => installBtn?.remove());

/* Start */
load(0);
if (window.innerWidth < 480) { acc.classList.add('open'); }
