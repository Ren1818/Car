// Romance PWA — app.js
const envelope = document.getElementById('envelope');
const seal = document.getElementById('seal');
const flap = document.getElementById('flap');
const letter = document.getElementById('letter');
const closeLetter = document.getElementById('closeLetter');
const letterContent = document.getElementById('letterContent');

const audio = document.getElementById('audio');
const playPause = document.getElementById('playPause');
const audioFile = document.getElementById('audioFile');
const lyricsFile = document.getElementById('lyricsFile');
const downloadLink = document.getElementById('downloadLink');
const expandedControls = document.getElementById('expandedControls');
const expandPlayer = document.getElementById('expandPlayer');
const volume = document.getElementById('volume');
const seek = document.getElementById('seek');
const toggleLyrics = document.getElementById('toggleLyrics');
const lyricsPanel = document.getElementById('lyricsPanel');
const lyricsText = document.getElementById('lyricsText');
const downloadLyrics = document.getElementById('downloadLyrics');

let audioObjectURL = null;
let lyricsObjectURL = null;

// Envelope interactions
function openEnvelope(){
  envelope.classList.add('open');
  flap.style.transform = 'rotateX(-180deg)';
  letter.classList.remove('hidden');
  letter.setAttribute('aria-hidden','false');
  // focus inside the letter for accessibility
  setTimeout(()=> letterContent.focus(), 600);
}
function closeEnvelope(){
  envelope.classList.remove('open');
  flap.style.transform = '';
  letter.classList.add('hidden');
  letter.setAttribute('aria-hidden','true');
}
seal.addEventListener('click', openEnvelope);
seal.addEventListener('keydown', (e)=> { if(e.key === 'Enter' || e.key === ' ') openEnvelope() });
closeLetter.addEventListener('click', closeEnvelope);

// Audio controls
playPause.addEventListener('click', ()=>{
  if(audio.paused){ audio.play(); playPause.textContent = '⏸️' }
  else{ audio.pause(); playPause.textContent = '▶️' }
});

audio.addEventListener('play', ()=> playPause.textContent = '⏸️');
audio.addEventListener('pause', ()=> playPause.textContent = '▶️');

audioFile.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(audioObjectURL){ URL.revokeObjectURL(audioObjectURL) }
  audioObjectURL = URL.createObjectURL(file);
  audio.src = audioObjectURL;
  audio.play();
  downloadLink.href = audioObjectURL;
  downloadLink.download = file.name || 'pista.mp3';
});

// Lyrics upload
lyricsFile.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  lyricsText.textContent = text;
  if(lyricsObjectURL){ URL.revokeObjectURL(lyricsObjectURL) }
  const blob = new Blob([text], {type:'text/plain'});
  lyricsObjectURL = URL.createObjectURL(blob);
  downloadLyrics.href = lyricsObjectURL;
  downloadLyrics.download = file.name || 'letra.txt';
  // show lyrics automatically
  lyricsPanel.classList.remove('hidden');
  lyricsPanel.setAttribute('aria-hidden','false');
});

// Expand player
expandPlayer.addEventListener('click', ()=>{
  expandedControls.classList.toggle('hidden');
  expandPlayer.textContent = expandedControls.classList.contains('hidden') ? '🔍' : '❎';
});

// Volume & seek
volume.addEventListener('input', (e)=> audio.volume = e.target.value);
audio.addEventListener('timeupdate', ()=> {
  if(!isNaN(audio.duration)){
    const pct = (audio.currentTime / audio.duration) * 100;
    seek.value = pct;
  }
});
seek.addEventListener('input', (e)=>{
  if(!isNaN(audio.duration)){
    audio.currentTime = (seek.value / 100) * audio.duration;
  }
});

// Toggle lyrics
toggleLyrics.addEventListener('click', ()=>{
  lyricsPanel.classList.toggle('hidden');
  const visible = !lyricsPanel.classList.contains('hidden');
  lyricsPanel.setAttribute('aria-hidden', !visible);
});

// Download link initial default setup (if default file present)
if (audio.src && !downloadLink.href) {
  downloadLink.href = audio.src;
  downloadLink.download = 'pista.mp3';
}

