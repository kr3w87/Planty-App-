const SUPABASE_URL="https://trmtgocglawidplcagzc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_NbJQhCF0GKDljAB2cOxhpw_Lva2P51L";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let signup=false,current=null,plants=[];
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const days=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+Number(n));return x};
const due=(d,n)=>d&&n&&days(d,n)<=new Date();
const fmt=d=>d?new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d)):"—";
const catalog=Array.isArray(window.PLANT_DATABASE)?window.PLANT_DATABASE:[];
const favoritesKey="planty:favorites";
const getFavs=()=>new Set(JSON.parse(localStorage.getItem(favoritesKey)||"[]"));
const saveFavs=s=>localStorage.setItem(favoritesKey,JSON.stringify([...s]));

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
window.fertilize=async id=>{const r=await db.from('plants').update({last_fertilized_at:new Date().toISOString()}).eq('id',id);if(r.error)alert(r.error.message);else load()};
async function load(){const r=await db.from('plants').select('*').order('created_at',{ascending:false});if(r.error){alert(r.error.message);return}plants=r.data||[];$('auth').classList.add('hidden');$('app').classList.remove('hidden');$('count').textContent=plants.length;$('water').textContent=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length;$('fert').textContent=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;const u=(await db.auth.getUser()).data.user,h=await db.from('plant_health_logs').select('plant_id').eq('user_id',u.id);$('issues').textContent=new Set((h.data||[]).map(x=>x.plant_id)).size;$('welcome').textContent=plants.length?`${plants.length} Pflanzen · bleib dran, sie wachsen mit dir.`:'Lege deine erste Pflanze an.';
 const rooms=[...new Set(plants.map(p=>p.location).filter(Boolean))].sort();if($('filterRoom'))$('filterRoom').innerHTML='<option value="all">Alle Standorte</option>'+rooms.map(r=>`<option>${safe(r)}</option>`).join('');
 const tasks=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).map(p=>`<div class="task">💧 <span><b>${safe(p.name)}</b><br><small>Gießen</small></span><button onclick="water('${p.id}')">Gegossen ✓</button></div>`);$('tasks').innerHTML=tasks.length?tasks.slice(0,8).join(''):'<div class="task">♡ Heute ist alles erledigt</div>';
 let html='';for(const p of plants){const ph=(await photosFor(p.id))[0],url=ph?await signed(ph.photo_path):'';const fav=getFavs().has(p.id);html+=`<div class="plant" data-id="${p.id}" onclick="detail('${p.id}')"><button class="fav-btn ${fav?'active':''}" onclick="event.stopPropagation();toggleFavorite('${p.id}')" aria-label="Favorit">${fav?'♥':'♡'}</button><div class="pic">${url?`<img src="${url}" alt="">`:'🌿'}</div><h3>${safe(p.name)}</h3><p>${safe(p.species||'Zimmerpflanze')} · ${safe(p.location||'Kein Standort')}</p>${due(p.last_watered_at,p.watering_interval_days)?'<span class="badge">💧 Gießen fällig</span>':''}</div>`}$('plants').innerHTML=html+`<div class="plant addplant" onclick="openModal()">＋ Pflanze hinzufügen</div>`;applyFilters();renderReminders();renderCockpit();
}
window.toggleFavorite=id=>{const s=getFavs();s.has(id)?s.delete(id):s.add(id);saveFavs(s);load()};
window.water=async id=>{const r=await db.from('plants').update({last_watered_at:new Date().toISOString()}).eq('id',id);if(r.error)alert(r.error.message);else load()};
window.openModal=()=>{$('plantForm').reset();$('preview').innerHTML='🌿';$('plantInfo').classList.add('hidden');$('plantCatalogSelected').classList.add('hidden');$('plantCatalogSearch').value='';$('plantCatalogResults').innerHTML='';$('modal').classList.remove('hidden')};
$('add').onclick=openModal;$('close').onclick=()=>$('modal').classList.add('hidden');$('plantPhoto').onchange=e=>{const f=e.target.files[0];if(f)$('preview').innerHTML=`<img src="${URL.createObjectURL(f)}">`};
$('plantForm').onsubmit=async e=>{e.preventDefault();const c=catalog[+$('plantType').value];if(!c)return;const u=(await db.auth.getUser()).data.user,n=new Date().toISOString(),r=await db.from('plants').insert({user_id:u.id,name:$('name').value.trim()||c.name,species:c.botanical,location:$('location').value.trim(),light_level:c.light,watering_interval_days:c.watering,last_watered_at:n,fertilizing_interval_days:c.fertilizing,last_fertilized_at:n,health_status:'Gut',notes:$('notes').value.trim()}).select().single();if(r.error){$('saveMsg').textContent=r.error.message;return}const f=$('plantPhoto').files[0];if(f){const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=`${u.id}/${r.data.id}/${crypto.randomUUID()}.${ext}`,up=await db.storage.from('plant-photos').upload(path,f,{contentType:f.type||'image/jpeg'});if(!up.error)await db.from('plant_photos').insert({plant_id:r.data.id,user_id:u.id,photo_path:path,note:'Startfoto',taken_at:n})}$('modal').classList.add('hidden');load()};

