/* MATCH3 with PNG stones - minimal & robust */
const SIZE = 6;
const STONES = [
  "stones/stone1.png",
  "stones/stone2.png",
  "stones/stone3.png",
  "stones/stone4.png",
  "stones/stone5.png"
];

let board = [];
let locked = false;
let xp = Number(localStorage.getItem("m_xp") || 0);
let level = Number(localStorage.getItem("m_level") || 1);

/* DOM */
const boardEl = document.getElementById("board");
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");
const levelValue = document.getElementById("levelValue");

/* profile */
const profileSection = document.getElementById("profile");
const playerNameInput = document.getElementById("playerName");
const profileLevel = document.getElementById("profileLevel");
document.getElementById("saveNameBtn")?.addEventListener("click", saveName);
document.getElementById("closeProfileBtn")?.addEventListener("click", closeProfile);

/* nav */
document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const scr = btn.dataset.screen || (btn.textContent.toLowerCase().includes("проф") ? "profile" : "game");
    if(scr === "profile") showProfile(); else hideProfile();
  });
});

/* load saved */
playerNameInput.value = localStorage.getItem("m_name") || "";
updateUI();

/* init */
initBoard();
render();

/* ---------- board logic ---------- */

function initBoard(){
  board = [];
  for(let r=0;r<SIZE;r++){
    board[r]=[];
    for(let c=0;c<SIZE;c++){
      board[r][c] = randomStone();
    }
  }
  // ensure no initial matches (simple loop)
  while(findMatches().length>0){
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) board[r][c]=randomStone();
  }
}

function randomStone(){ return STONES[Math.floor(Math.random()*STONES.length)]; }

function render(){
  boardEl.innerHTML = "";
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const div = document.createElement("div");
      div.className = "cell";
      div.style.backgroundImage = `url('${board[r][c]}')`;
      div.dataset.r = r; div.dataset.c = c;
      // pointer events for desktop & touch
      div.addEventListener("pointerdown", onPointerDown);
      div.addEventListener("pointerup", onPointerUp);
      boardEl.appendChild(div);
    }
  }
}

/* pointer swipe */
let startX=0, startY=0, startR=null, startC=null;

function onPointerDown(e){
  if(locked) return;
  startX = e.clientX; startY = e.clientY;
  startR = +this.dataset.r; startC = +this.dataset.c;
  this.classList.add("selected");
}

function onPointerUp(e){
  if(locked) { clearSelection(); return; }
  const dx = e.clientX - startX, dy = e.clientY - startY;
  const absx = Math.abs(dx), absy = Math.abs(dy);
  clearSelection();
  if(Math.max(absx,absy) < 10) return;
  let tr = startR, tc = startC;
  if(absx > absy) tc += dx>0 ? 1 : -1; else tr += dy>0 ? 1 : -1;
  if(tr<0||tc<0||tr>=SIZE||tc>=SIZE) return;
  attemptSwap(startR,startC,tr,tc);
}

function clearSelection(){
  const s = document.querySelector(".cell.selected");
  if(s) s.classList.remove("selected");
}

/* visual swap animation then logical swap */
function attemptSwap(r1,c1,r2,c2){
  if(locked) return;
  if(Math.abs(r1-r2)+Math.abs(c1-c2) !== 1) return;
  locked = true;
  animateSwapVisual(r1,c1,r2,c2, ()=> {
    swapBoard(r1,c1,r2,c2);
    render();
    if(processAllMatches()){
      // handled inside
      locked = false;
    } else {
      // revert visually + logically
      animateSwapVisual(r1,c1,r2,c2, ()=>{
        swapBoard(r1,c1,r2,c2);
        render();
        locked = false;
      });
    }
  });
}

