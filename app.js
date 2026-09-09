const SUPABASE_URL="https://trmtgocglawidplcagzc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_NbJQhCF0GKDljAB2cOxhpw_Lva2P51L";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let signup=false,current=null,plants=[],careHistory=[],calendarExtraEvents=[];
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

function auth(){$('auth').classList.remove('hidden');$('app').classList.add('hidden')}
async function session(){const r=await db.auth.getSession();r.data.session?load():auth()}
$('mode').onclick=()=>{signup=!signup;$('title').textContent=signup?'Konto erstellen':'Willkommen zurück';$('authBtn').textContent=signup?'REGISTRIEREN':'ANMELDEN';$('mode').textContent=signup?'Schon registriert? Anmelden':'Noch kein Konto? Registrieren'};
$('authForm').onsubmit=async e=>{e.preventDefault();const r=signup?await db.auth.signUp({email:$('email').value,password:$('password').value}):await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(r.error){$('authMsg').textContent=r.error.message;return}if(signup&&!r.data.session){$('authMsg').textContent='Konto erstellt. Bitte prüfe deine E-Mail.';return}load()};
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
function renderCockpit(){
  const entries=careEntries(), overdue=entries.filter(x=>careState(x.date)==='overdue'), today=entries.filter(x=>careState(x.date)==='today');
  const weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+7);const week=entries.filter(x=>x.date<=weekEnd);
  $('overdueCount').textContent=overdue.length;$('todayCount').textContent=today.length;$('weekCount').textContent=week.length;
  $('cockpitText').textContent=overdue.length?`${overdue.length} Aufgabe${overdue.length===1?' wartet':'n warten'} auf dich.`:today.length?`${today.length} Pflegeaufgabe${today.length===1?'':'n'} heute.`:'Deine Pflanzen sind aktuell gut im Plan.';
  $('weekStatus').textContent=week.length?`${week.length} Aufgaben · 7 Tage`:'Alles ruhig';
  const photoTotal=document.querySelectorAll('#plants .plant').length?0:0;
  $('photoCount').textContent='—';
  $('carePlan').innerHTML=week.slice(0,6).map(x=>`<div class="p28-item ${careState(x.date)}"><div><b>${x.icon} ${safe(x.plant.name)}</b><small>${x.label} · ${careLabel(x)}</small></div><button onclick="${x.type==='water'?`water('${x.plant.id}')`:`fertilize('${x.plant.id}')`}">${x.type==='water'?'Erledigt':'Erledigt'}</button></div>`).join('')||'<div class="p28-empty">Keine Pflegeaufgaben in den nächsten 7 Tagen.</div>';
  const attention=plants.filter(p=>p.health_status&&p.health_status!=='Gut');
  $('attentionList').innerHTML=attention.slice(0,5).map(p=>`<div class="p28-item"><div><b>🩺 ${safe(p.name)}</b><small>${safe(p.health_status)}</small></div><button onclick="detail('${p.id}')">Ansehen</button></div>`).join('')||'<div class="p28-empty">Keine Pflanzen mit besonderem Status.</div>';
  const rooms={};plants.forEach(p=>{const r=p.location||'Ohne Standort';rooms[r]=(rooms[r]||0)+1});$('roomSummary').innerHTML=Object.entries(rooms).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([r,n])=>`<div class="p28-room"><b>${n}</b>${safe(r)}</div>`).join('')||'<div class="p28-empty">Noch keine Standorte.</div>';
  $('recentPlants').innerHTML=plants.slice(0,5).map(p=>`<div class="p28-item"><div><b>${safe(p.name)}</b><small>${safe(p.species||'Zimmerpflanze')} · ${fmt(p.created_at)}</small></div><button onclick="detail('${p.id}')">Öffnen</button></div>`).join('')||'<div class="p28-empty">Noch keine Pflanzen.</div>';
}
window.fertilize=async id=>completeCare(id,'fert');
async function load(){const r=await db.from('plants').select('*').order('created_at',{ascending:false});if(r.error){alert(r.error.message);return}plants=r.data||[];const u=(await db.auth.getUser()).data.user;if(u){window.plantyUserId=u.id;await migrateLocalJournal();await loadCareHistory();await loadCalendarExtras();}$('auth').classList.add('hidden');$('app').classList.remove('hidden');$('count').textContent=plants.length;$('water').textContent=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length;$('fert').textContent=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;const u=(await db.auth.getUser()).data.user,h=await db.from('plant_health_logs').select('plant_id').eq('user_id',u.id);$('issues').textContent=new Set((h.data||[]).map(x=>x.plant_id)).size;$('welcome').textContent=plants.length?`${plants.length} Pflanzen · bleib dran, sie wachsen mit dir.`:'Lege deine erste Pflanze an.';
 const u2=(await db.auth.getUser()).data.user; const pc=await db.from('plant_photos').select('id').eq('user_id',u2.id); $('statPhotos').textContent=(pc.data||[]).length; const rooms=[...new Set(plants.map(p=>p.location).filter(Boolean))].sort();if($('filterRoom'))$('filterRoom').innerHTML='<option value="all">Alle Standorte</option>'+rooms.map(r=>`<option>${safe(r)}</option>`).join('');
 const tasks=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).map(p=>`<div class="task">💧 <span><b>${safe(p.name)}</b><br><small>Gießen</small></span><button onclick="water('${p.id}')">Gegossen ✓</button></div>`);$('tasks').innerHTML=tasks.length?tasks.slice(0,8).join(''):'<div class="task">♡ Heute ist alles erledigt</div>';
 let html='';for(const p of plants){const ph=(await photosFor(p.id))[0],url=ph?await signed(ph.photo_path):'';const fav=getFavs().has(p.id);html+=`<div class="plant" data-id="${p.id}" onclick="detail('${p.id}')"><button class="fav-btn ${fav?'active':''}" onclick="event.stopPropagation();toggleFavorite('${p.id}')" aria-label="Favorit">${fav?'♥':'♡'}</button><div class="pic">${url?`<img src="${url}" alt="">`:'🌿'}</div><h3>${safe(p.name)}</h3><p>${safe(p.species||'Zimmerpflanze')} · ${safe(p.location||'Kein Standort')}</p>${due(p.last_watered_at,p.watering_interval_days)?'<span class="badge">💧 Gießen fällig</span>':''}</div>`}$('plants').innerHTML=html+`<div class="plant addplant" onclick="openModal()">＋ Pflanze hinzufügen</div>`;applyFilters();renderReminders();renderCockpit();renderActions();renderIntelligence();renderJournal();renderStats();
  renderCalendar();renderCalendar();
}
window.toggleFavorite=id=>{const s=getFavs();s.has(id)?s.delete(id):s.add(id);saveFavs(s);load()};
window.water=async id=>completeCare(id,'water');
window.openModal=()=>{$('plantForm').reset();$('preview').innerHTML='🌿';$('plantInfo').classList.add('hidden');$('plantCatalogSelected').classList.add('hidden');$('plantCatalogSearch').value='';$('plantCatalogResults').innerHTML='';$('modal').classList.remove('hidden')};
$('add').onclick=openModal;$('close').onclick=()=>$('modal').classList.add('hidden');$('plantPhoto').onchange=e=>{const f=e.target.files[0];if(f)$('preview').innerHTML=`<img src="${URL.createObjectURL(f)}">`};
$('plantForm').onsubmit=async e=>{e.preventDefault();const c=catalog[+$('plantType').value];if(!c)return;const u=(await db.auth.getUser()).data.user,n=new Date().toISOString(),r=await db.from('plants').insert({user_id:u.id,name:$('name').value.trim()||c.name,species:c.botanical,location:$('location').value.trim(),light_level:c.light,watering_interval_days:c.watering,last_watered_at:n,fertilizing_interval_days:c.fertilizing,last_fertilized_at:n,health_status:'Gut',notes:$('notes').value.trim()}).select().single();if(r.error){$('saveMsg').textContent=r.error.message;return}const f=$('plantPhoto').files[0];if(f){const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=`${u.id}/${r.data.id}/${crypto.randomUUID()}.${ext}`,up=await db.storage.from('plant-photos').upload(path,f,{contentType:f.type||'image/jpeg'});if(!up.error)await db.from('plant_photos').insert({plant_id:r.data.id,user_id:u.id,photo_path:path,note:'Startfoto',taken_at:n})}$('modal').classList.add('hidden');load()};

