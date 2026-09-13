const SUPABASE_URL="https://trmtgocglawidplcagzc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_NbJQhCF0GKDljAB2cOxhpw_Lva2P51L";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let signup=false,current=null,plants=[],careHistory=[],calendarExtraEvents=[];
let loading=false;
let selectedRoom=null,roomPlantId=null;
let authReady=false;
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const days=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+Number(n));return x};
const due=(d,n)=>d&&n&&days(d,n)<=new Date();
const fmt=d=>d?new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d)):"—";
const catalog=Array.isArray(window.PLANT_DATABASE)?window.PLANT_DATABASE:[];
const favoritesKey="planty:favorites";
const getFavs=()=>new Set(JSON.parse(localStorage.getItem(favoritesKey)||"[]"));
const saveFavs=s=>localStorage.setItem(favoritesKey,JSON.stringify([...s]));
const journalKey=uid=>`planty:journal:${uid||"user"}`;
const getJournal=()=>{try{const uid=window.plantyUserId;const primary=JSON.parse(localStorage.getItem(journalKey(uid))||"[]");if(primary.length||!uid)return primary;return JSON.parse(localStorage.getItem(journalKey("user"))||"[]")}catch{return[]}};
const addJournal=(entry)=>{const list=getJournal();list.unshift({...entry,id:crypto.randomUUID(),created_at:new Date().toISOString()});localStorage.setItem(journalKey(window.plantyUserId),JSON.stringify(list.slice(0,500)));};
const journalFor=id=>careHistory.filter(x=>x.plant_id===id);
function renderJournal(){const list=getJournal(), waterCount=list.filter(x=>x.type==='water').length; $('journalTotal').textContent=list.length; $('journalWater').textContent=waterCount; const rows=list.slice(0,8); $('journalList').innerHTML=rows.length?rows.map(x=>{const p=plants.find(y=>y.id===x.plant_id);return `<div class="p30-entry"><span class="journal-icon">${x.type==='water'?'💧':x.type==='fert'?'🌱':x.type==='skip'?'⏭️':'📝'}</span><div class="p30-entry-main"><b>${safe(p?.name||'Pflanze')}</b><small>${safe(x.label||'Pflegeaktion')}${x.note?' · '+safe(x.note):''}</small></div><span class="p30-entry-time">${fmt(x.created_at)}</span></div>`}).join(''):`<div class="p30-empty">Noch keine Pflegeaktionen. Erledige deine erste Aufgabe – sie erscheint hier automatisch.</div>`; if(rows.length<list.length)$('journalList').insertAdjacentHTML('beforeend','<button class="link p30-more" onclick="openJournal()">Alle Einträge anzeigen</button>');}
window.openJournal=()=>{$('journalModalBody').innerHTML=getJournal().length?getJournal().map(x=>{const p=plants.find(y=>y.id===x.plant_id);return `<div class="p30-entry"><span class="journal-icon">${x.type==='water'?'💧':x.type==='fert'?'🌱':x.type==='skip'?'⏭️':'📝'}</span><div class="p30-entry-main"><b>${safe(p?.name||'Pflanze')}</b><small>${safe(x.label||'Pflegeaktion')}${x.note?' · '+safe(x.note):''}</small></div><span class="p30-entry-time">${fmt(x.created_at)}</span></div>`}).join(''):'<div class="p30-empty">Noch keine Einträge.</div>';$('journalModal').classList.remove('hidden')};
$('journalClose').onclick=()=>$('journalModal').classList.add('hidden');

