// DOM
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
const bgButtons = () => [...document.querySelectorAll('.segBtn[data-bg]')];
const themeButtons = () => [...document.querySelectorAll('.segBtn[data-theme]')];

const acc = document.querySelector('.accordion');
const accBtn = document.getElementById('togglePlaylist');
const playlistEl = document.getElementById('playlist');

let idx = 0;
let sleepTimeout = null;
let deferredPrompt = null;

// Splash
window.addEventListener('load', ()=> setTimeout(()=> splash?.classList.add('hide'), 350));
const sp = document.createElement('style'); sp.textContent = `.splash.hide{opacity:0;pointer-events:none;transition:.4s}`; document.head.appendChild(sp);

// عناصر العناوين داخل عناصر القائمة
items.forEach(el=>{
  if(!el.innerHTML.trim()){
    const t = el.dataset.title || 'مقطع', s = el.dataset.sub || '';
    el.innerHTML = `<div class="tit">${t}</div><div class="sub">${s}</div>`;
  }
});

// أدوات
const fmt = t => { if(!isFinite(t)) return '0:00'; t=Math.max(0,Math.floor(t)); const m=Math.floor(t/60), s=String(t%60).padStart(2,'0'); return `${m}:${s}`; };
function setBg(name){
  document.body.classList.remove('bg-night','bg-dawn','bg-stars');
  const map={night:'bg-night',dawn:'bg-dawn',stars:'bg-stars'};
  document.body.classList.add(map[name]||'bg-night');
  localStorage.setItem('sleep_bg', name);
  bgButtons().forEach(b=>b.classList.toggle('active', b.dataset.bg===name));
}
function setTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('sleep_theme', mode);
  themeButtons().forEach(b=>b.classList.toggle('active', b.dataset.theme===mode));
}

// استعادة تفضيلات
setTheme(localStorage.getItem('sleep_theme')||'dark');
setBg(localStorage.getItem('sleep_bg')||'night');

// إعدادات: فتح/إغلاق
settingsBtn.addEventListener('click', ()=> settingsModal.classList.add('show'));
closeSettings.addEventListener('click', ()=> settingsModal.classList.remove('show'));
settingsModal.addEventListener('click', e=>{ if(e.target===settingsModal) settingsModal.classList.remove('show'); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') settingsModal.classList.remove('show'); });

// أزرار الثيم/الخلفية
document.addEventListener('click', e=>{
  const el = e.target.closest('.segBtn');
  if(!el) return;
  if(el.dataset.bg){ setBg(el.dataset.bg); }
  if(el.dataset.theme){ setTheme(el.dataset.theme); }
});

// Accordion
accBtn.addEventListener('click', ()=>{
  acc.classList.toggle('open');
  accBtn.textContent = acc.classList.contains('open') ? 'إخفاء القائمة' : 'قائمة السور';
});

// تحميل/تشغيل
function load(i){
  idx = (i+items.length)%items.length;
  items.forEach(el=>el.classList.remove('active'));
  const it = items[idx]; it.classList.add('active');
  const src = it.dataset.src, title = it.dataset.title||'', sub = it.dataset.sub||'';
  titleEl.textContent = title; subEl.textContent = sub;
  audio.src = src; audio.loop = loopTrack.checked; audio.load();
  seek.value=0; cur.textContent='0:00'; dur.textContent='0:00';
  if('mediaSession' in navigator){
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist:'تلاوات مختارة', album:'قرآن النوم' });
  }
}
function play(){ audio.play().then(()=>{ playBtn.textContent='⏸'; }).catch(()=>{}); }
function pause(){ audio.pause(); playBtn.textContent='▶️'; }

// أزرار
playBtn.addEventListener('click', ()=> audio.paused?play():pause());
prevBtn.addEventListener('click', ()=>{ load(idx-1); play(); });
nextBtn.addEventListener('click', ()=>{ load(idx+1); play(); });

// ميتاداتا
audio.addEventListener('loadedmetadata', ()=>{ seek.max=Math.floor(audio.duration||0); dur.textContent=fmt(audio.duration); });

