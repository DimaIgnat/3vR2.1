// script.js — улучшенная и надёжная логика Match-3
const size = 8;
const COLORS = [1,2,3,4,5]; // соответствует классам c1..c5
let board = []; // 2D array size x size
let locked = false; // запрещаем ввод во время анимаций
let selected = null;
let level = 1;
let xp = 0;

const boardEl = document.getElementById("board");
const xpFill = document.getElementById("xp-fill");
const levelEl = document.getElementById("level");
const levelWindow = document.getElementById("levelup-overlay");
const newLevelNum = document.getElementById("new-level-num");
document.getElementById("level-ok").onclick = () => levelWindow.style.display = "none";

// --- Инициализация без стартовых матчей ---
function initBoard(){
  do {
    board = [];
    for(let r=0;r<size;r++){
      board[r] = [];
      for(let c=0;c<size;c++){
        board[r][c] = randColor();
      }
    }
  } while(findMatches().length > 0); // если есть стартовые матчи — пересоздаем
  render();
  updateXPUI();
}

function randColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }

// --- Рендер сетки
function render(){
  boardEl.innerHTML = "";
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const val = board[r][c];
      const tile = document.createElement("div");
      tile.className = "tile " + (val ? "c"+val : "empty");
      tile.dataset.r = r;
      tile.dataset.c = c;
      // pointer handlers (desktop + mobile)
      tile.addEventListener("pointerdown", onPointerDown);
      tile.addEventListener("pointerup", onPointerUp);
      boardEl.appendChild(tile);
    }
  }
}

// --- Input handlers
let sx=0, sy=0;
function onPointerDown(e){
  if(locked) return;
  const t = e;
  sx = t.clientX; sy = t.clientY;
  const r = parseInt(this.dataset.r), c = parseInt(this.dataset.c);
  selected = {r,c,el:this};
  this.classList.add("selected");
}
function onPointerUp(e){
  if(locked || !selected) {
    clearSelection();
    return;
  }
  const t = e;
  const dx = t.clientX - sx, dy = t.clientY - sy;
  const absdx = Math.abs(dx), absdy = Math.abs(dy);
  let tr = selected.r, tc = selected.c;
  if(Math.max(absdx, absdy) < 10){ // слишком маленький свайп -> отмена
    clearSelection();
    return;
  }
  if(absdx > absdy) tc += (dx>0?1:-1);
  else tr += (dy>0?1:-1);

  // валидация соседства
  if(tr<0 || tc<0 || tr>=size || tc>=size){
    clearSelection();
    return;
  }
  // swap соседних
  attemptSwap(selected.r, selected.c, tr, tc);
  clearSelection();
}

function clearSelection(){
  const prev = document.querySelector(".tile.selected");
  if(prev) prev.classList.remove("selected");
  selected = null;
}

// --- Попытка свапа с откатом если нет матчей
function attemptSwap(r1,c1,r2,c2){
  if(locked) return;
  // разрешаем менять только соседей (на всякий случай)
  const manhattan = Math.abs(r1-r2)+Math.abs(c1-c2);
  if(manhattan !== 1) return;

  // блокируем ввод на время анимации
  locked = true;
  animateSwap(r1,c1,r2,c2);

  setTimeout(()=>{
    swapBoard(r1,c1,r2,c2);
    // если матч появился — обрабатываем каскады
    if(processAllMatches()){
      // успех — оставляем
      locked = false;
    } else {
      // откатываем назад (нет матча)
      animateSwap(r1,c1,r2,c2);
      setTimeout(()=>{
        swapBoard(r1,c1,r2,c2);
        render();
        locked = false;
      },150);
    }
  }, 160);
}

function swapBoard(r1,c1,r2,c2){
  const t = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = t;
}

// --- Простая визуальная анимация свапа (scale) ---
function animateSwap(r1,c1,r2,c2){
  const idx1 = r1*size + c1;
  const idx2 = r2*size + c2;
  const tiles = boardEl.children;
  if(!tiles[idx1] || !tiles[idx2]) return;
  tiles[idx1].classList.add("anim-swap");
  tiles[idx2].classList.add("anim-swap");
  setTimeout(()=> {
    tiles[idx1].classList.remove("anim-swap");
    tiles[idx2].classList.remove("anim-swap");
  },150);
}

