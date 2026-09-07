const SUPABASE_URL="https://trmtgocglawidplcagzc.supabase.co",SUPABASE_PUBLISHABLE_KEY="sb_publishable_NbJQhCF0GKDljAB2cOxhpw_Lva2P51L";const db=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);let signup=false,current=null,plants=[];const $=id=>document.getElementById(id),days=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+Number(n));return x},due=(d,n)=>days(d,n)<=new Date(),fmt=d=>new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d)),safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const CATALOG=[["Monstera deliciosa","Monstera","Hell, indirekt",7,30,"Große Blätter; helles, indirektes Licht."],["Epipremnum aureum","Efeutute","Hell, indirekt",7,30,"Robust und unkompliziert; Staunässe vermeiden."],["Dracaena trifasciata","Bogenhanf","Hell bis Halbschatten",21,60,"Sehr pflegeleicht; Erde gut antrocknen lassen."],["Zamioculcas zamiifolia","Glücksfeder","Halbschatten",21,60,"Speichert Wasser; lieber zu wenig als zu viel gießen."],["Ficus elastica","Gummibaum","Hell, indirekt",10,30,"Hell aufstellen und zwischen Wassergaben antrocknen lassen."],["Calathea","Calathea","Hell, indirekt",7,30,"Mag hohe Luftfeuchtigkeit und keine direkte Sonne."],["Aloe vera","Aloe Vera","Hell",21,60,"Sehr hell; erst gießen, wenn die Erde trocken ist."],["Chlorophytum comosum","Grünlilie","Hell, indirekt",7,30,"Unkompliziert und schnell wachsend."],["Phalaenopsis","Orchidee","Hell, indirekt",10,30,"Helles indirektes Licht; selten, aber gründlich gießen."],["Spathiphyllum","Einblatt","Hell, indirekt",7,30,"Mag gleichmäßige Feuchtigkeit und Luftfeuchtigkeit."]];
function fillCatalog(){$("plantType").innerHTML='<option value="">Bitte auswählen…</option>'+CATALOG.map((p,i)=>`<option value="${i}">${p[1]} — ${p[0]}</option>`).join("")}
$("plantType").onchange=()=>{let p=CATALOG[+$("plantType").value];if(!p){$("plantInfo").classList.add("hidden");return}$("plantInfo").classList.remove("hidden");$("plantInfo").innerHTML=`<b>${p[1]}</b><br>☀️ ${p[2]} · 💧 alle ${p[3]} Tage · 🌱 alle ${p[4]} Tage<br>${p[5]}`;$("name").placeholder=`Eigener Name, z. B. Meine ${p[1]}`};
function auth(){$("auth").classList.remove("hidden");$("app").classList.add("hidden")}async function session(){let r=await db.auth.getSession();r.data.session?load():auth()}
$("mode").onclick=()=>{signup=!signup;$("title").textContent=signup?"Konto erstellen":"Willkommen zurück";$("authBtn").textContent=signup?"REGISTRIEREN":"ANMELDEN";$("mode").textContent=signup?"Schon registriert? Anmelden":"Noch kein Konto? Registrieren"};
$("authForm").onsubmit=async e=>{e.preventDefault();let r=signup?await db.auth.signUp({email:$("email").value,password:$("password").value}):await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(r.error){$("authMsg").textContent=r.error.message;return}if(signup&&!r.data.session){$("authMsg").textContent="Konto erstellt. Bitte prüfe deine E-Mail.";return}load()};
async function signed(path){let r=await db.storage.from("plant-photos").createSignedUrl(path,3600);return r.data?.signedUrl||""}async function latestPhoto(id){let r=await db.from("plant_photos").select("*").eq("plant_id",id).order("taken_at",{ascending:false}).limit(1);return r.data?.[0]||null}
async function load(){let r=await db.from("plants").select("*").order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}plants=r.data||[];$("auth").classList.add("hidden");$("app").classList.remove("hidden");$("count").textContent=plants.length;$("water").textContent=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).length;$("fert").textContent=plants.filter(p=>due(p.last_fertilized_at,p.fertilizing_interval_days)).length;let u=(await db.auth.getUser()).data.user,h=await db.from("plant_health_logs").select("plant_id").eq("user_id",u.id);$("issues").textContent=new Set((h.data||[]).map(x=>x.plant_id)).size;$("welcome").textContent=plants.length?"Dein grünes Zuhause ist gut versorgt.":"Lege deine erste Pflanze an.";let tasks=plants.filter(p=>due(p.last_watered_at,p.watering_interval_days)).map(p=>`<div class="task">💧 <span><b>${safe(p.name)}</b><br><small>Gießen</small></span><button onclick="water('${p.id}')">Gegossen ✓</button></div>`);$("tasks").innerHTML=tasks.length?tasks.slice(0,8).join(""):"<div class='task'>♡ Heute ist alles erledigt</div>";let html="";for(let p of plants){let ph=await latestPhoto(p.id),url=ph?await signed(ph.photo_path):"";html+=`<div class="plant" onclick="detail('${p.id}')"><div class="pic">${url?`<img src="${url}" alt="">`:"🌿"}</div><h3>${safe(p.name)}</h3><p>${safe(p.species||"Zimmerpflanze")} · ${safe(p.location||"")}</p></div>`}$("plants").innerHTML=html+`<div class="plant addplant" onclick="openModal()">＋ Pflanze hinzufügen</div>`}
window.water=async id=>{let r=await db.from("plants").update({last_watered_at:new Date().toISOString()}).eq("id",id);if(r.error)alert(r.error.message);else load()};
window.openModal=()=>{$("plantForm").reset();$("preview").innerHTML="🌿";$("plantInfo").classList.add("hidden");$("modal").classList.remove("hidden")};$("add").onclick=openModal;$("close").onclick=()=>$("modal").classList.add("hidden");$("plantPhoto").onchange=e=>{let f=e.target.files[0];if(f)$("preview").innerHTML=`<img src="${URL.createObjectURL(f)}">`};
$("plantForm").onsubmit=async e=>{e.preventDefault();let c=CATALOG[+$("plantType").value];if(!c)return;let u=(await db.auth.getUser()).data.user,n=new Date().toISOString(),r=await db.from("plants").insert({user_id:u.id,name:$("name").value.trim()||c[1],species:c[0],location:$("location").value.trim(),light_level:c[2],watering_interval_days:c[3],last_watered_at:n,fertilizing_interval_days:c[4],last_fertilized_at:n,health_status:"Gut",notes:$("notes").value.trim()}).select().single();if(r.error){$("saveMsg").textContent=r.error.message;return}let f=$("plantPhoto").files[0];if(f){let ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,""),path=`${u.id}/${r.data.id}/${crypto.randomUUID()}.${ext}`,up=await db.storage.from("plant-photos").upload(path,f,{contentType:f.type||"image/jpeg"});if(!up.error)await db.from("plant_photos").insert({plant_id:r.data.id,user_id:u.id,photo_path:path,note:"Startfoto"})}$("modal").classList.add("hidden");load()};
$("logout").onclick=()=>db.auth.signOut();db.auth.onAuthStateChange((_,s)=>s?load():auth());fillCatalog();session();

