const KEY="planty_v1";
let plants=JSON.parse(localStorage.getItem(KEY)||"[]");
const $=s=>document.querySelector(s);
const save=()=>localStorage.setItem(KEY,JSON.stringify(plants));
const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+Number(days));return d};
const day=(d)=>new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(new Date(d));
const isDue=(d)=>new Date(d)<=new Date();
const placeholder=["🪴","🌿","🌱","🌵"];

function render(){
 $("#plantCount").textContent=plants.length;
 const water=plants.filter(p=>isDue(addDays(p.lastWatered,p.waterInterval))).length;
 const fert=plants.filter(p=>isDue(addDays(p.lastFertilized,p.fertInterval))).length;
 const health=plants.filter(p=>p.health!=="Gut").length;
 $("#waterCount").textContent=water;$("#fertCount").textContent=fert;$("#healthCount").textContent=health;
 const due=[...plants.filter(p=>isDue(addDays(p.lastWatered,p.waterInterval))).map(p=>({p,type:"water"})),
            ...plants.filter(p=>isDue(addDays(p.lastFertilized,p.fertInterval))).map(p=>({p,type:"fert"}))].slice(0,6);
 $("#tasks").innerHTML=due.length?due.map(({p,type})=>`
 <div class="task"><div class="task-info"><div class="thumb">${p.photo?`<img class="thumb" src="${p.photo}">`:placeholder[p.id%4]}</div>
 <div><strong>${esc(p.name)}</strong><small>${type==="water"?"💧 Wasser benötigt":"🌱 Düngen"} · ${type==="water"?`zuletzt ${day(p.lastWatered)}`:`zuletzt ${day(p.lastFertilized)}`}</small></div></div>
 <button class="check" onclick="complete('${p.id}','${type}')">${type==="water"?"Gegossen ✓":"Gedüngt ✓"}</button></div>`).join(""):
 `<div class="task"><div class="task-info"><div class="thumb">♡</div><div><strong>Alles erledigt</strong><small>Deine Pflanzen sind versorgt.</small></div></div></div>`;
 $("#plantsGrid").innerHTML=plants.length?plants.map(p=>`
 <article class="plant-card" onclick="openDetail('${p.id}')">
   ${p.photo?`<img class="plant-photo" src="${p.photo}">`:`<div class="plant-photo">${placeholder[p.id%4]}</div>`}
   <div class="plant-card-body"><h3>${esc(p.name)}</h3><p>${esc(p.species||"Zimmerpflanze")}</p></div>
 </article>`).join("")+`<article class="plant-card add-card" onclick="openAdd()">＋ Pflanze hinzufügen</article>`:
 `<article class="plant-card add-card" onclick="openAdd()">＋ Erste Pflanze hinzufügen</article>`;
}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openAdd(){$("#plantModal").classList.remove("hidden")}
function closeAdd(){$("#plantModal").classList.add("hidden")}
$("#addBtn").onclick=openAdd;$("#addMain").onclick=openAdd;$("#closeModal").onclick=closeAdd;
$("#photoPreview").onclick=()=>$("#photo").click();
$("#photo").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>$("#photoPreview").innerHTML=`<img src="${r.result}">`;r.readAsDataURL(f)};
$("#plantForm").onsubmit=e=>{e.preventDefault();const now=new Date().toISOString();
 const file=$("#photo").files[0];const finish=(photo)=>{const p={id:crypto.randomUUID(),name:$("#name").value.trim(),species:$("#species").value.trim(),location:$("#location").value.trim(),light:$("#light").value,waterInterval:+$("#waterInterval").value,fertInterval:+$("#fertInterval").value,lastWatered:now,lastFertilized:now,health:"Gut",notes:$("#notes").value.trim(),photo:photo||""};plants.push(p);save();e.target.reset();$("#photoPreview").innerHTML="📷<span>Foto auswählen</span>";closeAdd();render()};
 if(file){const r=new FileReader();r.onload=()=>finish(r.result);r.readAsDataURL(file)}else finish("");
};
window.complete=(id,type)=>{const p=plants.find(x=>x.id===id);if(!p)return;if(type==="water")p.lastWatered=new Date().toISOString();else p.lastFertilized=new Date().toISOString();save();render()};
window.openDetail=id=>{const p=plants.find(x=>x.id===id);if(!p)return;$("#detailName").textContent=p.name;$("#detailBody").innerHTML=`
 ${p.photo?`<img class="detail-photo" src="${p.photo}">`:`<div class="detail-photo" style="display:grid;place-items:center;font-size:70px">${placeholder[p.id%4]}</div>`}
 <div class="detail-meta"><div class="meta"><small>📍 Standort</small><strong>${esc(p.location||"Nicht angegeben")}</strong></div><div class="meta"><small>☀️ Licht</small><strong>${esc(p.light)}</strong></div>
 <div class="meta"><small>💧 Nächstes Gießen</small><strong>${day(addDays(p.lastWatered,p.waterInterval))}</strong></div><div class="meta"><small>🌱 Nächster Dünger</small><strong>${day(addDays(p.lastFertilized,p.fertInterval))}</strong></div></div>
 <p>${esc(p.notes||"Keine Notizen.")}</p><div class="detail-actions"><button onclick="complete('${p.id}','water');openDetail('${p.id}')">💧 Gegossen</button><button onclick="complete('${p.id}','fert');openDetail('${p.id}')">🌱 Gedüngt</button></div>`;$("#detailModal").classList.remove("hidden")};
$("#closeDetail").onclick=()=>$("#detailModal").classList.add("hidden");
$("#notifyBtn").onclick=()=>alert("Planty V1 speichert deine Pflege lokal. Push-Benachrichtigungen kommen in einer späteren Version.");
$("#showAllBtn").onclick=()=>window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
render();
