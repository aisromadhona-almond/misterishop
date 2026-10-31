const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
const missionEl = $("mission"), nearbyEl = $("nearby"), dialogueEl = $("dialogue");
const coinsEl = $("coins"), scoreEl = $("score");
const keys = {};
const player = { x: 480, y: 550, r: 17, speed: 3.1, face: "up", step: 0 };
let coins = 0, score = 0;
let solved = {}, attempts = {}, revealed = {};
let currentShop = null;
let modalOpen = false;

/* ===== Data soal (sama dengan website Mystery Shop) ===== */
const MISSIONS = {
  alat: {
    n: 1, tag: "LEVEL 1 · MUDAH", title: "Stationery Shop",
    desc: "Label harga alat tulis menghilang. Bantu Miko menemukannya!",
    receipts: [["TRANSAKSI #001", "✏️ ✏️ + 📒", "Rp16.000"], ["TRANSAKSI #002", "✏️ + 📒 📒", "Rp14.000"]],
    who: ["pensil", "buku"], vars: ["Harga pensil (x)", "Harga buku (y)"],
    task: "Misalkan <b>x</b> adalah harga pensil dan <b>y</b> adalah harga buku (dalam ribuan rupiah).",
    guess: "🤔 <b>Coba tebak bareng-bareng:</b> bagaimana model matematika dari kedua struk di samping?",
    model: ["2x + y = 16", "x + 2y = 14"], answer: { x: 6, y: 4 },
    next: "Fruit Shop terbuka."
  },
  buah: {
    n: 2, tag: "LEVEL 2 · MENENGAH", title: "Fruit Shop",
    desc: "Sekarang bantu Miko menemukan harga buah-buahan!",
    receipts: [["TRANSAKSI #003", "🍎 🍎 🍎 + 🍊 🍊", "Rp23.000"], ["TRANSAKSI #004", "🍎 + 🍊", "Rp9.000"]],
    who: ["apel", "jeruk"], vars: ["Harga apel (x)", "Harga jeruk (y)"],
    task: "Misalkan <b>x</b> adalah harga apel dan <b>y</b> adalah harga jeruk (dalam ribuan rupiah).",
    guess: "🤔 <b>Giliran kelas menebak:</b> tulis dulu model matematikanya sebelum melihat petunjuk!",
    model: ["3x + 2y = 23", "x + y = 9"], answer: { x: 5, y: 4 },
    next: "Checkout Counter terbuka."
  },
  kasir: {
    n: 3, tag: "FINAL MISSION", title: "Checkout Counter",
    desc: "Hitung total belanja Miko sebelum meninggalkan toko.",
    basket: [["✏️ Pensil", "3 buah"], ["📒 Buku", "2 buah"], ["🍎 Apel", "2 buah"], ["🍊 Jeruk", "3 buah"]],
    notes: [["✏️ Pensil", "Rp6.000"], ["📒 Buku", "Rp4.000"], ["🍎 Apel", "Rp5.000"], ["🍊 Jeruk", "Rp4.000"]],
    answer: 48000
  }
};
const ORDER = ["alat", "buah", "kasir"];

const shops = [
  {id:"alat", name:"Stationery Shop", x:210, y:190, w:190, h:110, color:"#f6c98e",
   intro:"Penjaga toko: “Dua pensil dan satu buku harganya Rp16.000. Satu pensil dan dua buku Rp14.000. Bisakah kamu menemukan harga masing-masing?”"},
  {id:"buah", name:"Fruit Shop", x:560, y:190, w:190, h:110, color:"#a8d7b5",
   intro:"Penjual buah: “Tiga apel dan dua jeruk harganya Rp23.000. Satu apel dan satu jeruk Rp9.000. Bantu aku menemukan harganya!”"},
  {id:"kasir", name:"Checkout Counter", x:390, y:370, w:190, h:80, color:"#a9c9e9",
   intro:"Kasir: “Keranjangmu berisi 3 pensil, 2 buku, 2 apel, dan 3 jeruk. Berapa total belanjanya?”"}
];
const obstacles = [
  {x:75,y:95,w:180,h:54},{x:350,y:95,w:180,h:54},{x:625,y:95,w:180,h:54},
  {x:75,y:315,w:180,h:50},{x:705,y:315,w:180,h:50},
  {x:305,y:485,w:350,h:35}
];
const isUnlocked = (id) => { const i = ORDER.indexOf(id); return i === 0 || !!solved[ORDER[i - 1]]; };

function roundedRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}
function drawShelf(o,i){
  roundedRect(o.x,o.y,o.w,o.h,10,"#c9956e","#9b7055");
  roundedRect(o.x+5,o.y+6,o.w-10,18,5,"#f3dfc5");
  const colors=["#f1a6a0","#efcf78","#9bcbb6","#a9bfe5","#c3a6d8"];
  for(let n=0;n<7;n++){
    const xx=o.x+14+n*22;
    roundedRect(xx,o.y+34,14,27,4,colors[(n+i)%colors.length]);
    roundedRect(xx+2,o.y+29,10,7,3,"#fff0d6");
  }
  ctx.fillStyle="#765b49";ctx.font="bold 12px Arial";ctx.textAlign="center";
  ctx.fillText(i===0?"ALAT TULIS":i===1?"SNACK & ROTI":"KEBUTUHAN",o.x+o.w/2,o.y+78);
}
function drawShop(s){
  roundedRect(s.x,s.y,s.w,s.h,14,s.color,"#ffffff");
  ctx.fillStyle="#34445a";ctx.textAlign="center";ctx.font="bold 16px Arial";
  ctx.fillText(s.name,s.x+s.w/2,s.y+25);
  if(s.id==="alat"){
    for(let i=0;i<4;i++){roundedRect(s.x+28+i*36,s.y+43,15,38,4,["#e98e82","#719bc5","#e5b85e","#8dbb9c"][i]);}
    roundedRect(s.x+110,s.y+47,43,32,5,"#f8f0dc","#bba77e");
  }else if(s.id==="buah"){
    ["🍎","🍊","🍏"].forEach((e,i)=>{ctx.font="29px Arial";ctx.fillText(e,s.x+55+i*43,s.y+72);});
  }else{
    roundedRect(s.x+55,s.y+42,80,28,7,"#fff9ed","#7f9bb2");
    ctx.fillStyle="#55718b";ctx.font="bold 12px Arial";ctx.fillText("BAYAR",s.x+95,s.y+60);
  }
}
function drawPlayer(){
  const moving=keys["ArrowUp"]||keys["w"]||keys["ArrowDown"]||keys["s"]||keys["ArrowLeft"]||keys["a"]||keys["ArrowRight"]||keys["d"];
  if(moving)player.step+=0.22;
  const bob=moving?Math.sin(player.step)*2:0;
  // shadow
  ctx.fillStyle="#52685b55";ctx.beginPath();ctx.ellipse(player.x,player.y+18,16,6,0,0,Math.PI*2);ctx.fill();
  // legs
  roundedRect(player.x-10,player.y+4+bob,8,16,4,"#455b75");
  roundedRect(player.x+2,player.y+4-bob,8,16,4,"#455b75");
  // body
  roundedRect(player.x-14,player.y-13+bob,28,27,9,"#e89d75","#bd795b");
  // head and hair
  ctx.fillStyle="#f2c49f";ctx.beginPath();ctx.arc(player.x,player.y-22+bob,12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#4b3b35";ctx.beginPath();ctx.arc(player.x,player.y-26+bob,12,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillRect(player.x-11,player.y-27+bob,22,5);
  ctx.fillStyle="#34445a";ctx.beginPath();ctx.arc(player.x-4,player.y-21+bob,1.4,0,Math.PI*2);ctx.arc(player.x+4,player.y-21+bob,1.4,0,Math.PI*2);ctx.fill();
}
function drawBadge(s){
  const un = isUnlocked(s.id);
  if(solved[s.id]){
    ctx.fillStyle="#4a9b7b";ctx.beginPath();ctx.arc(s.x+s.w-16,s.y+16,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 16px Arial";ctx.textAlign="center";ctx.fillText("✓",s.x+s.w-16,s.y+22);
  }else if(!un){
    ctx.fillStyle="#3b4a5a88";ctx.beginPath();ctx.roundRect(s.x,s.y,s.w,s.h,14);ctx.fill();
    ctx.font="34px Arial";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.fillText("🔒",s.x+s.w/2,s.y+s.h/2+12);
  }
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#e5f0df";ctx.fillRect(0,0,960,600);
  ctx.strokeStyle="#d4e3d0";ctx.lineWidth=1;
  for(let x=0;x<960;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<600;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
  roundedRect(18,18,924,52,14,"#fff8eb","#e8d9c4");
  ctx.fillStyle="#526b61";ctx.font="bold 20px Arial";ctx.textAlign="left";ctx.fillText("🌼 MYSTERY MARKET",40,51);
  ctx.font="13px Arial";ctx.fillStyle="#829387";ctx.fillText("Temukan label harga yang hilang!",720,49);
  obstacles.forEach((o,i)=>drawShelf(o,i));
  shops.forEach(s=>{drawShop(s);drawBadge(s);});
  ["🌿","🪴","🌿","🪴"].forEach((e,i)=>{ctx.font="27px Arial";ctx.textAlign="left";ctx.fillText(e,35+(i%2)*870,220+Math.floor(i/2)*270);});
  drawPlayer();
  if(currentShop){ctx.strokeStyle="#f2a64d";ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(currentShop.x+currentShop.w/2,currentShop.y+currentShop.h/2,65,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
}
function distanceTo(s){return Math.hypot(player.x-(s.x+s.w/2),player.y-(s.y+s.h/2));}
function updateNearby(){
  currentShop=shops.find(s=>distanceTo(s)<105)||null;
  if(!currentShop){nearbyEl.textContent="Jelajahi supermarket. Dekati salah satu area toko.";return;}
  nearbyEl.textContent = isUnlocked(currentShop.id)
    ? `📍 ${currentShop.name} — tekan E untuk berinteraksi`
    : `🔒 ${currentShop.name} — selesaikan misi sebelumnya dulu`;
}
function collides(x,y){
  if(x<28||x>932||y<85||y>570)return true;
  return obstacles.some(o=>x+12>o.x&&x-12<o.x+o.w&&y+12>o.y&&y-12<o.y+o.h);
}
function move(){
  if(modalOpen)return;
  let dx=0,dy=0;
  if(keys["ArrowUp"]||keys["w"]){dy-=1;player.face="up";}
  if(keys["ArrowDown"]||keys["s"]){dy+=1;player.face="down";}
  if(keys["ArrowLeft"]||keys["a"]){dx-=1;player.face="left";}
  if(keys["ArrowRight"]||keys["d"]){dx+=1;player.face="right";}
  if(dx&&dy){dx*=0.707;dy*=0.707;}
  if(!collides(player.x+dx*player.speed,player.y))player.x+=dx*player.speed;
  if(!collides(player.x,player.y+dy*player.speed))player.y+=dy*player.speed;
}

/* ===== UI umum ===== */
function toast(msg){
  const el=$("toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2400);
}
function addScore(p){score+=p;scoreEl.textContent=score;}
function refreshSidebar(){
  const done=ORDER.filter(id=>solved[id]).length;
  $("progressText").textContent=`${done}/3`;
  coinsEl.textContent=coins;scoreEl.textContent=score;
  ORDER.forEach(id=>{
    const li=$("ml-"+id),name=MISSIONS[id].title;
    li.className=solved[id]?"done":(isUnlocked(id)?"":"locked");
    li.textContent=(solved[id]?"✓ ":isUnlocked(id)?"● ":"🔒 ")+name;
  });
  const next=ORDER.find(id=>!solved[id]);
  missionEl.textContent=next?`Misi ${MISSIONS[next].n}: ${MISSIONS[next].title} — ${MISSIONS[next].desc}`:"Semua misi selesai! 🎉";
}

/* ===== Panel soal (modal) ===== */
function pairPane(id,m){
  const rec=m.receipts.map(r=>`<div class="receipt"><span>${r[0]}</span><div>${r[1]}</div><strong>${r[2]}</strong></div>`).join("");
  const copy=m.model.map(e=>`<div class="copy-row"><code>${e}</code><button type="button" data-copy="${e}">Salin</button></div>`).join("");
  return `
  <span class="tag">${m.tag}</span><h2>${m.title}</h2><p class="lead">${m.desc}</p>
  <div class="grid2">
    <div class="card"><div class="label">📩 BUKTI TRANSAKSI</div><p>Pemilik toko memberikan dua struk belanja:</p>${rec}</div>
    <div class="card"><div class="label">🕵️ TUGAS KELAS</div><p>${m.task}</p>
      <div class="ph" data-ph>${m.guess}</div>
      <div class="eq hidden" data-secret>${m.model.map(e=>`<b>${e}</b>`).join("")}</div>
      <button type="button" class="soft" data-reveal>💡 Tampilkan model matematika</button>
      <p><b>Temukan nilai x dan y menggunakan grafik GeoGebra.</b></p>
      <div class="pair">
        <label>${m.vars[0]}<div class="unit"><input data-x type="number" min="0" placeholder="...?"><span>ribu</span></div></label>
        <label>${m.vars[1]}<div class="unit"><input data-y type="number" min="0" placeholder="...?"><span>ribu</span></div></label>
      </div>
      <button type="button" class="check" data-check>Periksa jawaban ✓</button>
      <div class="feedback" data-fb aria-live="polite"></div>
    </div>
  </div>
  <div class="card geo">
    <div class="geo-ins"><b>📈 GeoGebra — ketik persamaan ke kolom input:</b>
      <p class="ph" data-ph>Persamaan akan muncul di sini setelah model matematika ditampilkan. Atau ketik sendiri hasil tebakan kelas!</p>
      <div class="hidden" data-secret>${copy}</div>
      <p>Gunakan alat <b>Intersect / Perpotongan</b> atau klik titik perpotongan kedua garis. Catat koordinatnya, lalu masukkan ke kolom jawaban.</p>
    </div>
    <div class="iframe-wrap"><iframe data-geo title="GeoGebra Graphing Calculator" data-src="https://www.geogebra.org/graphing?embed" allowfullscreen></iframe></div>
    <div class="fallback">Jika GeoGebra tidak tampil, <a href="https://www.geogebra.org/graphing" target="_blank" rel="noopener">buka GeoGebra di tab baru</a>.</div>
  </div>`;
}
function finalPane(id,m){
  return `<div class="final-wrap">
    <span class="tag">${m.tag}</span><h2>${m.title}</h2><p class="lead">${m.desc} Masih ingat harga tiap barang tadi?</p>
    <div class="basket">${m.basket.map(b=>`<div><span>${b[0]}</span><b>${b[1]}</b></div>`).join("")}</div>
    <button type="button" class="soft card-btn" data-notes style="width:100%;background:#f4f0ff;color:#766b9c">📒 Buka catatan harga Miko</button>
    <div class="notes hidden" data-notesbox><b>Catatan harga Miko</b>${m.notes.map(b=>`<div><span>${b[0]}</span><b>${b[1]}</b></div>`).join("")}</div>
    <div class="total" style="margin-top:14px"><label>Berapakah total belanja Miko?
      <div class="unit"><span>Rp</span><input data-final type="text" inputmode="numeric" autocomplete="off" placeholder="Contoh: 48000 atau 48.000"><span>rupiah</span></div></label></div>
    <button type="button" class="check" data-check>Selesaikan checkout ✓</button>
    <div class="feedback" data-fb aria-live="polite"></div>
  </div>`;
}
function setReveal(pane,on){
  pane.querySelectorAll("[data-secret]").forEach(e=>e.classList.toggle("hidden",!on));
  pane.querySelectorAll("[data-ph]").forEach(e=>e.classList.toggle("hidden",on));
  const b=pane.querySelector("[data-reveal]");if(b)b.classList.toggle("hidden",on);
}
function setFb(pane,msg,good){const f=pane.querySelector("[data-fb]");f.textContent=msg;f.className="feedback "+(good?"good":"bad");}

function finishMission(id,pane,okMsg){
  const m=MISSIONS[id];
  attempts[id]=(attempts[id]||0);
  addScore(attempts[id]===1?100:70);
  coins+=10;solved[id]=true;refreshSidebar();
  if(id==="kasir"){
    setTimeout(()=>{closeModal();$("finalScore").textContent=score;$("complete").classList.remove("hidden");modalOpen=true;},1100);
  }else{
    toast("Misi berhasil! "+m.next);
    dialogueEl.textContent=`Miko: “Hebat! ${m.next} Ayo ke toko berikutnya.”`;
    setTimeout(closeModal,1300);
  }
}
function checkPair(id,pane){
  const m=MISSIONS[id],xi=pane.querySelector("[data-x]"),yi=pane.querySelector("[data-y]");
  if(xi.value===""||yi.value===""){setFb(pane,"Isi kedua nilai terlebih dahulu, ya!",false);return;}
  const x=Number(xi.value),y=Number(yi.value),done=solved[id];
  if(!done)attempts[id]=(attempts[id]||0)+1;
  if(x===m.answer.x&&y===m.answer.y){
    setFb(pane,`🎉 Tepat! x = ${m.answer.x} dan y = ${m.answer.y}. Label harga berhasil ditemukan!`,true);
    if(!done)finishMission(id,pane);
  }else setFb(pane,"Belum tepat. Periksa kembali titik potong kedua garis di GeoGebra. Ingat satuannya ribuan rupiah.",false);
}
function checkFinal(id,pane){
  const raw=pane.querySelector("[data-final]").value.replace(/rp|rupiah|[\s.,]/gi,"");
  if(raw===""){setFb(pane,"Masukkan total belanja terlebih dahulu.",false);return;}
  if(!/^\d+$/.test(raw)){setFb(pane,"Tulis angkanya saja, contoh: 48000 atau 48.000.",false);return;}
  const done=solved[id];
  if(!done)attempts[id]=(attempts[id]||0)+1;
  if(Number(raw)===MISSIONS[id].answer){
    setFb(pane,"Checkout berhasil! Total belanja Miko Rp48.000.",true);
    if(!done)finishMission(id,pane);
  }else setFb(pane,"Totalnya belum tepat. Kalikan jumlah tiap barang dengan harganya, lalu jumlahkan semuanya.",false);
}
function buildPanes(){
  const wrap=$("panes");wrap.innerHTML="";
  ORDER.forEach(id=>{
    const m=MISSIONS[id],pane=document.createElement("div");
    pane.className="pane hidden";pane.id="pane-"+id;
    pane.innerHTML=id==="kasir"?finalPane(id,m):pairPane(id,m);
    wrap.appendChild(pane);
    pane.querySelector("[data-check]").addEventListener("click",()=>id==="kasir"?checkFinal(id,pane):checkPair(id,pane));
    pane.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT")pane.querySelector("[data-check]").click();});
    const rv=pane.querySelector("[data-reveal]");
    if(rv)rv.addEventListener("click",()=>setReveal(pane,true));
    pane.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(b.dataset.copy);toast("Persamaan berhasil disalin!");}
      catch(e){toast("Salin persamaan secara manual: "+b.dataset.copy);}
    }));
    const nb=pane.querySelector("[data-notes]");
    if(nb)nb.addEventListener("click",()=>{
      const box=pane.querySelector("[data-notesbox]");box.classList.toggle("hidden");
      nb.textContent=box.classList.contains("hidden")?"📒 Buka catatan harga Miko":"📒 Tutup catatan harga Miko";
    });
  });
}
function openMission(id){
  for(const k in keys)keys[k]=false;
  ORDER.forEach(k=>$("pane-"+k).classList.toggle("hidden",k!==id));
  const f=$("pane-"+id).querySelector("[data-geo]");
  if(f&&!f.getAttribute("src"))f.setAttribute("src",f.dataset.src); // GeoGebra dimuat saat dibuka
  $("modal").classList.remove("hidden");modalOpen=true;
  $("modal").scrollTop=0;
  const first=$("pane-"+id).querySelector("input");if(first)setTimeout(()=>first.focus(),50);
}
function closeModal(){$("modal").classList.add("hidden");modalOpen=false;for(const k in keys)keys[k]=false;}

function interact(){
  if(!currentShop){dialogueEl.textContent="Belum ada toko di dekatmu. Coba berjalan mendekati area toko!";return;}
  dialogueEl.textContent=currentShop.intro;
  if(!isUnlocked(currentShop.id)){toast("Selesaikan misi sebelumnya terlebih dahulu!");return;}
  openMission(currentShop.id);
}
function restart(){
  coins=0;score=0;solved={};attempts={};
  player.x=480;player.y=550;
  $("complete").classList.add("hidden");modalOpen=false;
  buildPanes();refreshSidebar();
  dialogueEl.textContent="“Halo! Aku Miko. Ayo cari label harga yang hilang!”";
}

window.addEventListener("keydown",e=>{
  if(modalOpen){if(e.key==="Escape"&&!$("modal").classList.contains("hidden"))closeModal();return;}
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  keys[e.key.length===1?e.key.toLowerCase():e.key]=true;
  if(e.key.toLowerCase()==="e"&&!e.repeat)interact();
});
window.addEventListener("keyup",e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
window.addEventListener("blur",()=>{for(const k in keys)keys[k]=false;});
$("closeDialog").addEventListener("click",()=>dialogueEl.textContent="Ayo jelajahi toko dan tekan E saat berada di dekatnya.");
$("modalClose").addEventListener("click",closeModal);
$("restartBtn").addEventListener("click",restart);
function loop(){move();updateNearby();draw();requestAnimationFrame(loop);}
buildPanes();refreshSidebar();loop();
