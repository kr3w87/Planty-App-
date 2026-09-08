const SUPABASE_URL="https://trmtgocglawidplcagzc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_NbJQhCF0GKDljAB2cOxhpw_Lva2P51L";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let signup=false,current=null,plants=[],photoCache=new Map();
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const dateObj=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?null:x};
const fmt=d=>{const x=dateObj(d);return x?new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(x):"—"};
const daysUntil=(d)=>{const x=dateObj(d);if(!x)return null;const a=new Date();a.setHours(0,0,0,0);x.setHours(0,0,0,0);return Math.round((x-a)/86400000)};
const dueDate=(last,interval)=>{const x=dateObj(last);if(!x||!interval)return null;x.setDate(x.getDate()+Number(interval));return x};
const due=(last,interval)=>{const x=dueDate(last,interval);return x?x<=new Date():false};
const catalog=Array.isArray(window.PLANT_DATABASE)?window.PLANT_DATABASE:[];

function fillCatalog(){
  $("plantType").innerHTML='<option value="">Bitte auswählen…</option>'+catalog.map((p,i)=>`<option value="${i}">${safe(p.name)} — ${safe(p.botanical)}</option>`).join("");
}
function showPlantType(i){
  const p=catalog[Number(i)];
  if(!p){$("plantInfo").classList.add("hidden");return;}
  $("plantType").value=String(i);$("plantInfo").classList.remove("hidden");
  $("plantInfo").innerHTML=`<b>${safe(p.name)}</b><br>☀️ ${safe(p.light)} · 💧 alle ${p.watering} Tage · 🌱 alle ${p.fertilizing} Tage`;
  $("name").placeholder=`Eigener Name, z. B. Meine ${p.name}`;
  $("plantCatalogSelected").hidden=false;$("plantCatalogSelected").innerHTML=`<strong>${safe(p.name)}</strong><br><small>${safe(p.botanical)} · ${safe(p.light)}</small>`;
}
function renderCatalogSearch(){
  const q=$("plantCatalogSearch").value.toLowerCase().trim();
  const matches=!q?[]:catalog.filter(p=>(p.name+" "+p.botanical).toLowerCase().includes(q)).slice(0,15);
  $("plantCatalogResults").innerHTML=matches.map(p=>{const i=catalog.indexOf(p);return `<div class="plant-catalog-item" data-i="${i}"><strong>${safe(p.name)}</strong><small>${safe(p.botanical)} · ${safe(p.light)}</small></div>`}).join("");
  $("plantCatalogResults").querySelectorAll("[data-i]").forEach(el=>el.onclick=()=>{showPlantType(el.dataset.i);$("plantCatalogSearch").value=catalog[Number(el.dataset.i)].name;$("plantCatalogResults").innerHTML=""});
}

function auth(){$("auth").classList.remove("hidden");$("app").classList.add("hidden")}
async function session(){const r=await db.auth.getSession();r.data.session?load():auth()}
$("mode").onclick=()=>{signup=!signup;$("title").textContent=signup?"Konto erstellen":"Willkommen zurück";$("authBtn").textContent=signup?"REGISTRIEREN":"ANMELDEN";$("mode").textContent=signup?"Schon registriert? Anmelden":"Noch kein Konto? Registrieren"};
$("authForm").onsubmit=async e=>{e.preventDefault();$("authMsg").textContent="";const r=signup?await db.auth.signUp({email:$("email").value,password:$("password").value}):await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(r.error){$("authMsg").textContent=r.error.message;return}if(signup&&!r.data.session){$("authMsg").textContent="Konto erstellt. Bitte prüfe deine E-Mail.";return}load()};

async function signed(path){const r=await db.storage.from("plant-photos").createSignedUrl(path,3600);return r.data?.signedUrl||""}
async function photosFor(id){if(photoCache.has(id))return photoCache.get(id);const r=await db.from("plant_photos").select("*").eq("plant_id",id).order("taken_at",{ascending:false});const rows=r.data||[];for(const p of rows)p.url=await signed(p.photo_path);photoCache.set(id,rows);return rows}
async function latestPhoto(id){const ps=await photosFor(id);return ps[0]||null}

