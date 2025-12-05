const size = 6;
const colors = ["#ff4d4d", "#4d94ff", "#4dff88", "#ffff4d", "#ff80ff"];
let board = [];

let xp = Number(localStorage.getItem("xp") || 0);
let level = Number(localStorage.getItem("level") || 1);

document.getElementById("level").textContent = level;
updateXPbar();

// ---------- ПРОФИЛЬ ----------
function openProfile() {
    document.getElementById("profile").classList.remove("hidden");

    const savedName = localStorage.getItem("playerName") || "";
    document.getElementById("playerName").value = savedName;

    document.getElementById("profileLevel").textContent = level;
}

function closeProfile() {
    document.getElementById("profile").classList.add("hidden");
}

function saveName() {
    const name = document.getElementById("playerName").value;
    localStorage.setItem("playerName", name);
    alert("Имя сохранено!");
}

// ---------- ГЕНЕРАЦИЯ ПОЛЯ ----------
function randomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function generateBoard() {
    board = [];
    for (let i = 0; i < size; i++) {
        board[i] = [];
        for (let j = 0; j < size; j++) {
            board[i][j] = randomColor();
        }
    }
}

function renderBoard() {
    const game = document.getElementById("game");
    game.innerHTML = "";

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const div = document.createElement("div");
            div.className = "cell";
            div.style.background = board[row][col];
            div.dataset.row = row;
            div.dataset.col = col;
            game.appendChild(div);
        }
    }

    enableSwipe();
}

// ---------- СВАЙП ----------
let startX, startY, startRow, startCol;

function enableSwipe() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("touchstart", e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startRow = Number(cell.dataset.row);
            startCol = Number(cell.dataset.col);
        });

        cell.addEventListener("touchend", e => {
            let dx = e.changedTouches[0].clientX - startX;
            let dy = e.changedTouches[0].clientY - startY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 30) swap(startRow, startCol, startRow, startCol + 1);
                else if (dx < -30) swap(startRow, startCol, startRow, startCol - 1);
            } else {
                if (dy > 30) swap(startRow, startCol, startRow + 1, startCol);
                else if (dy < -30) swap(startRow, startCol, startRow - 1, startCol);
            }
        });
    });
}

// ---------- СВАП + ЛОГИКА ----------
function swap(r1, c1, r2, c2) {
    if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) return;

    // временный обмен
    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];

    if (checkMatches().length === 0) {
        // откат если нет комбинации
        setTimeout(() => {
            [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
            renderBoard();
        }, 150);
        return;
    }

    handleMatches();
}

// ---------- ПОИСК КОМБО ----------
function checkMatches() {
    let matches = [];

    // горизонтальные
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size - 2; c++) {
            let color = board[r][c];
            if (color && color === board[r][c + 1] && color === board[r][c + 2]) {
                matches.push([r, c], [r, c + 1], [r, c + 2]);
            }
        }
    }

    // вертикальные
    for (let c = 0; c < size; c++) {
        for (let r = 0; r < size - 2; r++) {
            let color = board[r][c];
            if (color && color === board[r + 1][c] && color === board[r + 2][c]) {
                matches.push([r, c], [r + 1, c], [r + 2, c]);
            }
        }
    }

    return matches;
}

// ---------- УДАЛЕНИЕ + ПАДЕНИЕ ----------
function handleMatches() {
    let matches = checkMatches();

    if (matches.length === 0) {
        renderBoard();
        return;
    }

    // удаляем
    for (let [r, c] of matches) {
        board[r][c] = null;
    }

    addXP(matches.length);

    // падение
    for (let c = 0; c < size; c++) {
        let col = board.map(row => row[c]).filter(v => v !== null);
        while (col.length < size) col.unshift(null);
        for (let r = 0; r < size; r++) board[r][c] = col[r];
    }

    // заполнить
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === null) {
                board[r][c] = randomColor();
            }
        }
    }

    renderBoard();
    setTimeout(handleMatches, 200);
}

// ---------- XP + УРОВЕНЬ ----------
function addXP(amount) {
    xp += amount;
    if (xp >= 20) {
        xp = 0;
        level++;
        localStorage.setItem("level", level);
    }
    localStorage.setItem("xp", xp);
    updateXPbar();
}

function updateXPbar() {
    document.getElementById("level").textContent = level;
    document.getElementById("profileLevel").textContent = level;
    document.getElementById("xp-fill").style.width = (xp * 5) + "%";
}

// ---------- СТАРТ ----------
generateBoard();
renderBoard();