function fillCatalog(list=catalog){
  $("plantType").innerHTML='<option value="">Bitte auswählen…</option>'+list.map((p,i)=>`<option value="${catalog.indexOf(p)}">${safe(p.name)} — ${safe(p.botanical)}</option>`).join("");
}
function showCatalogResults(){
  const q=($('plantCatalogSearch').value||'').toLowerCase().trim();
  const matches=catalog.filter(p=>!q||`${p.name} ${p.botanical} ${p.light}`.toLowerCase().includes(q)).slice(0,20);
  $('plantCatalogResults').innerHTML=matches.map(p=>`<div class="plant-catalog-item" data-i="${catalog.indexOf(p)}"><strong>${safe(p.name)}</strong><small>${safe(p.botanical)} · ☀️ ${safe(p.light)} · 💧 ${p.watering} Tage</small></div>`).join("")||'<div class="plant-catalog-item">Keine passende Pflanze gefunden.</div>';
  $('plantCatalogResults').querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>selectCatalog(+el.dataset.i));
}
function selectCatalog(i){
  const p=catalog[i]; if(!p)return;
  $('plantType').value=String(i); $('plantType').dispatchEvent(new Event('change'));
  $('plantCatalogSearch').value=p.name;
  $('plantCatalogResults').innerHTML='';
  $('plantCatalogSelected').classList.remove('hidden');
  $('plantCatalogSelected').innerHTML=`<strong>${safe(p.name)}</strong><br><small>${safe(p.botanical)} · ${safe(p.light)}</small>`;
}
$('plantCatalogSearch').oninput=showCatalogResults;
$('plantType').onchange=()=>{const p=catalog[+$('plantType').value];if(!p){$('plantInfo').classList.add('hidden');return}$('plantInfo').classList.remove('hidden');$('plantInfo').innerHTML=`<b>${safe(p.name)}</b><br>☀️ ${safe(p.light)} · 💧 alle ${p.watering} Tage · 🌱 alle ${p.fertilizing} Tage`;$('name').placeholder=`Eigener Name, z. B. Meine ${p.name}`};

async function loadCareHistory(){
  const r=await db.from('plant_care_logs').select('*').order('performed_at',{ascending:false});
  if(!r.error){careHistory=r.data||[];return true}
  careHistory=getJournal();
  return false;
}
async function migrateLocalJournal(){
  const uid=window.plantyUserId;if(!uid)return;
  const legacy=JSON.parse(localStorage.getItem(journalKey('user'))||'[]');
  const currentLocal=JSON.parse(localStorage.getItem(journalKey(uid))||'[]');
  const all=[...currentLocal,...legacy.filter(x=>!currentLocal.some(y=>y.id===x.id))];
  if(!all.length)return;
  const rows=all.map(x=>({id:x.id,plant_id:x.plant_id,user_id:uid,type:x.type==='water'?'water':x.type==='fert'?'fert':'skip',performed_at:x.created_at||new Date().toISOString(),note:x.note||null}));
  const r=await db.from('plant_care_logs').upsert(rows,{onConflict:'id'});
  if(!r.error){localStorage.setItem(journalKey(uid),JSON.stringify(all.slice(0,500)));localStorage.removeItem(journalKey('user'));}
}
async function logCare(id,type,note=null){
  const row={plant_id:id,user_id:window.plantyUserId,type,performed_at:new Date().toISOString(),note};
  const r=await db.from('plant_care_logs').insert(row);
  addJournal({plant_id:id,type,label:type==='water'?'Gießen erledigt':type==='fert'?'Düngen erledigt':'Pflegeaktion',note});
  return r;
}
async function loadCalendarExtras(){
  const ids=plants.map(p=>p.id);if(!ids.length){calendarExtraEvents=[];return}
  const [ph,he]=await Promise.all([
    db.from('plant_photos').select('id,plant_id,taken_at,note').in('plant_id',ids),
    db.from('plant_health_logs').select('id,plant_id,created_at,problem,severity,description').in('plant_id',ids)
  ]);
  const out=[];
  for(const x of (ph.data||[])){const p=plants.find(y=>y.id===x.plant_id);out.push({date:x.taken_at,type:'photo',icon:'📸',title:x.note||'Wachstumsfoto',plant:p?.name||'Pflanze',note:''})}
  for(const x of (he.data||[])){const p=plants.find(y=>y.id===x.plant_id);out.push({date:x.created_at,type:'health',icon:'🩺',title:x.problem||'Beobachtung',plant:p?.name||'Pflanze',note:x.description||x.severity||''})}
  calendarExtraEvents=out;
}