function reminderBadge(date,kind){const n=daysUntil(date),word=kind==="fert"?"Düngen":"Gießen";if(n===null)return"";if(n<0)return`<span class="p25-pill overdue">🔴 ${word} überfällig</span>`;if(n===0)return`<span class="p25-pill today">🟡 Heute ${word.toLowerCase()}</span>`;if(n===1)return`<span class="p25-pill soon">🟠 Morgen ${word.toLowerCase()}</span>`;return`<span class="p25-pill normal">🟢 ${word}: in ${n} Tagen</span>`}
function renderReminders(){
  let w=0,f=0,o=0;plants.forEach(p=>{const a=daysUntil(dueDate(p.last_watered_at,p.watering_interval_days)),b=daysUntil(dueDate(p.last_fertilized_at,p.fertilizing_interval_days));if(a!==null&&a<=0)w++;if(b!==null&&b<=0)f++;if(a!==null&&a<0)o++;if(b!==null&&b<0)o++});
  $("p25-reminder-panel").innerHTML=`<div class="p25-head"><div><div class="p25-title">🔔 Pflege-Erinnerungen</div><div class="p25-sub">Automatisch aus deinen Intervallen berechnet.</div></div><div class="p25-summary"><span>💧 ${w} fällig</span><span>🌱 ${f} fällig</span><span>🔴 ${o} überfällig</span></div></div><div class="p25-list">${plants.map(p=>`<div class="p25-item"><strong>${safe(p.name)}</strong><div class="p25-pills">${reminderBadge(dueDate(p.last_watered_at,p.watering_interval_days),"water")}${reminderBadge(dueDate(p.last_fertilized_at,p.fertilizing_interval_days),"fert")}</div></div>`).join("")}</div>`;
}

async function load(){
  const r=await db.from("plants").select("*").order("created_at",{ascending:false});
  if(r.error){alert(r.error.message);return} plants=r.data||[];photoCache.clear();
  $("auth").classList.add("hidden");$("app").classList.remove("hidden");$("count").textContent=plants.length;
  $("water").textContent=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length;
  $("fert").textContent=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;
  const u=(await db.auth.getUser()).data.user;const h=await db.from("plant_health_logs").select("plant_id").eq("user_id",u.id);$("issues").textContent=new Set((h.data||[]).map(x=>x.plant_id)).size;
  $("welcome").textContent=plants.length?"Dein grünes Zuhause ist gut versorgt.":"Lege deine erste Pflanze an.";renderReminders();
  const tasks=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).map(p=>`<div class="task">💧 <span><b>${safe(p.name)}</b><br><small>Gießen</small></span><button onclick="water('${p.id}')">Gegossen ✓</button></div>`);
  $("tasks").innerHTML=tasks.length?tasks.slice(0,8).join(""):"<div class='task'>♡ Heute ist alles erledigt</div>";
  let html="";for(const p of plants){const ph=await latestPhoto(p.id);html+=`<div class="plant" data-plant-id="${p.id}" onclick="detail('${p.id}')"><div class="pic">${ph?.url?`<img src="${ph.url}" alt="${safe(p.name)}">`:"🌿"}</div><h3>${safe(p.name)}</h3><p>${safe(p.species||"Zimmerpflanze")} · ${safe(p.location||"")}</p>${reminderBadge(dueDate(p.last_watered_at,p.watering_interval_days),"water")}</div>`}
  $("plants").innerHTML=html+`<div class="plant addplant" onclick="openModal()">＋ Pflanze hinzufügen</div>`;applyFilter();
}
window.water=async id=>{const r=await db.from("plants").update({last_watered_at:new Date().toISOString()}).eq("id",id);if(r.error)alert(r.error.message);else load()};
window.openModal=()=>{$("plantForm").reset();$("preview").innerHTML="🌿";$("plantInfo").classList.add("hidden");$("plantCatalogSelected").hidden=true;$("plantCatalogResults").innerHTML="";$("modal").classList.remove("hidden")};
$("add").onclick=openModal;$("close").onclick=()=>$("modal").classList.add("hidden");$("plantType").onchange=e=>showPlantType(e.target.value);$("plantCatalogSearch").oninput=renderCatalogSearch;
$("plantPhoto").onchange=e=>{const f=e.target.files[0];if(f)$("preview").innerHTML=`<img src="${URL.createObjectURL(f)}" alt="Vorschau">`};

$("plantForm").onsubmit=async e=>{e.preventDefault();const c=catalog[+$('plantType').value];if(!c)return;const u=(await db.auth.getUser()).data.user,n=new Date().toISOString();const r=await db.from("plants").insert({user_id:u.id,name:$("name").value.trim()||c.name,species:c.botanical,location:$("location").value.trim(),light_level:c.light,watering_interval_days:c.watering,last_watered_at:n,fertilizing_interval_days:c.fertilizing,last_fertilized_at:n,health_status:"Gut",notes:$("notes").value.trim()}).select().single();if(r.error){$("saveMsg").textContent=r.error.message;return}const f=$("plantPhoto").files[0];if(f){const ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const path=`${u.id}/${r.data.id}/${crypto.randomUUID()}.${ext}`;const up=await db.storage.from("plant-photos").upload(path,f,{contentType:f.type||"image/jpeg"});if(!up.error)await db.from("plant_photos").insert({plant_id:r.data.id,user_id:u.id,photo_path:path,note:"Startfoto",taken_at:n})}$("modal").classList.add("hidden");load()};

