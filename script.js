const EMOTIONS = ["sadness","anger","love","surprise","fear","joy"];
const COLORS = {
  sadness: "#4C6B8A",
  anger:   "#C1443C",
  love:    "#D66B8F",
  surprise:"#8860D0",
  fear:    "#6B6980",
  joy:     "#D6A017"
};
const CONDITIONS = {
  sadness: "Overcast, steady rain",
  anger:   "Storm warning",
  love:    "Warm, clear breeze",
  surprise:"Sudden lightning",
  fear:    "Dense fog",
  joy:     "Full sun"
};

// Arrange 6 emotions evenly around the dial, starting at -90deg (top) going clockwise
const ANGLE_STEP = 360 / EMOTIONS.length;
const ANGLES = {};
EMOTIONS.forEach((e,i)=> ANGLES[e] = -90 + i*ANGLE_STEP);

function drawTicks(){
  const g = document.getElementById('ticks');
  const cx=110, cy=110, rOuter=98, rInner=88, rLabel=72;
  let svg = '';
  EMOTIONS.forEach((e,i)=>{
    const angleDeg = ANGLES[e];
    const rad = angleDeg * Math.PI/180;
    const x1 = cx + rOuter*Math.cos(rad);
    const y1 = cy + rOuter*Math.sin(rad);
    const x2 = cx + rInner*Math.cos(rad);
    const y2 = cy + rInner*Math.sin(rad);
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COLORS[e]}" stroke-width="3" stroke-linecap="round" />`;
    const lx = cx + rLabel*Math.cos(rad);
    const ly = cy + rLabel*Math.sin(rad);
    svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="tick-label">${e}</text>`;
  });
  g.innerHTML = svg;
}
drawTicks();

const entryEl = document.getElementById('entry');
const charcountEl = document.getElementById('charcount');
const analyzeBtn = document.getElementById('analyzeBtn');
const errorLine = document.getElementById('errorLine');
const needle = document.getElementById('needleLine');
const readingEl = document.getElementById('reading');
const scoresBlock = document.getElementById('scoresBlock');
const scoreRowsEl = document.getElementById('scoreRows');
const logEntriesEl = document.getElementById('logEntries');
const apiUrlEl = document.getElementById('apiUrl');

entryEl.addEventListener('input', ()=>{
  charcountEl.textContent = `${entryEl.value.length} character${entryEl.value.length===1?'':'s'}`;
});

function setNeedle(emotion){
  const angle = ANGLES[emotion];
  if(angle !== undefined){
    needle.style.transform = `rotate(${angle}deg)`;
  }
}

function setBackgroundTint(emotion){
  // Subtle wash of the dominant emotion color into the page background
  const color = COLORS[emotion];
  const tint = hexToTintedPaper(color);
  if(tint){ document.body.style.backgroundColor = tint; }
}

function hexToTintedPaper(hex){
  if(!hex){ return null; }
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const baseR=231, baseG=236, baseB=239; // matches --paper
  const mix = (a,b_)=> Math.round(a*0.88 + b_*0.12);
  return `rgb(${mix(baseR,r)}, ${mix(baseG,g)}, ${mix(baseB,b)})`;
}

function renderScores(scores){
  if(!scores || Object.keys(scores).length===0){
    scoresBlock.style.display='none';
    return;
  }
  scoresBlock.style.display='block';
  const sorted = Object.entries(scores).sort((a,b)=> b[1]-a[1]);
  scoreRowsEl.innerHTML = sorted.map(([name,val])=>{
    const pct = Math.round(val*100);
    return `<div class="score-row">
      <span class="name">${name}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%; background:${COLORS[name]||'#B08D57'}"></span></span>
      <span class="pct">${pct}%</span>
    </div>`;
  }).join('');
}

function addLogEntry(text, emotion){
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const short = text.length>60 ? text.slice(0,60)+'…' : text;
  const row = document.createElement('div');
  row.className = 'log-entry';
  row.innerHTML = `<span class="time">${time}</span><span class="txt">"${short}"</span><span class="tag" style="color:${COLORS[emotion]}">${emotion}</span>`;
  logEntriesEl.prepend(row);
  // keep only last 6
  while(logEntriesEl.children.length > 6){
    logEntriesEl.removeChild(logEntriesEl.lastChild);
  }
}

async function analyze(){
  const text = entryEl.value.trim();
  errorLine.style.display = 'none';
  if(!text){
    errorLine.textContent = 'Write something in the logbook first.';
    errorLine.style.display = 'block';
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Reading…';

  try{
    const res = await fetch(apiUrlEl.value, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });

    if(!res.ok){
      throw new Error(`API responded with status ${res.status}`);
    }

    const data = await res.json();
    console.log('API response:', data);
    const emotion = data.emotion;

    setNeedle(emotion);
    setBackgroundTint(emotion);

    const confidence = data.scores && data.scores[emotion] !== undefined
      ? Math.round(data.scores[emotion]*100) + '% confidence'
      : '';

    readingEl.innerHTML = `
      <div class="emotion-name" style="color:${COLORS[emotion]}">${emotion}</div>
      <div class="confidence">${CONDITIONS[emotion] || ''}${confidence ? ' · '+confidence : ''}</div>
    `;

    renderScores(data.scores);
    addLogEntry(text, emotion);

  } catch(err){
    errorLine.textContent = `Couldn't reach the instrument: ${err.message}. Check that the API is running and the endpoint above is correct.`;
    errorLine.style.display = 'block';
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Read the gauge';
  }
}

analyzeBtn.addEventListener('click', analyze);
entryEl.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
    analyze();
  }
});