/* Planty V2.3 – Pflanzendatenbank-Suche */
(function(){
  const catalog =
    (typeof PLANT_DATABASE !== "undefined" && Array.isArray(PLANT_DATABASE)) ? PLANT_DATABASE :
    (typeof plantDatabase !== "undefined" && Array.isArray(plantDatabase)) ? plantDatabase :
    (typeof plantsDatabase !== "undefined" && Array.isArray(plantsDatabase)) ? plantsDatabase : [];

  const search=document.getElementById("plantCatalogSearch");
  const results=document.getElementById("plantCatalogResults");
  const selectedBox=document.getElementById("plantCatalogSelected");
  if(!search || !results || !catalog.length) return;

  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function findField(keys){
    for(const key of keys){
      const el=document.getElementById(key);
      if(el) return el;
    }
    for(const el of document.querySelectorAll("input,textarea,select")){
      const id=(el.id||"")+" "+(el.name||"")+" "+(el.placeholder||"");
      if(keys.some(k=>norm(id).includes(norm(k)))) return el;
    }
    return null;
  }
  function setField(keys,val){
    const el=findField(keys);
    if(el && val!=null){
      el.value=val;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    }
  }
  function choose(p){
    setField(["plantName","name","plant-name","pflanzenname"],p.name||"");
    setField(["species","plantSpecies","plant-species","art"],p.botanical||p.name||"");
    setField(["light_level","lightLevel","light","licht"],p.light||"");
    setField(["watering_interval_days","wateringInterval","watering","giessen","gießen"],p.watering||7);
    setField(["fertilizing_interval_days","fertilizingInterval","fertilizing","duengen","düngen"],p.fertilizing||30);
    selectedBox.hidden=false;
    selectedBox.innerHTML="<strong>"+esc(p.name||"")+"</strong><br><small>"+esc(p.botanical||"")+" · "+esc(p.light||"")+"</small>";
    results.innerHTML="";
    search.value=p.name||"";
  }
  function render(){
    const q=norm(search.value);
    if(!q){results.innerHTML="";return}
    const matches=catalog.filter(p=>norm(p.name).includes(q)||norm(p.botanical).includes(q)).slice(0,15);
    results.innerHTML=matches.length ? matches.map((p,i)=>
      '<div class="plant-catalog-item" data-i="'+i+'"><strong>'+esc(p.name)+'</strong><small>'+esc(p.botanical||"")+' · '+esc(p.light||"")+'</small></div>'
    ).join("") : '<div class="plant-catalog-item">Keine passende Pflanze gefunden.</div>';
    results.querySelectorAll("[data-i]").forEach(el=>el.addEventListener("click",()=>choose(matches[Number(el.dataset.i)])));
  }
  search.addEventListener("input",render);
})();