function auth(msg=''){ $('auth').classList.remove('hidden'); $('app').classList.add('hidden'); if(msg) $('authMsg').textContent=msg; }
async function session(){
  try {
    const r=await db.auth.getSession();
    if(r.error){ auth('Supabase-Sitzung konnte nicht geladen werden: '+r.error.message); return; }
    authReady=true;
    if(r.data?.session) await load(); else auth();
  } catch(e){ auth('Verbindungsfehler: '+(e?.message||e)); }
}
$('mode').onclick=()=>{signup=!signup;$('title').textContent=signup?'Konto erstellen':'Willkommen zurück';$('authBtn').textContent=signup?'REGISTRIEREN':'ANMELDEN';$('mode').textContent=signup?'Schon registriert? Anmelden':'Noch kein Konto? Registrieren'};
$('authForm').onsubmit=async e=>{
  e.preventDefault();
  const email=$('email').value.trim(), password=$('password').value;
  $('authBtn').disabled=true; $('authMsg').textContent='Anmeldung läuft …';
  try {
    const r=signup ? await db.auth.signUp({email,password}) : await db.auth.signInWithPassword({email,password});
    if(r.error){ $('authMsg').textContent=r.error.message; return; }
    if(signup && !r.data?.session){ $('authMsg').textContent='Konto erstellt. Bitte prüfe deine E-Mail.'; return; }
    $('authMsg').textContent='';
    await load();
  } catch(e){ $('authMsg').textContent='Anmeldung fehlgeschlagen: '+(e?.message||e); }
  finally { $('authBtn').disabled=false; }
};
async function signed(path){const r=await db.storage.from('plant-photos').createSignedUrl(path,3600);return r.data?.signedUrl||''}
async function photosFor(id){const r=await db.from('plant_photos').select('*').eq('plant_id',id).order('taken_at',{ascending:false});return r.data||[]}
async function healthFor(id){const r=await db.from('plant_health_logs').select('*').eq('plant_id',id).order('created_at',{ascending:false});return r.data||[]}
function applyFilters(){const q=($('filterInput').value||'').toLowerCase().trim(),mode=$('filterStatus').value,room=($('filterRoom')?.value||'all');document.querySelectorAll('#plants .plant:not(.addplant)').forEach(card=>{const p=plants.find(x=>x.id===card.dataset.id);if(!p)return;const text=`${p.name} ${p.species} ${p.location}`.toLowerCase();let ok=!q||text.includes(q);if(mode==='water')ok&&=due(p.last_watered_at,p.watering_interval_days);if(mode==='fert')ok&&=due(p.last_fertilized_at,p.fertilizing_interval_days);if(mode==='health')ok&&=Boolean(p.health_status&&p.health_status!=='Gut');if(mode==='fav')ok&&=getFavs().has(p.id);if(room!=='all')ok&&=(p.location||'Unbekannt')===room;card.style.display=ok?'':'none'})}
function careEntries(){
  const now=new Date(); const end=new Date(now); end.setDate(end.getDate()+7);
  const out=[];
  for(const p of plants){
    if(p.last_watered_at&&p.watering_interval_days){const d=days(p.last_watered_at,p.watering_interval_days);out.push({plant:p,type:'water',date:d,label:'Gießen',icon:'💧'});}
    if(p.last_fertilized_at&&p.fertilizing_interval_days){const d=days(p.last_fertilized_at,p.fertilizing_interval_days);out.push({plant:p,type:'fert',date:d,label:'Düngen',icon:'🌱'});}
  }
  return out.filter(x=>x.date<=end).sort((a,b)=>a.date-b.date);
}
function careState(d){const n=new Date(),t=new Date(n);t.setHours(23,59,59,999);const tomorrow=new Date(t);tomorrow.setDate(tomorrow.getDate()+1);if(d<n)return 'overdue';if(d<=t)return 'today';return 'soon'}
function careLabel(x){const s=careState(x.date);if(s==='overdue')return 'Überfällig';if(s==='today')return 'Heute';return fmt(x.date)}
function actionDate(p,type){return type==='water'?days(p.last_watered_at,p.watering_interval_days):days(p.last_fertilized_at,p.fertilizing_interval_days)}
function actionEntries(){return careEntries().filter(x=>careState(x.date)!=='soon'||x.date<=new Date(Date.now()+7*86400000)).slice(0,30)}
function renderActions(){
  const list=$('actionList'); if(!list)return;
  const entries=actionEntries();
  list.innerHTML=entries.length?entries.map(x=>{const state=careState(x.date);return `<div class="p29-action ${state}"><div class="p29-action-main"><span class="p29-icon">${x.icon}</span><div><b>${safe(x.plant.name)} · ${x.label}</b><small>${state==='overdue'?'Überfällig seit '+fmt(x.date):state==='today'?'Heute fällig':'Fällig am '+fmt(x.date)}</small></div></div><div class="p29-buttons"><button class="primary-action" onclick="completeCare('${x.plant.id}','${x.type}')">✓ Erledigt</button><button onclick="skipCare('${x.plant.id}','${x.type}')">Überspringen</button></div></div>`}).join(''):'<div class="p29-empty">🎉 Keine offenen Pflegeaktionen. Deine Pflanzen sind im Plan.</div>';
}
window.completeCare=async(id,type)=>{const p=plants.find(x=>x.id===id);if(!p)return;const field=type==='water'?'last_watered_at':'last_fertilized_at',now=new Date().toISOString();const r=await db.from('plants').update({[field]:now}).eq('id',id);if(r.error){alert(r.error.message);return}await logCare(id,type);await load()};
window.skipCare=async(id,type)=>{const p=plants.find(x=>x.id===id);if(!p)return;const interval=type==='water'?p.watering_interval_days:p.fertilizing_interval_days;const field=type==='water'?'last_watered_at':'last_fertilized_at';const base=actionDate(p,type)||new Date();const next=new Date(base);next.setDate(next.getDate()+Number(interval||7));const r=await db.from('plants').update({[field]:next.toISOString()}).eq('id',id);if(r.error){alert(r.error.message);return}await logCare(id,'skip',`Neuer Termin ${fmt(next)}`);await load()};
function latestLightFor(id){const a=getLightReadings()[id]||[];return a[0]||null}
function locationPlantCheck(p){
  const light=latestLightFor(p.id), a=light?lightAssessment(light.lux,p):null;
  const pd=personalizedData(p,'water');
  const issues=[];
  if(a?.cls==='low')issues.push({kind:'light',icon:'🔴',text:'Licht vermutlich zu niedrig'});
  if(a?.cls==='high')issues.push({kind:'light',icon:'🟠',text:'Sehr heller Standort'});
  if(pd.observed!=null){
    const cat=Number(p.watering_interval_days)||7, drift=pd.observed-cat;
    if(drift<=-3)issues.push({kind:'care',icon:'💧',text:`Zuletzt häufiger gegossen als das Profil (${pd.observed} statt ${cat} Tage)`});
    if(drift>=4)issues.push({kind:'care',icon:'💧',text:`Zuletzt seltener gegossen als das Profil (${pd.observed} statt ${cat} Tage)`});
  }
  if(p.health_status&&p.health_status!=='Gut')issues.push({kind:'health',icon:'🩺',text:`Gesundheitsstatus: ${p.health_status}`});
  return {light,a,pd,issues};
}
function renderLocationAnalysis(){
  const box=$('locationAnalysis');if(!box)return;
  const checks=plants.map(p=>({p,...locationPlantCheck(p)}));
  const withLight=checks.filter(x=>x.light).length;
  const problems=checks.filter(x=>x.issues.length).length;
  const ok=checks.filter(x=>x.issues.length===0).length;
  $('locationScore').textContent=plants.length?`${ok}/${plants.length}`:'—';
  $('locationSummary').innerHTML=`<div><b>${withLight}</b><small>mit Lichtmessung</small></div><div><b>${ok}</b><small>Standort passt</small></div><div><b>${problems}</b><small>brauchen Check</small></div>`;
  const issues=checks.filter(x=>x.issues.length).flatMap(x=>x.issues.slice(0,2).map(i=>({...i,p:x.p})) ).slice(0,6);
  $('locationIssues').innerHTML=issues.length?issues.map(x=>`<button class="p42-issue" onclick="detail('${x.p.id}')"><span>${x.icon}</span><div><b>${safe(x.p.name)}</b><small>${safe(x.text)} · ${safe(x.p.location||'Kein Standort')}</small></div><strong>›</strong></button>`).join(''):`<div class="p42-empty">🟢 Keine auffälligen Standortsignale. Messungen und Pflegehistorie werden laufend berücksichtigt.</div>`;
  const rooms=roomNames();
  $('locationRooms').innerHTML=rooms.length?rooms.map(r=>{
    const rs=checks.filter(x=>(x.p.location||'').trim()===r), lighted=rs.filter(x=>x.light), low=rs.filter(x=>x.a?.cls==='low').length, health=rs.filter(x=>x.p.health_status&&x.p.health_status!=='Gut').length;
    const status=low||health?'check':rs.length?'ok':'empty';
    return `<div class="p42-room ${status}"><div class="p42-room-top"><b>🏠 ${safe(r)}</b><span>${rs.length} ${rs.length===1?'Pflanze':'Pflanzen'}</span></div><small>${lighted.length} Lichtmessung${lighted.length===1?'':'en'} · ${low?`${low} zu dunkel · `:''}${health?`${health} Gesundheit`: 'keine Gesundheitsprobleme'}</small><div class="p42-room-plants">${rs.slice(0,4).map(x=>`<button onclick="detail('${x.p.id}')">${x.a?x.a.icon:'☀️'} ${safe(x.p.name)}</button>`).join('')}</div></div>`
  }).join(''):'<div class="p42-empty">Noch keine Räume angelegt. Ordne Pflanzen einem Standort zu, um sie hier gemeinsam zu prüfen.</div>';
}