window.detail=async id=>{current=plants.find(p=>p.id===id);if(!current)return;$('detailName').textContent=current.name;const [ps,hs]=await Promise.all([photosFor(id),healthFor(id)]);const urls=await Promise.all(ps.map(p=>signed(p.photo_path)));const fav=getFavs().has(id);const first=ps.length?new Date(ps[ps.length-1].taken_at):null,last=ps.length?new Date(ps[0].taken_at):null;const span=first&&last?Math.max(0,Math.round((last-first)/86400000)):0;$('detailBody').innerHTML=`<div class="detail-hero"><div class="detail-species">${safe(current.species||'Zimmerpflanze')}</div><button class="fav-large" onclick="toggleFavorite('${id}')">${fav?'♥ Favorit':'♡ Favorit'}</button></div><div class="metaGrid"><div class="meta">☀️<b>${safe(current.light_level||'—')}</b><small>Licht</small></div><div class="meta">💧<b>${current.watering_interval_days||'—'} Tage</b><small>Gießen</small></div><div class="meta">📸<b>${ps.length}</b><small>Fotos</small></div><div class="meta">🌱<b>${span} Tage</b><small>Dokumentiert</small></div></div><div class="actions"><button onclick="openPhoto('${id}')">📸 Wachstum fotografieren</button><button onclick="openHealth('${id}')">🩺 Beobachtung</button><button onclick="water('${id}')">💧 Gegossen</button></div><h3>📸 Fotoalbum</h3>${ps.length?`<div class="photos">${ps.map((p,i)=>`<div class="photo"><img src="${urls[i]}" alt=""><small>${fmt(p.taken_at)}${p.note?' · '+safe(p.note):''}</small></div>`).join('')}</div>`:'<div class="empty-state">Noch keine Wachstumsfotos.</div>'}<h3>🌱 Wachstumsverlauf</h3>${ps.length?`<div class="timeline">${ps.map((p,i)=>`<div class="timeline-item"><div class="timeline-dot">🌿</div><div class="timeline-card"><img src="${urls[i]}" alt=""><div><b>${fmt(p.taken_at)}</b><small>${safe(p.note||'Wachstumsfoto')}</small></div></div></div>`).join('')}</div>`:'<div class="empty-state">Mach regelmäßig Fotos – so entsteht automatisch deine Zeitlinie.</div>'}<h3>🩺 Beobachtungen</h3>${hs.length?hs.map(h=>`<div class="health"><b>${safe(h.problem||'Beobachtung')}</b> · <span class="badge">${safe(h.severity||'Mittel')}</span><br>${safe(h.description||'') }<small>${fmt(h.created_at)}</small></div>`).join(''):'<div class="empty-state">Keine Beobachtungen eingetragen.</div>'}<h3>📝 Notizen</h3><div class="health">${safe(current.notes||'Keine Notizen.')}</div>`;$('detail').classList.remove('hidden')};
$('detailClose').onclick=()=>$('detail').classList.add('hidden');
window.openPhoto=id=>{current=plants.find(p=>p.id===id);$('photoForm').reset();$('photoModal').classList.remove('hidden')};$('photoClose').onclick=()=>$('photoModal').classList.add('hidden');
$('photoForm').onsubmit=async e=>{e.preventDefault();if(!current)return;const f=$('growthPhoto').files[0],u=(await db.auth.getUser()).data.user;if(!f)return;const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',now=new Date().toISOString(),path=`${u.id}/${current.id}/${crypto.randomUUID()}.${ext}`,up=await db.storage.from('plant-photos').upload(path,f,{contentType:f.type||'image/jpeg'});if(up.error){$('photoMsg').textContent=up.error.message;return}const r=await db.from('plant_photos').insert({plant_id:current.id,user_id:u.id,photo_path:path,note:$('growthNote').value.trim()||'Wachstumsfoto',taken_at:now});if(r.error){$('photoMsg').textContent=r.error.message;return}$('photoModal').classList.add('hidden');detail(current.id);load()};
window.openHealth=id=>{current=plants.find(p=>p.id===id);$('healthForm').reset();$('healthModal').classList.remove('hidden')};$('healthClose').onclick=()=>$('healthModal').classList.add('hidden');
$('healthForm').onsubmit=async e=>{e.preventDefault();const u=(await db.auth.getUser()).data.user,r=await db.from('plant_health_logs').insert({plant_id:current.id,user_id:u.id,problem:$('problem').value,severity:$('severity').value,description:$('description').value.trim()});if(r.error){$('healthMsg').textContent=r.error.message;return}$('healthModal').classList.add('hidden');detail(current.id);load()};
$('filterInput').oninput=applyFilters;$('filterStatus').onchange=applyFilters;$('filterRoom').onchange=applyFilters;
function renderReminders(){const dueW=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length,dueF=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;const box=$('p25-reminder-panel');if(box)box.innerHTML=`<div class="p25-head"><div><div class="p25-title">🔔 Pflege-Erinnerungen</div><div class="p25-sub">Automatisch aus deinen Intervallen berechnet.</div></div><div class="p25-summary"><span>💧 ${dueW} fällig</span><span>🌱 ${dueF} fällig</span></div></div>`}
$('logout').onclick=()=>db.auth.signOut();db.auth.onAuthStateChange((_,s)=>s?load():auth());fillCatalog();session();