window.detail=async id=>{current=plants.find(p=>p.id===id);if(!current)return;$("detailName").textContent=current.name;$("detailBody").innerHTML="<p>Album wird geladen …</p>";$("detail").classList.remove("hidden");const [ps,health]=await Promise.all([photosFor(id),db.from("plant_health_logs").select("*").eq("plant_id",id).order("created_at",{ascending:false})]);
  const growth=ps.length?ps.map(p=>`<div class="timeline-item"><div class="timeline-dot">🌱</div><div class="timeline-card"><img src="${p.url}" alt="${safe(p.note||"Wachstumsfoto")}"><div><b>${fmt(p.taken_at)}</b><small>${safe(p.note||"Wachstumsfoto")}</small></div></div></div>`).join(""):"<div class='empty-state'>Noch keine Wachstumsfotos. 📸</div>";
  const gallery=ps.length?ps.map(p=>`<div class="photo"><img src="${p.url}" alt="${safe(p.note||"")}"><small>${fmt(p.taken_at)}${p.note?` · ${safe(p.note)}`:""}</small></div>`).join(""):"<div class='empty-state'>Das Album ist noch leer.</div>";
  const healthHtml=(health.data||[]).length?(health.data||[]).map(x=>`<div class="health"><b>${safe(x.problem||"Beobachtung")}</b> <span class="badge ${x.severity==="Hoch"?"high":x.severity==="Mittel"?"mid":""}">${safe(x.severity||"")}</span><br><small>${safe(x.description||"")} · ${fmt(x.created_at)}</small></div>`).join(""):"<div class='empty-state'>Keine Gesundheitsnotizen.</div>";
  $("detailBody").innerHTML=`<div class="metaGrid"><div class="meta"><small>Art</small>${safe(current.species)}</div><div class="meta"><small>Standort</small>${safe(current.location||"—")}</div><div class="meta"><small>Licht</small>${safe(current.light_level||"—")}</div><div class="meta"><small>Letztes Foto</small>${ps[0]?fmt(ps[0].taken_at):"—"}</div></div><div class="actions"><button onclick="openPhotoModal('${id}')">📸 Foto hinzufügen</button><button onclick="openHealthModal('${id}')">🩺 Gesundheit notieren</button></div><h3>📸 Fotoalbum <span class="badge">${ps.length} Fotos</span></h3><div class="photos">${gallery}</div><h3>🌱 Wachstumsverlauf</h3><div class="timeline">${growth}</div><h3>🩺 Gesundheit</h3>${healthHtml}`;
};
$("detailClose").onclick=()=>$("detail").classList.add("hidden");
window.openPhotoModal=id=>{current=plants.find(p=>p.id===id)||current;$("photoForm").reset();$("photoMsg").textContent="";$("photoModal").classList.remove("hidden")};$("photoClose").onclick=()=>$("photoModal").classList.add("hidden");
$("photoForm").onsubmit=async e=>{e.preventDefault();if(!current)return;const f=$("growthPhoto").files[0];if(!f)return;const u=(await db.auth.getUser()).data.user,n=new Date().toISOString(),ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg",path=`${u.id}/${current.id}/${crypto.randomUUID()}.${ext}`;const up=await db.storage.from("plant-photos").upload(path,f,{contentType:f.type||"image/jpeg"});if(up.error){$("photoMsg").textContent=up.error.message;return}const ins=await db.from("plant_photos").insert({plant_id:current.id,user_id:u.id,photo_path:path,note:$("growthNote").value.trim()||"Wachstumsfoto",taken_at:n});if(ins.error){$("photoMsg").textContent=ins.error.message;return}$("photoModal").classList.add("hidden");photoCache.delete(current.id);detail(current.id);load()};

window.openHealthModal=id=>{current=plants.find(p=>p.id===id)||current;$("healthForm").reset();$("healthMsg").textContent="";$("healthModal").classList.remove("hidden")};$("healthClose").onclick=()=>$("healthModal").classList.add("hidden");
$("healthForm").onsubmit=async e=>{e.preventDefault();if(!current)return;const u=(await db.auth.getUser()).data.user;r=await db.from("plant_health_logs").insert({plant_id:current.id,user_id:u.id,problem:$("problem").value,severity:$("severity").value,description:$("description").value.trim()});if(r.error){$("healthMsg").textContent=r.error.message;return}$("healthModal").classList.add("hidden");detail(current.id);load()};

function applyFilter(){const q=$("filterInput").value.toLowerCase().trim(),mode=$("filterStatus").value;document.querySelectorAll("#plants > .plant:not(.addplant)").forEach(card=>{const p=plants.find(x=>x.id===card.dataset.plantId);let ok=!q||(p.name+" "+p.species+" "+(p.location||"")).toLowerCase().includes(q);if(mode==="water")ok=ok&&due(p.last_watered_at,p.watering_interval_days);if(mode==="fert")ok=ok&&due(p.last_fertilized_at,p.fertilizing_interval_days);if(mode==="health")ok=ok&&p.health_status&&p.health_status!=="Gut";card.style.display=ok?"":"none"})}
$("filterInput").oninput=applyFilter;$("filterStatus").onchange=applyFilter;
$("logout").onclick=()=>db.auth.signOut();db.auth.onAuthStateChange((_,s)=>s?load():auth());fillCatalog();session();