function renderStats(){
  const year=new Date().getFullYear();
  const journal=careHistory;
  const inYear=journal.filter(x=>new Date(x.created_at).getFullYear()===year);
  const water=inYear.filter(x=>x.type==='water').length;
  const fert=inYear.filter(x=>x.type==='fert').length;
  const skip=inYear.filter(x=>x.type==='skip').length;
  const photos=plants.reduce((n,p)=>n,0); // photo count is loaded separately below when available
  $('statsYear').textContent=String(year);
  $('statWater').textContent=water;
  $('statFert').textContent=fert;
  $('statActions').textContent=inYear.length;
  const months=Array.from({length:12},(_,i)=>({m:i,w:0,f:0,s:0}));
  inYear.forEach(x=>{const m=new Date(x.created_at).getMonth(); if(x.type==='water')months[m].w++; else if(x.type==='fert')months[m].f++; else if(x.type==='skip')months[m].s++;});
  const max=Math.max(1,...months.map(x=>x.w+x.f+x.s));
  $('activityChart').innerHTML=months.map((x,i)=>{const total=x.w+x.f+x.s;const h=Math.max(3,Math.round(total/max*100));return `<div class="p32-bar-col"><div class="p32-value">${total||''}</div><div class="p32-bar" style="height:${h}%" title="${total} Aktionen"><i style="height:${total?Math.round(x.w/total*100):0}%"></i><em style="height:${total?Math.round(x.f/total*100):0}%"></em></div><small>${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][i]}</small></div>`}).join('');
  const ranking=Object.entries(inYear.reduce((a,x)=>{a[x.plant_id]=(a[x.plant_id]||0)+1;return a},{})).map(([id,n])=>({p:plants.find(p=>p.id===id),n})).filter(x=>x.p).sort((a,b)=>b.n-a.n).slice(0,5);
  $('plantRanking').innerHTML=ranking.length?ranking.map((x,i)=>`<div class="p32-rank"><b>${i+1}</b><span>${safe(x.p.name)}<small>${x.n} ${x.n===1?'Aktion':'Aktionen'}</small></span><strong>${Math.round(x.n/Math.max(1,inYear.length)*100)}%</strong></div>`).join(''):'<div class="p32-empty">Noch keine Pflegeaktionen in diesem Jahr.</div>';
  const first=inYear.length?new Date(Math.min(...inYear.map(x=>new Date(x.created_at)))):null;
  const daysActive=first?Math.max(1,Math.floor((new Date()-first)/86400000)+1):0;
  $('yearSummary').innerHTML=`<div class="p32-summary-grid"><div><b>${inYear.length}</b><small>Aktionen 2026</small></div><div><b>${skip}</b><small>Übersprungen</small></div><div><b>${daysActive}</b><small>Tage dokumentiert</small></div><div><b>${plants.length}</b><small>Pflanzen aktuell</small></div></div><p>${inYear.length?`Du hast dieses Jahr bereits <strong>${water}</strong> Gießvorgänge dokumentiert. Weiter so – kleine regelmäßige Schritte machen dein Tagebuch wertvoll.`:'Sobald du deine ersten Pflegeaktionen erledigst, baut Planty hier deinen persönlichen Jahresrückblick auf.'}</p>`;
}