/* Planty V2.4 – Verbesserte Pflanzenübersicht */
(function () {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  function parseDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function daysUntil(date) {
    if (!date) return null;
    const now = new Date();
    now.setHours(0,0,0,0);
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return Math.round((d-now)/86400000);
  }

  function nextDue(last, interval) {
    if (!last || !interval) return null;
    const d = parseDate(last);
    if (!d) return null;
    d.setDate(d.getDate() + Number(interval));
    return d;
  }

  function dueLabel(date, kind) {
    const days = daysUntil(date);
    if (days === null) return "";
    const word = kind === "fert" ? "Düngen" : "Gießen";
    if (days < 0) return `<span class="p24-badge p24-overdue">⚠ ${word} überfällig</span>`;
    if (days === 0) return `<span class="p24-badge p24-today">💧 Heute ${word.toLowerCase()}</span>`;
    if (days === 1) return `<span class="p24-badge p24-soon">⏰ Morgen ${word.toLowerCase()}</span>`;
    return `<span class="p24-badge p24-normal">${word}: in ${days} Tagen</span>`;
  }

  function getPlantImage(plant, photoMap) {
    const p = photoMap && photoMap[plant.id];
    return p ? p : "";
  }

  function decorateCards() {
    // Try common dashboard containers and plant card selectors without breaking V2.3.
    const containers = document.querySelectorAll(
      "#plants-list, #plant-list, .plants-list, .plant-grid, .plants-grid, [data-plants-list]"
    );
    if (!containers.length) return;

    containers.forEach(container => {
      const cards = Array.from(container.children).filter(el =>
        el.querySelector?.("[data-plant-id], .plant-card, .plant-name, h3, h4")
      );
      if (!cards.length) return;

      cards.forEach(card => {
        if (card.querySelector(".p24-overview-extra")) return;

        const text = card.innerText || "";
        const button = Array.from(card.querySelectorAll("button")).find(b =>
          /gieß|wasser|water/i.test(b.textContent || "")
        );

        const box = document.createElement("div");
        box.className = "p24-overview-extra";
        box.innerHTML = `
          <div class="p24-reminders">
            <span class="p24-badge p24-normal">🌿 Pflanzenübersicht</span>
          </div>
          <div class="p24-health">
            <span>💚 Status: gesund</span>
          </div>
        `;
        card.appendChild(box);

        if (button) {
          button.classList.add("p24-water-btn");
        }
      });
    });
  }

  function addOverviewTools() {
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).filter(h =>
      /meine pflanzen|pflanzenübersicht|meine pflanzen/i.test(h.textContent || "")
    );
    if (!headings.length) return;

    const heading = headings[0];
    if (document.querySelector(".p24-overview-tools")) return;

    const tools = document.createElement("div");
    tools.className = "p24-overview-tools";
    tools.innerHTML = `
      <div class="p24-tool-title">🌿 Meine Pflanzen</div>
      <input id="p24-filter-input" type="search" placeholder="Pflanzen suchen …" aria-label="Pflanzen suchen">
      <select id="p24-filter-status" aria-label="Pflanzen filtern">
        <option value="all">Alle Pflanzen</option>
        <option value="water">Bald gießen</option>
        <option value="fert">Bald düngen</option>
        <option value="health">Mit Gesundheitsnotiz</option>
      </select>
    `;
    heading.parentNode.insertBefore(tools, heading.nextSibling);

    const input = tools.querySelector("#p24-filter-input");
    const status = tools.querySelector("#p24-filter-status");

    const apply = () => {
      const q = (input.value || "").toLowerCase().trim();
      const mode = status.value;
      const selectors = "#plants-list > *, #plant-list > *, .plants-list > *, .plant-grid > *, .plants-grid > *, [data-plants-list] > *";
      document.querySelectorAll(selectors).forEach(card => {
        const t = (card.innerText || "").toLowerCase();
        let ok = !q || t.includes(q);
        if (mode === "water") ok = ok && /heute gießen|morgen gießen|gießen: in [01] tagen|gießen: in 2 tagen|gießen: in 3 tagen/i.test(t);
        if (mode === "fert") ok = ok && /heute düngen|morgen düngen|düngen: in [0123] tagen/i.test(t);
        if (mode === "health") ok = ok && /gesundheit|schädling|gelb|krank|problem/i.test(t);
        card.style.display = ok ? "" : "none";
      });
    };
    input.addEventListener("input", apply);
    status.addEventListener("change", apply);
  }

  // Observe UI changes caused by the existing app's render functions.
  const observer = new MutationObserver(() => {
    clearTimeout(window.__p24Timer);
    window.__p24Timer = setTimeout(() => {
      addOverviewTools();
      decorateCards();
    }, 120);
  });
  observer.observe(document.body, {childList:true, subtree:true});

  window.addEventListener("load", () => {
    setTimeout(addOverviewTools, 300);
    setTimeout(decorateCards, 600);
  });
})();



