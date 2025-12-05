const size = 8;
const colors = [1, 2, 3, 4, 5];
let board = [];

let selected = null;
let level = 1;
let xp = 0;

const boardEl = document.getElementById("board");
const xpFill = document.getElementById("xp-fill");
const levelEl = document.getElementById("level");

const levelWindow = document.getElementById("levelup-overlay");
const newLevelNum = document.getElementById("new-level-num");
document.getElementById("level-ok").onclick = () => {
    levelWindow.style.display = "none";
};

function initBoard() {
    for (let i = 0; i < size; i++) {
        board[i] = [];
        for (let j = 0; j < size; j++) board[i][j] = rand();
    }
    render();
}

function rand() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function render() {
    boardEl.innerHTML = "";
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const t = document.createElement("div");
            t.className = "tile c" + board[i][j];
            t.dataset.row = i;
            t.dataset.col = j;
            t.addEventListener("touchstart", touchStart);
            t.addEventListener("touchend", touchEnd);
            boardEl.appendChild(t);
        }
    }
}

let sx, sy;

function touchStart(e) {
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;

    let row = this.dataset.row;
    let col = this.dataset.col;

    selected = { row, col };
    this.classList.add("selected");
}

function touchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    const el = document.querySelector(".selected");
    if (el) el.classList.remove("selected");

    if (!selected) return;

    let r = parseInt(selected.row);
    let c = parseInt(selected.col);

    let tr = r, tc = c;

    if (Math.abs(dx) > Math.abs(dy))
        tc += dx > 0 ? 1 : -1;
    else
        tr += dy > 0 ? 1 : -1;

    move(r, c, tr, tc);
    selected = null;
}

function move(r1, c1, r2, c2) {
    if (r2 < 0 || c2 < 0 || r2 >= size || c2 >= size) return;

    animateSwap(r1, c1, r2, c2);

    setTimeout(() => {
        swap(r1, c1, r2, c2);
        if (!checkMatches()) {
            swap(r1, c1, r2, c2);
        }
        render();
    }, 150);
}

function swap(r1, c1, r2, c2) {
    let t = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = t;
}

function animateSwap(r1, c1, r2, c2) {
    const tiles = document.querySelectorAll(".tile");
    const idx1 = r1 * size + c1;
    const idx2 = r2 * size + c2;

    tiles[idx1].style.transform = "scale(1.2)";
    tiles[idx2].style.transform = "scale(1.2)";

    setTimeout(() => {
        tiles[idx1].style.transform = "";
        tiles[idx2].style.transform = "";
    }, 150);
}

function checkMatches() {
    let matched = [];

    // горизонталь
    for (let i = 0; i < size; i++) {
        let streak = 1;
        for (let j = 1; j < size; j++) {
            if (board[i][j] === board[i][j - 1]) streak++;
            else {
                if (streak >= 3) pushMatch(i, j, streak, matched, "row");
                streak = 1;
            }
        }
        if (streak >= 3) pushMatch(i, size, streak, matched, "row");
    }

    // вертикаль
    for (let j = 0; j < size; j++) {
        let streak = 1;
        for (let i = 1; i < size; i++) {
            if (board[i][j] === board[i - 1][j]) streak++;
            else {
                if (streak >= 3) pushMatch(i, j, streak, matched, "col");
                streak = 1;
            }
        }
        if (streak >= 3) pushMatch(size, j, streak, matched, "col");
    }

    if (matched.length === 0) return false;

    matched.forEach(m => {
        board[m.i][m.j] = rand();
        gainXP(6);
    });

    render();

    return true;
}

function pushMatch(i, j, streak, list, type) {
    if (type === "row") {
        for (let k = j - streak; k < j; k++) list.push({ i, j: k });
    } else {
        for (let k = i - streak; k < i; k++) list.push({ i: k, j });
    }
}

function gainXP(amount) {
    xp += amount;
    if (xp >= 100) {
        xp -= 100;
        level++;
        levelEl.textContent = level;
        newLevelNum.textContent = level;
        levelWindow.style.display = "flex";
    }
    xpFill.style.width = xp + "%";
}

initBoard();
