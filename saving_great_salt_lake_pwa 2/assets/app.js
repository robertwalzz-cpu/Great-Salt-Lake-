
const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>Array.from(e.querySelectorAll(s));

const state={data:null,points:0,streak:0,lastCheckIn:null,completed:{},displayName:null,reads:0};

function save(){localStorage.setItem('sgsl_state',JSON.stringify({points:state.points,streak:state.streak,lastCheckIn:state.lastCheckIn,completed:state.completed,displayName:state.displayName,reads:state.reads}))}
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem('sgsl_state')||'{}'))}catch(e){}}

async function fetchData(){const r=await fetch('data/content.json'); state.data=await r.json()}
function dayIndex(){const n=new Date(),s=new Date(n.getFullYear(),0,0);return Math.floor(((n-s)+((s.getTimezoneOffset()-n.getTimezoneOffset())*6e4))/(864e5))}

function navTo(v){$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); const root=$('#view'); root.innerHTML='';
  if(v==='home') renderHome(root);
  if(v==='learn') renderLearn(root);
  if(v==='actions') renderActions(root);
  if(v==='stories') renderStories(root);
  if(v==='profile') renderProfile(root);
}

function renderHome(root){
  const d=state.data;
  const idx = dayIndex() % (d.posts.length || 1);
  const todays = d.posts[idx];
  root.appendChild(card('Mission', `<h3>${d.appName}</h3><p>${d.mission}</p><p class="meta">${d.hero}</p>`));
  const canShare = !!navigator.share;
  const shareBtn = canShare ? `<button class="btn secondary" id="shareBtn">Share this app</button>` : '';
  root.appendChild(card('Today’s Highlight', `<h3>${todays.title}</h3><p>${todays.body}</p>${shareBtn}`));
  if(canShare){ $('#shareBtn')?.addEventListener('click', ()=>{
    navigator.share({title: d.appName, text: todays.title, url: location.href}).catch(()=>{});
  })}
  root.appendChild(card('Next Step', `<p>Take one action today to support National Park designation.</p><a class="btn" id="toActions">Go to Actions</a>`));
  $('#toActions').addEventListener('click', ()=> navTo('actions'));
}

function renderLearn(root){
  const d=state.data;
  d.posts.forEach(p=>{
    const src = p.source ? `<p class="small">Source: <a href="${p.source.link}" target="_blank" rel="noopener">${p.source.title}</a></p>` : '';
    const el = card('Learn', `<h3>${p.title}</h3><p>${p.body}</p>${src}`);
    el.addEventListener('click', ()=>{ state.reads+=1; save(); });
    root.appendChild(el);
  });
}