/* Planty V2.5 – Pflege-Erinnerungen */
(function(){
  const D=v=>{if(!v)return null;const d=new Date(v);return isNaN(d)?null:d};
  const due=(last,n)=>{const d=D(last);if(!d||!n)return null;d.setDate(d.getDate()+Number(n));return d};
  const diff=d=>{if(!d)return null;const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);return Math.round((b-a)/86400000)};
  const badge=(d,t)=>{const n=diff(d),l=t==="fert"?"Düngen":"Gießen";if(n===null)return "";
    if(n<0)return `<span class="p25-pill overdue">🔴 ${l} überfällig</span>`;
    if(n===0)return `<span class="p25-pill today">🟡 Heute ${l.toLowerCase()}</span>`;
    if(n===1)return `<span class="p25-pill soon">🟠 Morgen ${l.toLowerCase()}</span>`;
    return `<span class="p25-pill normal">🟢 ${l}: in ${n} Tagen</span>`};
  function get(){for(const k of ["plants","myPlants","userPlants","allPlants"])if(Array.isArray(window[k]))return window[k];return[]}
  function render(){
    const ps=get(); if(!ps.length)return;
    let w=0,f=0,o=0;
    ps.forEach(p=>{const a=diff(due(p.last_watered_at,p.watering_interval_days)),b=diff(due(p.last_fertilized_at,p.fertilizing_interval_days));
      if(a!==null&&a<=0)w++;if(b!==null&&b<=0)f++;if(a!==null&&a<0)o++;if(b!==null&&b<0)o++});
    let box=document.getElementById("p25-reminder-panel");
    if(!box){const main=document.querySelector("main")||document.body;box=document.createElement("section");box.id="p25-reminder-panel";box.className="p25-panel";main.insertBefore(box,main.firstChild)}
    box.innerHTML=`<div class="p25-head"><div><div class="p25-title">🔔 Pflege-Erinnerungen</div><div class="p25-sub">Automatisch aus deinen Intervallen berechnet.</div></div><div class="p25-summary"><span>💧 ${w} fällig</span><span>🌱 ${f} fällig</span><span>🔴 ${o} überfällig</span></div></div><div class="p25-list">`+
      ps.map(p=>`<div class="p25-item"><strong>${String(p.name||"Pflanze").replace(/[&<>"]/g,"")}</strong><div class="p25-pills">${badge(due(p.last_watered_at,p.watering_interval_days),"water")}${badge(due(p.last_fertilized_at,p.fertilizing_interval_days),"fert")}</div></div>`).join("")+
      `</div>`;
  }
  window.addEventListener("load",()=>setTimeout(render,1200));
  setInterval(render,60000);
})();