// V3.3 – interaktiver Pflegekalender
let calendarDate=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let calendarFilter='all';
function localDayKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function calendarEvents(){
  const events=[];
  for(const x of careHistory){
    const p=plants.find(y=>y.id===x.plant_id);
    const type=x.type==='water'?'water':x.type==='fert'?'fert':'skip';
    events.push({date:x.performed_at||x.created_at,type,icon:type==='water'?'💧':type==='fert'?'🌱':'⏭️',title:type==='water'?'Gießen erledigt':type==='fert'?'Düngen erledigt':'Pflege übersprungen',plant:p?.name||'Pflanze',note:x.note||''});
  }
  return [...events,...calendarExtraEvents];
}
function renderCalendar(){
  const grid=$('calendarGrid'), title=$('calTitle'); if(!grid||!title)return;
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth();
  title.textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(calendarDate);
  const first=new Date(y,m,1), offset=(first.getDay()+6)%7, daysIn=new Date(y,m+1,0).getDate();
  const prevDays=new Date(y,m,0).getDate();
  const events=calendarEvents(); const map={};
  for(const e of events){const k=localDayKey(e.date);(map[k]??=[]).push(e)}
  let html='';
  for(let i=0;i<42;i++){
    const n=i-offset+1; const date=new Date(y,m,n); const inMonth=date.getMonth()===m;
    const key=localDayKey(date); let ev=(map[key]||[]).filter(e=>calendarFilter==='all'||e.type===calendarFilter);
    const isToday=key===localDayKey(new Date());
    html+=`<button class="p33-day ${inMonth?'':'muted'} ${isToday?'today':''}" data-date="${key}"><span class="p33-day-num">${date.getDate()}</span>${ev.length?`<span class="p33-dots">${ev.slice(0,4).map(e=>`<i title="${safe(e.title)}">${e.icon}</i>`).join('')}</span><small>${ev.length} ${ev.length===1?'Eintrag':'Einträge'}</small>`:''}</button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.p33-day').forEach(b=>b.onclick=()=>showCalendarDay(b.dataset.date));
}
function showCalendarDay(key){
  const box=$('calendarDetails'); if(!box)return;
  const events=calendarEvents().filter(e=>localDayKey(e.date)===key).filter(e=>calendarFilter==='all'||e.type===calendarFilter);
  const date=new Date(key+'T12:00:00');
  if(!events.length){box.innerHTML=`<div class="p33-empty"><b>${fmt(date)}</b><br>Keine Einträge für diesen Tag.</div>`;return}
  box.innerHTML=`<div class="p33-detail-head"><b>${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(date)}</b><span>${events.length} ${events.length===1?'Eintrag':'Einträge'}</span></div>`+events.map(e=>`<div class="p33-event"><span>${e.icon}</span><div><b>${safe(e.plant)} · ${safe(e.title)}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(e.date))}${e.note?' · '+safe(e.note):''}</small></div></div>`).join('');
}
$('calPrev')?.addEventListener('click',()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()});
$('calNext')?.addEventListener('click',()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()});
document.querySelectorAll('.p33-filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.p33-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');calendarFilter=b.dataset.calFilter;renderCalendar()}));

function roomKey(){return `planty:rooms:${window.plantyUserId||'user'}`}
function savedRooms(){try{return JSON.parse(localStorage.getItem(roomKey())||'[]')}catch{return[]}}
function saveRooms(list){localStorage.setItem(roomKey(),JSON.stringify([...new Set(list.filter(Boolean).map(x=>String(x).trim()))].sort((a,b)=>a.localeCompare(b,'de'))))}
function roomNames(){return [...new Set([...savedRooms(),...plants.map(p=>(p.location||'').trim()).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'de'))}
function renderRooms(){const cards=$('roomCards');if(!cards)return;const rooms=roomNames();if(selectedRoom&&!rooms.includes(selectedRoom))selectedRoom=null;if(!selectedRoom&&rooms.length)selectedRoom=rooms[0];cards.innerHTML=rooms.map(r=>{const ps=plants.filter(p=>(p.location||'').trim()===r),issues=ps.filter(p=>p.health_status&&p.health_status!=='Gut').length,dueN=ps.filter(p=>due(p.last_watered_at,p.watering_interval_days)||due(p.last_fertilized_at,p.fertilizing_interval_days)).length;return `<button class="p39-room-card ${selectedRoom===r?'active':''}" onclick="selectRoom('${safe(r).replace(/'/g,"&#039;")}')"><span>🏠</span><b>${safe(r)}</b><small>${ps.length} ${ps.length===1?'Pflanze':'Pflanzen'} · ${dueN} fällig</small>${issues?`<em>🩺 ${issues} beobachten</em>`:''}</button>`}).join('')||'<div class="p39-empty">Noch keine Räume. Lege einen Raum an oder ordne eine Pflanze einem Standort zu.</div>';renderRoomPlants()}
window.selectRoom=r=>{selectedRoom=r;renderRooms()};
function renderRoomPlants(){const box=$('roomPlants');if(!box)return;if(!selectedRoom){box.innerHTML='<div class="p39-empty">Wähle einen Raum aus.</div>';return}const ps=plants.filter(p=>(p.location||'').trim()===selectedRoom);box.innerHTML=`<div class="p39-room-head"><div><b>🏠 ${safe(selectedRoom)}</b><small>${ps.length} Pflanzen</small></div><button onclick="openNewRoom()">＋ Neuer Raum</button></div>`+(ps.length?ps.map(p=>`<div class="p39-room-plant"><div><b>${safe(p.name)}</b><small>${safe(p.species||'Zimmerpflanze')} · ${p.health_status==='Gut'?'🌿 Gut':'🩺 '+safe(p.health_status||'Beobachten')}</small></div><div><button onclick="detail('${p.id}')">Öffnen</button><button onclick="openRoomManager('${p.id}')">Verschieben</button></div></div>`).join(''):'<div class="p39-empty">Keine Pflanzen in diesem Raum.</div>')}
window.openNewRoom=()=>{roomPlantId=null;$('roomForm').reset();fillRoomSelect();$('roomMsg').textContent='';$('roomModal').classList.remove('hidden')};
window.openRoomManager=id=>{roomPlantId=id;const p=plants.find(x=>x.id===id);if(!p)return;$('roomForm').reset();fillRoomSelect();$('roomSelect').value=p.location||'';$('roomMsg').textContent='';$('roomModal').classList.remove('hidden')};
function fillRoomSelect(){const rooms=roomNames();$('roomSelect').innerHTML='<option value="">Ohne Standort</option>'+rooms.map(r=>`<option value="${safe(r)}">${safe(r)}</option>`).join('')}
$('roomClose').onclick=()=>$('roomModal').classList.add('hidden');$('newRoomBtn').onclick=openNewRoom;
$('roomForm').onsubmit=async e=>{e.preventDefault();const name=$('newRoomName').value.trim()||$('roomSelect').value;if(roomPlantId){const r=await db.from('plants').update({location:name}).eq('id',roomPlantId);if(r.error){$('roomMsg').textContent=r.error.message;return}$('roomModal').classList.add('hidden');await load();detail(roomPlantId)}else{if(!name){$('roomMsg').textContent='Bitte einen Raumnamen eingeben.';return}saveRooms([...savedRooms(),name]);selectedRoom=name;$('roomModal').classList.add('hidden');renderRooms()}};