// --- Поиск всех матчей (возвращает массив уникальных клеток) ---
function findMatches(){
  const toRemove = [];
  // горизонтали
  for(let r=0;r<size;r++){
    let streak = 1;
    for(let c=1;c<size;c++){
      if(board[r][c] && board[r][c] === board[r][c-1]) streak++;
      else {
        if(streak >=3){
          for(let k=c-streak;k<c;k++) toRemove.push(`${r},${k}`);
        }
        streak = 1;
      }
    }
    if(streak>=3){
      for(let k=size-streak;k<size;k++) toRemove.push(`${r},${k}`);
    }
  }
  // вертикали
  for(let c=0;c<size;c++){
    let streak = 1;
    for(let r=1;r<size;r++){
      if(board[r][c] && board[r][c] === board[r-1][c]) streak++;
      else {
        if(streak>=3){
          for(let k=r-streak;k<r;k++) toRemove.push(`${k},${c}`);
        }
        streak = 1;
      }
    }
    if(streak>=3){
      for(let k=size-streak;k<size;k++) toRemove.push(`${k},${c}`);
    }
  }
  // unique
  return Array.from(new Set(toRemove)).map(s=>{
    const [i,j] = s.split(",").map(x=>parseInt(x));
    return {i,j};
  });
}

// --- Удаление найденных матчей, падение и рефилл — и повтор до тех пор, пока есть матчи (каскады) ---
function processAllMatches(){
  let any = false;
  const loop = () => {
    const matches = findMatches();
    if(matches.length===0) return false;
    any = true;
    // пометим для анимации: задаём null в board для удаления
    matches.forEach(cell => board[cell.i][cell.j] = 0);
    renderWithVanish(matches);
    return true;
  };

  // асинхронно выполняем: удаление -> падение -> рефилл -> проверить снова
  // Но тут синхронно: запускем цикл с таймерами
  const doCycle = () => {
    if(!loop()) {
      // ничего не было найдено в начале
      return false;
    }
    // ждём анимации исчезания
    setTimeout(()=>{
      collapseColumns();
      render();
      // ждём коротко, затем проверяем снова
      setTimeout(()=>{
        if(findMatches().length>0){
          // рекурсивно продолжаем, но возвращаем true сейчас
          doCycle();
        } else {
          // закончились каскады
        }
      }, 180);
    }, 180);
    return true;
  };

  return doCycle();
}

// --- Рендер с эффектом исчезания (подсвечиваем удаляемые) ---
function renderWithVanish(matches){
  // matches — массив {i,j}
  // сделаем обычный render сначала чтобы DOM элементы были актуальны
  render();
  // поставим класс vanish на эти элементы
  matches.forEach(cell=>{
    const idx = cell.i*size + cell.j;
    const el = boardEl.children[idx];
    if(el) el.classList.add("vanish");
  });
  // очки / xp начисление для каждой ячейки
  matches.forEach(()=> gainXP(6));
}

// --- Падение фишек: для каждой колонки сдвигаем ненулевые вниз и заполняем сверху случайными
function collapseColumns(){
  for(let c=0;c<size;c++){
    const col = [];
    for(let r=size-1;r>=0;r--){
      if(board[r][c] && board[r][c] !== 0) col.push(board[r][c]);
    }
    // теперь заполнить снизу
    for(let r=size-1, idx=0;r>=0;r--, idx++){
      board[r][c] = (idx < col.length) ? col[idx] : randColor();
    }
  }
}

// --- XP / Level handling
function gainXP(amount){
  xp += amount;
  if(xp >= 100){
    xp -= 100;
    level++;
    levelEl.textContent = level;
    newLevelNum.textContent = level;
    // показать окно levelup
    levelWindow.style.display = "flex";
  }
  updateXPUI();
}

function updateXPUI(){ xpFill.style.width = Math.min(100, xp) + "%"; }

// --- старт
initBoard();

// Optional: небольшая автопроверка на таймере, чтобы обрабатывать случайные матчи после длительного простоя
setInterval(()=>{
  if(!locked){
    if(findMatches().length>0){
      locked = true;
      processAllMatches();
      setTimeout(()=> locked = false, 1000);
    }
  }
}, 1200);