window.detail=async id=>{current=plants.find(p=>p.id===id);if(!current)return;$('detailName').textContent=current.name;const [ps,hs]=await Promise.all([photosFor(id),healthFor(id)]);const urls=await Promise.all(ps.map(p=>signed(p.photo_path)));const fav=getFavs().has(id);const first=ps.length?new Date(ps[ps.length-1].taken_at):null,last=ps.length?new Date(ps[0].taken_at):null;const span=first&&last?Math.max(0,Math.round((last-first)/86400000)):0;$('detailBody').innerHTML=`<div class="detail-hero"><div class="detail-species">${safe(current.species||'Zimmerpflanze')}</div><button class="fav-large" onclick="toggleFavorite('${id}')">${fav?'♥ Favorit':'♡ Favorit'}</button></div><div class="metaGrid"><div class="meta">☀️<b>${safe(current.light_level||'—')}</b><small>Licht</small></div><div class="meta">💧<b>${current.watering_interval_days||'—'} Tage</b><small>Gießen</small></div><div class="meta">📸<b>${ps.length}</b><small>Fotos</small></div><div class="meta">🌱<b>${span} Tage</b><small>Dokumentiert</small></div></div><div class="actions"><button onclick="openPhoto('${id}')">📸 Wachstum fotografieren</button><button onclick="openHealth('${id}')">🩺 Beobachtung</button><button onclick="water('${id}')">💧 Gegossen</button></div><div class="p31-detail-card"><b>🧠 Pflegeempfehlung</b><small>${safe(seasonInfo().text)}</small><div>💧 nächstes empfohlenes Gießen: <strong>${fmt(intelligentDue(current,'water'))}</strong> · ${intelligentInterval(current,'water')} Tage</div><div>🌱 nächstes empfohlenes Düngen: <strong>${fmt(intelligentDue(current,'fert'))}</strong> · ${intelligentInterval(current,'fert')} Tage</div></div><h3>📸 Fotoalbum</h3>${ps.length?`<div class="photos">${ps.map((p,i)=>`<div class="photo"><img src="${urls[i]}" alt=""><small>${fmt(p.taken_at)}${p.note?' · '+safe(p.note):''}</small></div>`).join('')}</div>`:'<div class="empty-state">Noch keine Wachstumsfotos.</div>'}<h3>🌱 Wachstumsverlauf</h3>${ps.length?`<div class="timeline">${ps.map((p,i)=>`<div class="timeline-item"><div class="timeline-dot">🌿</div><div class="timeline-card"><img src="${urls[i]}" alt=""><div><b>${fmt(p.taken_at)}</b><small>${safe(p.note||'Wachstumsfoto')}</small></div></div></div>`).join('')}</div>`:'<div class="empty-state">Mach regelmäßig Fotos – so entsteht automatisch deine Zeitlinie.</div>'}<h3>🩺 Beobachtungen</h3>${hs.length?hs.map(h=>`<div class="health"><b>${safe(h.problem||'Beobachtung')}</b> · <span class="badge">${safe(h.severity||'Mittel')}</span><br>${safe(h.description||'') }<small>${fmt(h.created_at)}</small></div>`).join(''):'<div class="empty-state">Keine Beobachtungen eingetragen.</div>'}<h3>📖 Pflegeverlauf</h3>${journalFor(id).slice(0,12).map(x=>`<div class="health"><b>${x.type==='water'?'💧':x.type==='fert'?'🌱':'⏭️'} ${safe(x.label||'Pflegeaktion')}</b><small>${fmt(x.created_at)}${x.note?' · '+safe(x.note):''}</small></div>`).join('')||'<div class="empty-state">Noch keine Pflegeaktionen.</div>'}<h3>📝 Notizen</h3><div class="health">${safe(current.notes||'Keine Notizen.')}</div>`;$('detail').classList.remove('hidden')};
$('detailClose').onclick=()=>$('detail').classList.add('hidden');
window.openPhoto=id=>{current=plants.find(p=>p.id===id);$('photoForm').reset();$('photoModal').classList.remove('hidden')};$('photoClose').onclick=()=>$('photoModal').classList.add('hidden');
$('photoForm').onsubmit=async e=>{e.preventDefault();if(!current)return;const f=$('growthPhoto').files[0],u=(await db.auth.getUser()).data.user;if(!f)return;const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',now=new Date().toISOString(),path=`${u.id}/${current.id}/${crypto.randomUUID()}.${ext}`,up=await db.storage.from('plant-photos').upload(path,f,{contentType:f.type||'image/jpeg'});if(up.error){$('photoMsg').textContent=up.error.message;return}const r=await db.from('plant_photos').insert({plant_id:current.id,user_id:u.id,photo_path:path,note:$('growthNote').value.trim()||'Wachstumsfoto',taken_at:now});if(r.error){$('photoMsg').textContent=r.error.message;return}$('photoModal').classList.add('hidden');detail(current.id);load()};
window.openHealth=id=>{current=plants.find(p=>p.id===id);$('healthForm').reset();$('healthModal').classList.remove('hidden')};$('healthClose').onclick=()=>$('healthModal').classList.add('hidden');
$('healthForm').onsubmit=async e=>{e.preventDefault();const u=(await db.auth.getUser()).data.user,r=await db.from('plant_health_logs').insert({plant_id:current.id,user_id:u.id,problem:$('problem').value,severity:$('severity').value,description:$('description').value.trim()});if(r.error){$('healthMsg').textContent=r.error.message;return}$('healthModal').classList.add('hidden');detail(current.id);load()};
$('filterInput').oninput=applyFilters;$('filterStatus').onchange=applyFilters;$('filterRoom').onchange=applyFilters;

function seasonInfo(){
  const m=new Date().getMonth()+1;
  if([12,1,2].includes(m))return {name:'Winter',emoji:'❄️',factor:1.22,text:'Weniger Licht: Gießen meist etwas seltener planen.'};
  if([3,4,5].includes(m))return {name:'Frühling',emoji:'🌱',factor:1.0,text:'Mehr Licht und neues Wachstum: Pflege wieder regelmäßig prüfen.'};
  if([6,7,8].includes(m))return {name:'Sommer',emoji:'☀️',factor:.86,text:'Mehr Licht und Wärme: Wasserbedarf kann steigen.'};
  return {name:'Herbst',emoji:'🍂',factor:1.10,text:'Licht nimmt ab: Intervalle vorsichtiger planen.'};
}
function intelligentInterval(p,type){
  const base=Number(type==='water'?p.watering_interval_days:p.fertilizing_interval_days)||7;
  const s=seasonInfo();
  let factor=s.factor;
  const light=String(p.light_level||'').toLowerCase();
  if(type==='water'){
    if(light.includes('hell')||light.includes('direkt'))factor*=.96;
    if(light.includes('schatt')||light.includes('wenig'))factor*=1.06;
  } else {
    // In winter/low-light periods, fertilizing is intentionally reduced.
    if(s.name==='Winter')factor*=1.45;
    else if(s.name==='Sommer')factor*=.95;
  }
  return Math.max(type==='water'?2:7,Math.round(base*factor));
}
function intelligentDue(p,type){
  const field=type==='water'?'last_watered_at':'last_fertilized_at';
  const d=p[field]; if(!d)return new Date();
  return days(d,intelligentInterval(p,type));
}
function intelligenceReason(p,type){
  const s=seasonInfo(), light=String(p.light_level||'nicht angegeben').toLowerCase();
  if(type==='water'){
    if(s.name==='Sommer')return 'Sommer + Licht können den Wasserbedarf erhöhen.';
    if(s.name==='Winter')return 'Weniger Licht im Winter: Planty plant bewusst vorsichtiger.';
    if(light.includes('schatt')||light.includes('wenig'))return 'Wenig Licht: Planty verlängert das Intervall leicht.';
    return 'Intervall an Jahreszeit und Licht angepasst.';
  }
  if(s.name==='Winter')return 'Im Winter wird Düngen deutlich zurückgenommen.';
  return 'Düngen wird saisonal und nach dem hinterlegten Intervall geplant.';
}
function renderIntelligence(){
  const box=$('intelligenceList'); if(!box)return;
  const s=seasonInfo(); $('seasonBadge').textContent=`${s.emoji} ${s.name}`;
  const all=[];
  plants.forEach(p=>['water','fert'].forEach(type=>{
    const date=intelligentDue(p,type); all.push({p,type,date,label:type==='water'?'Gießen':'Düngen',icon:type==='water'?'💧':'🌱',interval:intelligentInterval(p,type),reason:intelligenceReason(p,type)});
  }));
  all.sort((a,b)=>a.date-b.date);
  const visible=all.slice(0,8);
  box.innerHTML=visible.length?visible.map(x=>{
    const late=x.date<new Date(), today=careState(x.date)==='today';
    return `<div class="p31-item ${late?'late':''}"><div class="p31-icon">${x.icon}</div><div class="p31-main"><b>${safe(x.p.name)} · ${x.label}</b><small>${late?'Überfällig':today?'Heute empfohlen':'Empfohlen am '+fmt(x.date)} · Intervall ${x.interval} Tage</small><span>${safe(x.reason)}</span></div><button onclick="detail('${x.p.id}')">Details</button></div>`
  }).join(''):`<div class="p31-empty">Noch keine Pflanzen für eine Empfehlung vorhanden.</div>`;
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

function renderReminders(){const dueW=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length,dueF=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;const box=$('p25-reminder-panel');if(box)box.innerHTML=`<div class="p25-head"><div><div class="p25-title">🔔 Pflege-Erinnerungen</div><div class="p25-sub">Automatisch aus deinen Intervallen berechnet.</div></div><div class="p25-summary"><span>💧 ${dueW} fällig</span><span>🌱 ${dueF} fällig</span></div></div>`}
$('logout').onclick=()=>db.auth.signOut();db.auth.onAuthStateChange((_,s)=>s?load():auth());fillCatalog();session();