const lightKey=uid=>`planty:light:${uid||"user"}`;
function getLightReadings(){try{return JSON.parse(localStorage.getItem(lightKey(window.plantyUserId))||"{}")}catch{return {}}}
function saveLightReadings(x){localStorage.setItem(lightKey(window.plantyUserId),JSON.stringify(x))}
let lightPlantId=null,lightSensor=null,lightCurrent=null,lightTimer=null;
function lightTarget(text){const t=String(text||'').toLowerCase();if(t.includes('dunkel')||t.includes('schatt'))return {min:300,max:1500,label:'eher wenig Licht'};if(t.includes('hell')&&t.includes('direkt'))return {min:3000,max:20000,label:'hell bis sehr hell'};if(t.includes('sehr hell'))return {min:5000,max:30000,label:'sehr hell'};if(t.includes('hell'))return {min:1500,max:10000,label:'hell'};return {min:500,max:5000,label:'mittel'};}
function lightAssessment(lux,plant){const t=lightTarget(plant.light_level);if(lux<t.min)return {cls:'low',icon:'🔴',text:`Für ${safe(plant.name)} vermutlich zu dunkel.`};if(lux>t.max)return {cls:'high',icon:'🟠',text:`Sehr heller Standort – beobachte die Pflanze.`};return {cls:'ok',icon:'🟢',text:`Licht passt wahrscheinlich gut (${t.label}).`}}
function lightSummary(id,plant){const all=getLightReadings(),a=all[id]||[];if(!a.length)return `<div class="detail-light-box-inner"><div><b>☀️ Licht am Standort</b><small>Noch keine Messung gespeichert.</small></div><button onclick="openLightMeter('${id}')">Messen</button></div>`;const x=a[0],ass=lightAssessment(x.lux,plant);return `<div class="detail-light-box-inner"><div><b>☀️ ${Math.round(x.lux).toLocaleString('de-DE')} lx</b><small>${ass.icon} ${ass.text} · ${fmt(x.at)}</small></div><button onclick="openLightMeter('${id}')">Neu messen</button></div>`}
window.openLightMeter=id=>{const p=plants.find(x=>x.id===id);if(!p)return;lightPlantId=id;lightCurrent=null;$('lightPlantName').textContent=`${p.name} · ${p.location||'Standort'}`;$('lightReading').textContent='—';$('lightStatus').textContent='Bereit für die Messung';$('lightHelp').textContent='Halte das Smartphone dort, wo sich die Pflanze normalerweise befindet. Für einen Vergleich möglichst immer ähnlich messen.';$('lightSave').classList.add('hidden');$('lightStart').classList.remove('hidden');$('lightModal').classList.remove('hidden')};
async function stopLightSensor(){if(lightTimer)clearInterval(lightTimer);lightTimer=null;if(lightSensor){try{lightSensor.stop()}catch{}lightSensor=null}}
async function startLightMeter(){const p=plants.find(x=>x.id===lightPlantId);if(!p)return;await stopLightSensor();$('lightStart').classList.add('hidden');$('lightStatus').textContent='Sensor wird gestartet …';try{if(!('AmbientLightSensor' in window)){throw new Error('NO_SENSOR')}const sensor=new AmbientLightSensor({frequency:2});lightSensor=sensor;sensor.addEventListener('reading',()=>{lightCurrent=Math.max(0,Number(sensor.illuminance)||0);$('lightReading').textContent=Math.round(lightCurrent).toLocaleString('de-DE');const a=lightAssessment(lightCurrent,p);$('lightStatus').textContent=`${a.icon} ${a.text}`;$('lightSave').classList.remove('hidden')});sensor.addEventListener('error',e=>{if(e.error?.name==='NotAllowedError')$('lightStatus').textContent='Sensorzugriff wurde nicht erlaubt.';else $('lightStatus').textContent='Lichtsensor konnte nicht gelesen werden.'});await sensor.start();$('lightHelp').textContent='Live-Messung aktiv. Warte kurz, bis der Wert stabil ist, und speichere ihn dann.'}catch(e){$('lightStatus').textContent='📱 Dieses Gerät stellt dem Browser keinen Lichtsensor bereit.';$('lightHelp').innerHTML='Die Messung funktioniert nur auf Geräten/Browsern, die den Umgebungslichtsensor freigeben. Du kannst den Wert trotzdem manuell eintragen.';$('lightReading').innerHTML='<input id="manualLux" type="number" min="0" step="1" placeholder="z. B. 2500" inputmode="decimal" style="font-size:28px;width:170px;text-align:center">';$('lightSave').classList.remove('hidden');lightCurrent=null}}
$('lightStart').onclick=startLightMeter;
$('lightSave').onclick=()=>{const p=plants.find(x=>x.id===lightPlantId);if(!p)return;const v=lightCurrent??Number($('manualLux')?.value);if(!Number.isFinite(v)||v<0){$('lightMsg').textContent='Bitte einen gültigen Lux-Wert eingeben.';return}const all=getLightReadings();all[lightPlantId]=[{lux:v,at:new Date().toISOString()},...(all[lightPlantId]||[])].slice(0,50);saveLightReadings(all);$('lightMsg').textContent='Gespeichert.';stopLightSensor();setTimeout(()=>{$('lightModal').classList.add('hidden');if(lightPlantId)window.detail(lightPlantId)},300)};
$('lightClose').onclick=()=>{stopLightSensor();$('lightModal').classList.add('hidden')};

