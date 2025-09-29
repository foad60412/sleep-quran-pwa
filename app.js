// عناصر DOM
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

let idx = 0;
let sleepTimeout = null;
let deferredPrompt = null;

// توليد عناوين العناصر بصرياً إن كانت فارغة
items.forEach(el=>{
  if(!el.innerHTML.trim()){
    const t = el.dataset.title || 'مقطع';
    const s = el.dataset.sub || '';
    el.innerHTML = `<div class="tit">${t}</div><div class="sub">${s}</div>`;
  }
});

// أدوات مساعدة
function fmt(t){
  if(!isFinite(t)) return '0:00';
  t = Math.max(0, Math.floor(t));
  const m = Math.floor(t/60);
  const s = String(t%60).padStart(2,'0');
  return `${m}:${s}`;
}

function load(i){
  idx = (i+items.length)%items.length;
  items.forEach(el=>el.classList.remove('active'));
  const it = items[idx];
  it.classList.add('active');

  const src = it.dataset.src;
  const title = it.dataset.title || '';
  const sub = it.dataset.sub || '';

  titleEl.textContent = title;
  subEl.textContent = sub;
  audio.src = src;
  audio.loop = loopTrack.checked;
  audio.load();

  // إعادة تصفير الشريط عند تحميل جديد
  seek.value = 0; cur.textContent = '0:00'; dur.textContent = '0:00';

  if('mediaSession' in navigator){
    navigator.mediaSession.metadata = new MediaMetadata({
      title, artist:'تلاوات مختارة', album:'قرآن النوم'
    });
  }
}

function play(){
  audio.play().then(()=>{ playBtn.textContent='⏸'; }).catch(()=>{});
}
function pause(){
  audio.pause();
  playBtn.textContent='▶️';
}

// أزرار
playBtn.addEventListener('click', ()=> audio.paused ? play() : pause());
prevBtn.addEventListener('click', ()=>{ load(idx-1); play(); });
nextBtn.addEventListener('click', ()=>{ load(idx+1); play(); });

// ميتاداتا الصوت
audio.addEventListener('loadedmetadata', ()=>{
  seek.max = Math.floor(audio.duration||0);
  dur.textContent = fmt(audio.duration);
});

// === سلوك شريط التقدّم: لا يعيد للبداية إطلاقًا ===
let seeking = false;

function applySeek(){
  const v = Number(seek.value || 0);
  audio.currentTime = v;      // الانتقال لموضع السحب فقط
  seeking = false;
}

seek.addEventListener('input', ()=>{
  seeking = true;
  cur.textContent = fmt(Number(seek.value||0));
});

seek.addEventListener('change', applySeek);
seek.addEventListener('mouseup', applySeek);
seek.addEventListener('touchend', applySeek);
seek.addEventListener('pointerup', applySeek);
seek.addEventListener('touchcancel', ()=>{ seeking=false; });
seek.addEventListener('mouseleave', ()=>{ if(seeking) applySeek(); });

audio.addEventListener('timeupdate', ()=>{
  if(seeking) return;
  const ct = Math.floor(audio.currentTime||0);
  seek.value = ct;
  cur.textContent = fmt(ct);
  const p = (audio.currentTime/(audio.duration||1))*100;
  seek.style.background = `linear-gradient(90deg, var(--accent) ${p}%, rgba(255,255,255,0.12) ${p}%)`;
});

// نهاية المقطع
audio.addEventListener('ended', ()=>{
  if(loopTrack.checked) return;
  if(loopAll.checked){ load(idx+1); play(); }
  else pause();
});

// الصوت + حفظه
const savedVol = localStorage.getItem('sleep_quran_vol');
if(savedVol!==null){ vol.value = savedVol; audio.volume = Number(savedVol); }
else { audio.volume = Number(vol.value); }
vol.addEventListener('input', ()=>{
  audio.volume = Number(vol.value);
  localStorage.setItem('sleep_quran_vol', vol.value);
});

// حفظ إعدادات التكرار
const savedLoopTrack = localStorage.getItem('sleep_quran_loop_track');
const savedLoopAll   = localStorage.getItem('sleep_quran_loop_all');
if(savedLoopTrack!==null) loopTrack.checked = savedLoopTrack==='1';
if(savedLoopAll!==null)   loopAll.checked   = savedLoopAll==='1';
audio.loop = loopTrack.checked;

loopTrack.addEventListener('change', ()=>{
  audio.loop = loopTrack.checked;
  localStorage.setItem('sleep_quran_loop_track', loopTrack.checked?'1':'0');
});
loopAll.addEventListener('change', ()=>{
  localStorage.setItem('sleep_quran_loop_all', loopAll.checked?'1':'0');
});

// اختيار من القائمة
items.forEach((el,i)=> el.addEventListener('click', ()=>{ load(i); play(); }));

// مؤقّت النوم
sleepTimerSel.addEventListener('change', ()=>{
  if(sleepTimeout){ clearTimeout(sleepTimeout); sleepTimeout=null; }
  const mins = Number(sleepTimerSel.value||0);
  if(mins>0){
    sleepTimeout = setTimeout(()=>{ pause(); audio.currentTime = 0; }, mins*60*1000);
  }
});

// أزرار سريعة
playAllBtn.addEventListener('click', ()=>{
  if(!loopAll.checked){ loopAll.checked = true; localStorage.setItem('sleep_quran_loop_all','1'); }
  load(0); play();
});
stopBtn.addEventListener('click', ()=>{
  pause();
  audio.currentTime = 0;     // إرجاع للبداية فقط عند إيقاف يدوي
});

// Media Session لأزرار الجهاز
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', pause);
  navigator.mediaSession.setActionHandler('previoustrack', ()=>{ load(idx-1); play(); });
  navigator.mediaSession.setActionHandler('nexttrack',     ()=>{ load(idx+1); play(); });
  navigator.mediaSession.setActionHandler('seekto', (d)=>{
    if(d.seekTime!=null) audio.currentTime = d.seekTime;
  });
  // تقديم وترجيع 10 ثواني
  const jump = s => { audio.currentTime = Math.max(0, Math.min((audio.currentTime||0)+s, audio.duration||Infinity)); };
  navigator.mediaSession.setActionHandler('seekforward',  ()=> jump(10));
  navigator.mediaSession.setActionHandler('seekbackward', ()=> jump(-10));
}

// PWA install
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e;
  if(installBtn) installBtn.hidden = false;
});
installBtn?.addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// بدء
load(0);
