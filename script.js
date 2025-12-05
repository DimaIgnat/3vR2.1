// 6x6 Match-3 с симметричным свайпом, падением и профилем
const SIZE = 6;
const COLORS = [1,2,3,4,5];
let board = [], locked = false;
let selected = null;
let level = 1, xp = 0;

const boardEl = document.getElementById("board");
const xpFill = document.getElementById("xp-fill");
const levelEl = document.getElementById("level");

const levelWindow = document.getElementById("levelup-overlay");
const newLevelNum = document.getElementById("new-level-num");
document.getElementById("level-ok").onclick = () => levelWindow.style.display = "none";

// --- Профиль
const profileContainer = document.getElementById("profile-container");
const playerNameInput = document.getElementById("player-name");
const profileLevelEl = document.getElementById("profile-level");
const saveNameBtn = document.getElementById("save-name");

// Загрузка имени
let playerName = localStorage.getItem("playerName") || "Игрок";
playerNameInput.value = playerName;
profileLevelEl.textContent = level;

// Сохранение имени
saveNameBtn.onclick = () => {
  playerName = playerNameInput.value || "Игрок";
  localStorage.setItem("playerName", playerName);
  alert("Имя сохранено: " + playerName);
}

// --- Вкладки
document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    if(btn.dataset.tab==="game"){
      boardEl.parentElement.style.display = "flex";
      profileContainer.classList.remove("visible");
    } else {
      boardEl.parentElement.style.display = "none";
      profileContainer.classList.add("visible");
    }
  }
});

// --- Инициализация поля
function randColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }

function initBoard(){
  do {
    board = [];
    for(let r=0;r<SIZE;r++){
      board[r] = [];
      for(let c=0;c<SIZE;c++){
        board[r][c] = randColor();
      }
    }
  } while(findMatches().length>0);
  render();
  updateXPUI();
}

function render(){
  boardEl.innerHTML = "";
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const val = board[r][c];
      const tile = document.createElement("div");
      tile.className = "tile " + (val ? "c"+val : "empty");
      tile.dataset.r = r;
      tile.dataset.c = c;
      tile.addEventListener("pointerdown", onPointerDown);
      tile.addEventListener("pointerup", onPointerUp);
      boardEl.appendChild(tile);
    }
  }
}

let sx=0, sy=0;
function onPointerDown(e){
  if(locked) return;
  const t = e;
  sx = t.clientX; sy = t.clientY;
  const r=parseInt(this.dataset.r), c=parseInt(this.dataset.c);
  selected = {r,c,el:this};
  this.classList.add("selected");
}

function onPointerUp(e){
  if(locked || !selected) { clearSelection(); return; }
  const t = e;
  const dx=t.clientX-sx, dy=t.clientY-sy;
  if(Math.max(Math.abs(dx),Math.abs(dy))<10){ clearSelection(); return; }

  let tr = selected.r, tc = selected.c;
  if(Math.abs(dx)>Math.abs(dy)) tc += dx>0?1:-1;
  else tr += dy>0?1:-1;

  if(tr<0||tc<0||tr>=SIZE||tc>=SIZE){ clearSelection(); return; }

  attemptSwap(selected.r, selected.c, tr, tc);
  clearSelection();
}

function clearSelection(){
  const prev = document.querySelector(".tile.selected");
  if(prev) prev.classList.remove("selected");
  selected=null;
}

// --- Swap с симметричной анимацией
function attemptSwap(r1,c1,r2,c2){
  if(locked) return;
  const manhattan = Math.abs(r1-r2)+Math.abs(c1-c2);
  if(manhattan!==1) return;

  locked = true;
  animateSwap(r1,c1,r2,c2);
  setTimeout(()=>{
    swapBoard(r1,c1,r2,c2);
    if(processAllMatches()){
      locked = false;
    } else {
      animateSwap(r1,c1,r2,c2);
      setTimeout(()=>{ swapBoard(r1,c1,r2,c2); render(); locked=false; },160);
    }
  },160);
}

function swapBoard(r1,c1,r2,c2){
  const t=board[r1][c1];
  board[r1][c1]=board[r2][c2];
  board[r2][c2]=t;
}

function animateSwap(r1,c1,r2,c2){
  const tiles = boardEl.children;
  const idx1=r1*SIZE+c1, idx2=r2*SIZE+c2;
  if(!tiles[idx1]||!tiles[idx2]) return;
  tiles[idx1].classList.add("anim-swap");
  tiles[idx2].classList.add("anim-swap");
  setTimeout(()=>{ tiles[idx1].classList.remove("anim-swap"); tiles[idx2].classList.remove("anim-swap"); },150);
}

// --- Поиск матчей
function findMatches(){
  const toRemove=[];
  for(let r=0;r<SIZE;r++){
    let streak=1;
    for(let c=1;c<SIZE;c++){
      if(board[r][c]&&board[r][c]===board[r][c-1]) streak++;
      else { if(streak>=3){ for(let k=c-streak;k<c;k++) toRemove.push(`${r},${k}`);} streak=1; }
    }
    if(streak>=3){ for(let k=SIZE-streak;k<SIZE;k++) toRemove.push(`${r},${k}`);}
  }
  for(let c=0;c<SIZE;c++){
    let streak=1;
    for(let r=1;r<SIZE;r++){
      if(board[r][c]&&board[r][c]===board[r-1][c]) streak++;
      else { if(streak>=3){ for(let k=r-streak;k<r;k++) toRemove.push(`${k},${c}`);} streak=1;}
    }
    if(streak>=3){ for(let k=SIZE-streak;k<SIZE;k++) toRemove.push(`${k},${c}`);}
  }
  return Array.from(new Set(toRemove)).map(s=>{ const [i,j]=s.split(",").map(x=>parseInt(x)); return {i,j}; });
}

// --- Удаление и падение
function processAllMatches(){
  let any=false;
  const loop=()=>{
    const matches=findMatches();
    if(matches.length===0) return false;
    any=true;
    matches.forEach(m=>board[m.i][m.j]=0);
    renderWithVanish(matches);
    setTimeout(()=>{
      collapseColumns();
      render();
      setTimeout(()=>{ if(findMatches().length>0){ loop(); } },180);
    },200);
    return true;
  };
  return loop();
}

function renderWithVanish(matches){
  render();
  matches.forEach(m=>{
    const idx=m.i*SIZE+m.j;
    const el=boardEl.children[idx];
    if(el) el.classList.add("vanish");
  });
  matches.forEach(()=> gainXP(6));
}

function collapseColumns(){
  for(let c=0;c<SIZE;c++){
    const col=[];
    for(let r=SIZE-1;r>=0;r--) if(board[r][c] && board[r][c]!==0) col.push(board[r][c]);
    for(let r=SIZE-1,idx=0;r>=0;r--,idx++){
      board[r][c] = (idx<col.length)?col[idx]:randColor();
    }
  }
}

function gainXP(amount){
  xp+=amount;
  if(xp>=100){
    xp-=100;
    level++;
    levelEl.textContent=level;
    profileLevelEl.textContent=level;
    newLevelNum.textContent=level;
    levelWindow.style.display="flex";
  }
  updateXPUI();
}
function updateXPUI(){ xpFill.style.width=Math.min(100,xp)+"%"; }

initBoard();