function renderActions(root){
  const d=state.data;
  const grid=document.createElement('div'); grid.className='grid two';
  d.actions.forEach(a=>{
    const done=!!state.completed[a.id];
    const btn = done ? `<span class="small">Completed • +${a.points} pts</span>` : `<button class="btn" data-id="${a.id}">Do this</button>`;
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div class="kicker">Action</div><h3>${a.title}</h3><p>${a.body}</p>${btn}`;
    grid.appendChild(el);
  });
  root.appendChild(grid);

  // Action handlers
  $$('.btn[data-id]').forEach(b=> b.addEventListener('click', e=>{
    const id = e.target.dataset.id;
    const action = d.actions.find(x=>x.id===id);
    if(!action) return;
    if(action.type==='email'){ openEmailComposer(); } 
    else if(action.type==='share'){ tryShare(); }
    logAction(id, action.points);
  }));

  // Email composer card
  root.appendChild(emailComposerCard(d.letterTemplate));
}

function emailComposerCard(tpl){
  const el = card('Email Your Representative', `
    <p>Use this template to draft your message. Copy/paste into your email client, or use the button below.</p>
    <label for="yourName">Your name</label>
    <input id="yourName" placeholder="e.g., Alex Johnson" />
    <label for="yourCity">City, State</label>
    <input id="yourCity" placeholder="e.g., Provo, UT" />
    <label for="repEmail">Representative email (optional)</label>
    <input id="repEmail" placeholder="paste email address" />
    <label for="body">Message</label>
    <textarea id="body" rows="8">${tpl.body}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn" id="copyLetter">Copy text</button>
      <button class="btn secondary" id="mailtoBtn">Open in email</button>
    </div>
    <p class="small">Tip: If you don’t know their email, visit your state or federal website to look up contacts.</p>
  `);
  // wire buttons
  setTimeout(()=>{
    $('#copyLetter')?.addEventListener('click', async ()=>{
      const name = $('#yourName').value.trim();
      const city = $('#yourCity').value.trim();
      const body = $('#body').value.replace('[Your Name]', name||'[Your Name]').replace('[City, State]', city||'[City, State]');
      try{ await navigator.clipboard.writeText(body); alert('Copied! Paste into your email.'); }catch(e){ alert('Select the text and copy it manually.'); }
    });
    $('#mailtoBtn')?.addEventListener('click', ()=>{
      const name = $('#yourName').value.trim();
      const city = $('#yourCity').value.trim();
      const rep = $('#repEmail').value.trim();
      const subject = encodeURIComponent("Support National Park designation for the Great Salt Lake");
      const body = encodeURIComponent($('#body').value.replace('[Your Name]', name||'[Your Name]').replace('[City, State]', city||'[City, State]'));
      const to = rep || '';
      location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }, 0);
  return el;
}

function tryShare(){
  if(navigator.share){
    navigator.share({title:'Saving The Great Salt Lake', text:'Join me—support National Park designation for the Great Salt Lake.', url:location.href}).catch(()=>{});
  } else {
    alert('Share is not supported on this device. Copy the URL from the address bar.');
  }
}

function renderStories(root){
  const d=state.data;
  d.stories.forEach(s=>{
    root.appendChild(card('Story', `<h3>${s.title}</h3><blockquote>${s.body}</blockquote><p class="small">${s.credit||''}</p>`));
  });
  root.appendChild(card('Add your interviews', `<p>Edit <code>data/content.json</code> → add items under <code>"stories"</code>. They’ll appear here automatically.</p>`));
}

function renderProfile(root){
  root.appendChild(card('Your Stats', `<p><strong>Points:</strong> ${state.points}</p><p><strong>Streak:</strong> ${state.streak} day(s)</p><p class="small">Last check-in: ${state.lastCheckIn?new Date(state.lastCheckIn).toLocaleDateString():'—'}</p>`));
  // Display name
  const name = state.displayName || '';
  const nameCard = card('Display Name', `<input id="nameInput" placeholder="e.g., Lake Guardian" value="${name}"><br><br><button class="btn" id="saveName">Save</button> <button class="btn secondary" id="resetBtn">Reset progress</button>`);
  root.appendChild(nameCard);
  $('#saveName').addEventListener('click', ()=>{ state.displayName = $('#nameInput').value.trim() || null; save(); alert('Saved.'); });
  $('#resetBtn').addEventListener('click', ()=>{
    if(confirm('Reset your local progress?')){ state.points=0; state.streak=0; state.lastCheckIn=null; state.completed={}; state.reads=0; save(); navTo('home'); }
  });
}

function card(k,i){const el=document.createElement('div'); el.className='card'; el.innerHTML=`<div class="kicker">${k}</div>${i}`; return el}

function sameDay(a,b){const x=new Date(a),y=new Date(b);return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate()}

function logAction(id, pts){
  if(state.completed[id]) return;
  state.completed[id]=true;
  // streak
  const now=new Date();
  if(state.lastCheckIn){
    const prev=new Date(state.lastCheckIn);
    const diffDays=Math.round((now-prev)/(864e5));
    if(diffDays===1) state.streak+=1; else if(!sameDay(prev,now)) state.streak=1;
  } else { state.streak=1 }
  state.lastCheckIn=now.toISOString();
  state.points += (pts||5);
  save();
  alert('Action logged! +' + (pts||5) + ' points');
}

function openEmailComposer(){ /* UI lives in the card; no-op here */ }

async function start(){
  load(); await fetchData();
  $$('nav button').forEach(b=> b.addEventListener('click', ()=> navTo(b.dataset.view)));
  if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('service-worker.js') }catch(e){} }
  navTo('home');
}
start();