function renderReminders(){const dueW=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length,dueF=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;const box=$('p25-reminder-panel');if(box)box.innerHTML=`<div class="p25-head"><div><div class="p25-title">🔔 Pflege-Erinnerungen</div><div class="p25-sub">Automatisch aus deinen Intervallen berechnet.</div></div><div class="p25-summary"><span>💧 ${dueW} fällig</span><span>🌱 ${dueF} fällig</span></div></div>`}

/* V3.7 · Seiten-Navigation: vorhandene Funktionen bleiben erhalten, aber werden in klare Bereiche aufgeteilt. */
const pageButtons=[...document.querySelectorAll('.app-nav-btn')];
const pageSections=[...document.querySelectorAll('[data-page-section]')];
function showPage(page,scroll=true){
  pageButtons.forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  pageSections.forEach(el=>el.classList.toggle('page-section-hidden',el.dataset.pageSection!==page));
  if(page==='plants'){setTimeout(()=>{if(typeof applyFilters==='function')applyFilters()},0)}
  if(page==='calendar'){setTimeout(()=>{if(typeof renderCalendar==='function')renderCalendar()},0)}
  if(page==='journal'){setTimeout(()=>{if(typeof renderJournal==='function')renderJournal()},0)}
  if(page==='stats'){setTimeout(()=>{if(typeof renderStats==='function')renderStats()},0)}
  if(page==='rooms'){setTimeout(()=>{if(typeof renderRooms==='function')renderRooms()},0)}
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}
pageButtons.forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
showPage('home',false);

$('logout').onclick=async()=>{await db.auth.signOut();auth();};
db.auth.onAuthStateChange((event,s)=>{
  if(event==='SIGNED_OUT'){ window.plantyUserId=null; auth(); return; }
  if(s && authReady) setTimeout(()=>load(),0);
});
fillCatalog();session();