// If default audio file isn't available on the server, generate a short pleasant loop via WebAudio
async function generateDefaultTone(){
  try{
    const sampleRate = 44100;
    const duration = 3; // seconds
    const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440; // A4
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
    const rendered = await offlineCtx.startRendering();

    // convert AudioBuffer to WAV
    const channelData = rendered.getChannelData(0);
    const buffer = new ArrayBuffer(44 + channelData.length * 2);
    const view = new DataView(buffer);
    /* RIFF identifier */ writeString(view, 0, 'RIFF');
    /* file length */ view.setUint32(4, 36 + channelData.length * 2, true);
    /* RIFF type */ writeString(view, 8, 'WAVE');
    /* format chunk identifier */ writeString(view, 12, 'fmt ');
    /* format chunk length */ view.setUint32(16, 16, true);
    /* sample format (raw) */ view.setUint16(20, 1, true);
    /* channel count */ view.setUint16(22, 1, true);
    /* sample rate */ view.setUint32(24, sampleRate, true);
    /* byte rate (sampleRate * blockAlign) */ view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytesPerSample) */ view.setUint16(32, 2, true);
    /* bits per sample */ view.setUint16(34, 16, true);
    /* data chunk identifier */ writeString(view, 36, 'data');
    /* data chunk length */ view.setUint32(40, channelData.length * 2, true);

    // write PCM samples
    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    audio.src = url;
    downloadLink.href = url;
    downloadLink.download = 'default-music.wav';
  }catch(err){
    console.warn('No se pudo generar audio por defecto:', err);
  }
}

function writeString(view, offset, string){
  for (let i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Try to fetch the default-music file; if not available, generate a tone
(async ()=>{
  const defaultPath = audio.getAttribute('src');
  if(!defaultPath) return generateDefaultTone();
  try{
    const resp = await fetch(defaultPath, {method:'GET'});
    if(!resp.ok){
      await generateDefaultTone();
    } else {
      // use the path as-is; ensure download link points to it
      downloadLink.href = defaultPath;
      downloadLink.download = defaultPath.split('/').pop() || 'pista.mp3';
    }
  }catch(e){
    await generateDefaultTone();
  }
})();

// Auto-cargar letra del servidor si existe (assets/entre-el-juego-y-la-vida.txt)
(async function loadServerLyrics(){
  try{
    const resp = await fetch('/assets/entre-el-juego-y-la-vida.txt');
    if(resp.ok){
      const text = await resp.text();
      lyricsText.textContent = text;
      // create downloadable blob for the lyrics
      const blob = new Blob([text], {type:'text/plain'});
      if(lyricsObjectURL) URL.revokeObjectURL(lyricsObjectURL);
      lyricsObjectURL = URL.createObjectURL(blob);
      downloadLyrics.href = lyricsObjectURL;
      downloadLyrics.download = 'entre-el-juego-y-la-vida.txt';
      lyricsPanel.classList.remove('hidden');
      lyricsPanel.setAttribute('aria-hidden','false');
    }
  }catch(e){
    // ignore if file not present or network error
    // console.debug('No server lyrics found', e);
  }
})();

// COUNTER: tiempo desde 15 de julio de 2026
const startDate = new Date('2026-07-15T00:00:00Z'); // UTC
const yearsEl = document.getElementById('years');
const monthsEl = document.getElementById('months');
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

function updateCounter(){
  const now = new Date();
  let y1 = startDate.getUTCFullYear(), m1 = startDate.getUTCMonth(), d1 = startDate.getUTCDate();
  let y2 = now.getUTCFullYear(), m2 = now.getUTCMonth(), d2 = now.getUTCDate();

  // Calculate whole years/months/days using UTC to avoid timezone shifts
  let years = y2 - y1;
  let months = m2 - m1;
  let days = d2 - d1;

  if (days < 0){
    // borrow days from previous month
    const prevMonth = new Date(Date.UTC(y2, m2, 0)); // last day of previous month
    days += prevMonth.getUTCDate();
    months -= 1;
  }
  if (months < 0){
    months += 12;
    years -= 1;
  }

  // time part
  const startTime = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(),
    startDate.getUTCHours(), startDate.getUTCMinutes(), startDate.getUTCSeconds());
  const diffMs = Date.now() - startTime;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  yearsEl.textContent = years;
  monthsEl.textContent = months;
  daysEl.textContent = days;
  hoursEl.textContent = String(hours).padStart(2,'0');
  minutesEl.textContent = String(minutes).padStart(2,'0');
  secondsEl.textContent = String(seconds).padStart(2,'0');
}

updateCounter();
setInterval(updateCounter, 1000);

// PWA: register service worker
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(err => {
    console.warn('SW registration failed:', err);
  });
}