// شريط التقدم
let seeking=false;
function applySeek(){ audio.currentTime = Number(seek.value||0); seeking=false; }
seek.addEventListener('input', ()=>{ seeking=true; cur.textContent=fmt(Number(seek.value||0)); });
seek.addEventListener('change', applySeek);
seek.addEventListener('mouseup', applySeek);
seek.addEventListener('touchend', applySeek);
seek.addEventListener('pointerup', applySeek);
seek.addEventListener('touchcancel', ()=>{ seeking=false; });
seek.addEventListener('mouseleave', ()=>{ if(seeking) applySeek(); });
audio.addEventListener('timeupdate', ()=>{
  if(seeking) return;
  const ct=Math.floor(audio.currentTime||0);
  seek.value=ct; cur.textContent=fmt(ct);
  const p=(audio.currentTime/(audio.duration||1))*100;
  seek.style.background=`linear-gradient(90deg, var(--accent) ${p}%, rgba(255,255,255,.12) ${p}%)`;
});

// نهاية المقطع
audio.addEventListener('ended', ()=>{
  if(loopTrack.checked) return;
  if(loopAll.checked){ load(idx+1); play(); } else pause();
});

// الصوت والحفظ
const savedVol=localStorage.getItem('sleep_quran_vol');
audio.volume = savedVol? Number(savedVol): Number(vol.value);
if(savedVol) vol.value = savedVol;
vol.addEventListener('input', ()=>{ audio.volume=Number(vol.value); localStorage.setItem('sleep_quran_vol', vol.value); });

// حفظ التكرار
const savedLoopTrack=localStorage.getItem('sleep_quran_loop_track');
const savedLoopAll=localStorage.getItem('sleep_quran_loop_all');
if(savedLoopTrack!==null) loopTrack.checked = savedLoopTrack==='1';
if(savedLoopAll!==null)   loopAll.checked   = savedLoopAll==='1';
audio.loop = loopTrack.checked;
loopTrack.addEventListener('change', ()=>{ audio.loop=loopTrack.checked; localStorage.setItem('sleep_quran_loop_track', loopTrack.checked?'1':'0'); });
loopAll.addEventListener('change', ()=>{ localStorage.setItem('sleep_quran_loop_all', loopAll.checked?'1':'0'); });

// اختيار من القائمة
items.forEach((el,i)=> el.addEventListener('click', ()=>{ load(i); play(); }));

// مؤقت النوم
sleepTimerSel.addEventListener('change', ()=>{
  if(sleepTimeout){ clearTimeout(sleepTimeout); sleepTimeout=null; }
  const mins=Number(sleepTimerSel.value||0);
  if(mins>0){ sleepTimeout=setTimeout(()=>{ pause(); audio.currentTime=0; }, mins*60*1000); }
});

// أزرار سريعة
playAllBtn.addEventListener('click', ()=>{
  if(!loopAll.checked){ loopAll.checked=true; localStorage.setItem('sleep_quran_loop_all','1'); }
  load(0); play();
});
stopBtn.addEventListener('click', ()=>{ pause(); audio.currentTime=0; });

// Media Session
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', pause);
  navigator.mediaSession.setActionHandler('previoustrack', ()=>{ load(idx-1); play(); });
  navigator.mediaSession.setActionHandler('nexttrack',     ()=>{ load(idx+1); play(); });
  navigator.mediaSession.setActionHandler('seekto', d=>{ if(d.seekTime!=null) audio.currentTime=d.seekTime; });
  const jump=s=>{ audio.currentTime=Math.max(0, Math.min((audio.currentTime||0)+s, audio.duration||Infinity)); };
  navigator.mediaSession.setActionHandler('seekforward',  ()=>jump(10));
  navigator.mediaSession.setActionHandler('seekbackward', ()=>jump(-10));
}

// PWA install
function hideInstallIfStandalone(){
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){ installBtn?.remove(); }
}
window.addEventListener('DOMContentLoaded', hideInstallIfStandalone);
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; installBtn.hidden=false; });
installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBtn.hidden=true; });
window.addEventListener('appinstalled', ()=> installBtn?.remove());
(function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  let unlocked = false, ctx;
  function unlock(){
    if(unlocked || !AC) return;
    try{
      ctx = ctx || new AC();
      const buf = ctx.createBuffer(1,1,22050);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
      if(ctx.state === 'suspended') ctx.resume();
      unlocked = true;
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
    }catch(_){}
  }
  window.addEventListener('touchstart', unlock, {once:true});
  window.addEventListener('click', unlock, {once:true});
})();

// بدء
load(0);
// افتح القائمة مرة واحدة على الشاشات الصغيرة
if (window.innerWidth < 480) { acc.classList.add('open'); }