function swapBoard(r1,c1,r2,c2){
  const tmp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

/* visual swap using element transforms */
function getTileEl(r,c){ return boardEl.children[r*SIZE + c]; }

function animateSwapVisual(r1,c1,r2,c2, cb){
  const e1 = getTileEl(r1,c1), e2 = getTileEl(r2,c2);
  if(!e1 || !e2){ if(cb) cb(); return; }
  const r1b = e1.getBoundingClientRect(), r2b = e2.getBoundingClientRect();
  const dx = r2b.left - r1b.left, dy = r2b.top - r1b.top;
  e1.style.transition = 'transform 160ms ease'; e2.style.transition='transform 160ms ease';
  e1.style.transform = `translate(${dx}px, ${dy}px)`; e2.style.transform = `translate(${-dx}px, ${-dy}px)`;
  setTimeout(()=> {
    e1.style.transition=''; e2.style.transition='';
    e1.style.transform=''; e2.style.transform='';
    if(cb) cb();
  }, 170);
}

/* find matches -> returns array of unique cells */
function findMatches(){
  const found = new Set();
  // rows
  for(let r=0;r<SIZE;r++){
    let streak=1;
    for(let c=1;c<SIZE;c++){
      if(board[r][c] === board[r][c-1]) streak++; else {
        if(streak>=3) for(let k=c-streak;k<c;k++) found.add(`${r},${k}`);
        streak=1;
      }
    }
    if(streak>=3) for(let k=SIZE-streak;k<SIZE;k++) found.add(`${r},${k}`);
  }
  // cols
  for(let c=0;c<SIZE;c++){
    let streak=1;
    for(let r=1;r<SIZE;r++){
      if(board[r][c] === board[r-1][c]) streak++; else {
        if(streak>=3) for(let k=r-streak;k<r;k++) found.add(`${k},${c}`);
        streak=1;
      }
    }
    if(streak>=3) for(let k=SIZE-streak;k<SIZE;k++) found.add(`${k},${c}`);
  }
  return Array.from(found).map(s=>{const p=s.split(","); return {r:+p[0], c:+p[1]};});
}

/* process matches -> vanish animation -> collapse -> refill -> repeat */
function processAllMatches(){
  let any=false;
  const cycle = ()=>{
    const matches = findMatches();
    if(matches.length===0) return false;
    any = true;
    // mark null
    matches.forEach(m => board[m.r][m.c] = null);
    // render vanish
    render();
    matches.forEach(m=>{
      const el = getTileEl(m.r,m.c);
      if(el) el.classList.add("vanish");
    });
    // xp
    gainXP(matches.length * 2);
    // after vanish -> collapse with animation
    setTimeout(()=>{
      animateDrop(()=>{
        // after drop finished -> check again
        setTimeout(()=>{ if(findMatches().length>0) cycle(); }, 120);
      });
    }, 220);
    return true;
  };
  return cycle();
}

/* animate drop: compute before rects, logical collapse, render new, apply inverse transform */
function animateDrop(cb){
  // before rects
  const before = [];
  for(let i=0;i<SIZE*SIZE;i++){ const el = boardEl.children[i]; before.push(el ? el.getBoundingClientRect() : null); }
  // logical collapse
  for(let c=0;c<SIZE;c++){
    const col = [];
    for(let r=SIZE-1;r>=0;r--) if(board[r][c] !== null) col.push(board[r][c]);
    while(col.length < SIZE) col.push(randomStone());
    for(let r=SIZE-1, idx=0; r>=0; r--, idx++) board[r][c] = col[idx];
  }
  // render new (but we'll set initial transform)
  boardEl.innerHTML = "";
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const div = document.createElement("div");
      div.className = "cell";
      div.style.backgroundImage = `url('${board[r][c]}')`;
      boardEl.appendChild(div);
    }
  }
  // after rects
  const after = [];
  for(let i=0;i<SIZE*SIZE;i++) after.push(boardEl.children[i].getBoundingClientRect());
  // apply inverse transform then animate to 0
  for(let i=0;i<SIZE*SIZE;i++){
    const b=before[i], a=after[i], el=boardEl.children[i];
    if(b && a){
      const dx = b.left - a.left, dy = b.top - a.top;
      if(dx!==0 || dy!==0){
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // force frame
        requestAnimationFrame(()=> {
          el.style.transition = 'transform 220ms ease';
          el.style.transform = '';
          setTimeout(()=> el.style.transition = '', 240);
        });
      }
    }
  }
  setTimeout(()=>{ if(cb) cb(); }, 260);
}

/* XP / level */
function gainXP(amount){
  xp += amount;
  const need = 100;
  if(xp >= need){
    xp -= need;
    level++;
    localStorage.setItem("m_level", level);
  }
  localStorage.setItem("m_xp", xp);
  updateUI();
}
function updateUI(){
  xpFill.style.width = Math.min(100, (xp/100)*100) + "%";
  xpText.textContent = xp + " / 100 XP";
  levelValue.textContent = level;
  profileLevel.textContent = level;
}

/* profile helpers */
function showProfile(){ profileSection.classList.remove("hidden"); }
function hideProfile(){ profileSection.classList.add("hidden"); }
function saveName(){ localStorage.setItem("m_name", playerNameInput.value || "Игрок"); alert("Сохранено"); closeProfile(); }
function closeProfile(){ profileSection.classList.add("hidden"); }

/* utility */
function findIndexFromRC(r,c){ return r*SIZE + c; }

/* auto-check leftover matches occasionally */
setInterval(()=>{
  if(!locked && findMatches().length>0){ locked = true; processAllMatches(); setTimeout(()=> locked=false, 1000); }
}, 1200);
