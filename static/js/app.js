/**
 * Daily Logic Puzzles - Main Client Controller
 * Manages game state, timer, board rendering, keyboard inputs, and API integrations.
 */

// Global State
const state = {
    activeTab: "sudoku",
    dateKey: new Date().toISOString().split("T")[0],
    isPencilMode: false,
    timerSeconds: 0,
    timerInterval: null,
    isPaused: false,
    isCleanSolve: true,
    hintsUsed: 0,
    isCompleted: false,

    // Sudoku Data
    sudoku: {
        initialBoard: [],
        currentBoard: [],
        candidates: {}, // key "r,c" -> Set of numbers
        selectedCell: null
    },

    // Tectonic Data
    tectonic: {
        initialBoard: [],
        currentBoard: [],
        gridCages: [],
        cages: {},
        candidates: {},
        selectedCell: null
    }
};

// DOM Elements
const el = {
    dateBadge: document.getElementById("currentDateBadge"),
    timerDisplay: document.getElementById("timerDisplay"),
    cleanBadge: document.getElementById("cleanSolveBadge"),
    btnPause: document.getElementById("btnPause"),
    btnReset: document.getElementById("btnReset"),
    btnCheckErrors: document.getElementById("btnCheckErrors"),
    btnModePen: document.getElementById("btnModePen"),
    btnModePencil: document.getElementById("btnModePencil"),
    btnErase: document.getElementById("btnErase"),
    numberPad: document.getElementById("numberPad"),
    sudokuGrid: document.getElementById("sudokuGrid"),
    tectonicGrid: document.getElementById("tectonicGrid"),
    sudokuContainer: document.getElementById("sudokuGridContainer"),
    tectonicContainer: document.getElementById("tectonicGridContainer"),
    gameSection: document.getElementById("gameSection"),
    leaderboardSection: document.getElementById("leaderboardSection"),
    leaderboardBody: document.getElementById("leaderboardBody"),
    victoryModal: document.getElementById("victoryModal"),
    modalTimeValue: document.getElementById("modalTimeValue"),
    modalStatusReport: document.getElementById("modalStatusReport"),
    playerNameInput: document.getElementById("playerNameInput"),
    btnSubmitScore: document.getElementById("btnSubmitScore"),
    btnCloseModal: document.getElementById("btnCloseModal")
};

// -------------------------------------------------------------
// Initialization & Navigation
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    el.dateBadge.textContent = state.dateKey;
    initTabs();
    initKeypad();
    initControls();
    initKeyboardListeners();
    loadPuzzle("sudoku");
    startTimer();
});

function initTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.dataset.tab;
            if (state.activeTab === targetTab) return;

            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeTab = targetTab;

            if (targetTab === "leaderboard") {
                el.gameSection.classList.add("hidden");
                el.leaderboardSection.classList.remove("hidden");
                loadLeaderboard("sudoku");
            } else {
                el.gameSection.classList.remove("hidden");
                el.leaderboardSection.classList.add("hidden");

                if (targetTab === "sudoku") {
                    el.sudokuContainer.classList.remove("hidden");
                    el.tectonicContainer.classList.add("hidden");
                    renderNumberPad(9);
                    if (state.sudoku.initialBoard.length === 0) {
                        loadPuzzle("sudoku");
                    }
                } else if (targetTab === "tectonic") {
                    el.sudokuContainer.classList.add("hidden");
                    el.tectonicContainer.classList.remove("hidden");
                    renderNumberPad(5);
                    if (state.tectonic.initialBoard.length === 0) {
                        loadPuzzle("tectonic");
                    }
                }
            }
        });
    });

    document.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            loadLeaderboard(pill.dataset.type);
        });
    });
}

// -------------------------------------------------------------
// Timer Logic
// -------------------------------------------------------------
function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.isPaused && !state.isCompleted) {
            state.timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(state.timerSeconds / 60);
    const secs = state.timerSeconds % 60;
    el.timerDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resetGame() {
    state.timerSeconds = 0;
    state.isCleanSolve = true;
    state.hintsUsed = 0;
    state.isCompleted = false;
    updateCleanBadge();
    updateTimerDisplay();

    if (state.activeTab === "sudoku") {
        state.sudoku.currentBoard = JSON.parse(JSON.stringify(state.sudoku.initialBoard));
        state.sudoku.candidates = {};
        renderSudokuGrid();
    } else if (state.activeTab === "tectonic") {
        state.tectonic.currentBoard = JSON.parse(JSON.stringify(state.tectonic.initialBoard));
        state.tectonic.candidates = {};
        renderTectonicGrid();
    }
}

function updateCleanBadge() {
    if (state.isCleanSolve) {
        el.cleanBadge.textContent = "Ren losning";
        el.cleanBadge.className = "clean-badge clean";
    } else {
        el.cleanBadge.textContent = "Assisterad";
        el.cleanBadge.className = "clean-badge assisted";
    }
}

// -------------------------------------------------------------
// Controls & Tools
// -------------------------------------------------------------
function initControls() {
    el.btnPause.addEventListener("click", () => {
        state.isPaused = !state.isPaused;
        el.btnPause.textContent = state.isPaused ? "Fortsatt" : "Pausa";
    });

    el.btnReset.addEventListener("click", () => {
        if (confirm("Vill du borja om dagens pussel? Tiden nollstalls.")) {
            resetGame();
        }
    });

    el.btnCheckErrors.addEventListener("click", () => {
        // Checking errors flags solve as assisted (Testportalen anti-cheat rule)
        state.isCleanSolve = false;
        state.hintsUsed++;
        updateCleanBadge();
        verifyCurrentBoard(false);
    });

    el.btnModePen.addEventListener("click", () => setPencilMode(false));
    el.btnModePencil.addEventListener("click", () => setPencilMode(true));

    el.btnErase.addEventListener("click", () => handleInputNumber(0));

    el.btnCloseModal.addEventListener("click", () => {
        el.victoryModal.classList.add("hidden");
    });

    el.btnSubmitScore.addEventListener("click", submitScoreToAPI);
}

function setPencilMode(enabled) {
    state.isPencilMode = enabled;
    if (enabled) {
        el.btnModePencil.classList.add("active");
        el.btnModePen.classList.remove("active");
    } else {
        el.btnModePen.classList.add("active");
        el.btnModePencil.classList.remove("active");
    }
}

function renderNumberPad(maxNum) {
    el.numberPad.innerHTML = "";
    for (let i = 1; i <= maxNum; i++) {
        const btn = document.createElement("button");
        btn.className = "pad-key";
        btn.textContent = i;
        btn.addEventListener("click", () => handleInputNumber(i));
        el.numberPad.appendChild(btn);
    }
}

function initKeypad() {
    renderNumberPad(9);
}

function initKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
        if (state.activeTab === "leaderboard" || state.isCompleted) return;

        // Number keys 1-9
        if (e.key >= "1" && e.key <= "9") {
            const num = parseInt(e.key, 10);
            const max = state.activeTab === "sudoku" ? 9 : 5;
            if (num <= max) {
                handleInputNumber(num);
            }
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
            handleInputNumber(0);
        } else if (e.key.toLowerCase() === "p") {
            setPencilMode(!state.isPencilMode);
        } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            handleArrowNavigation(e.key);
        }
    });
}

function handleArrowNavigation(key) {
    const isSudoku = state.activeTab === "sudoku";
    const size = isSudoku ? 9 : 6;
    const current = isSudoku ? state.sudoku.selectedCell : state.tectonic.selectedCell;

    if (!current) {
        selectCell(0, 0);
        return;
    }

    let { row, col } = current;
    if (key === "ArrowUp") row = Math.max(0, row - 1);
    if (key === "ArrowDown") row = Math.min(size - 1, row + 1);
    if (key === "ArrowLeft") col = Math.max(0, col - 1);
    if (key === "ArrowRight") col = Math.min(size - 1, col + 1);

    selectCell(row, col);
}

// -------------------------------------------------------------
// Puzzle API Loading
// -------------------------------------------------------------
async function loadPuzzle(type) {
    try {
        const res = await fetch(`/api/puzzle?type=${type}&date=${state.dateKey}`);
        const data = await res.json();

        if (type === "sudoku") {
            state.sudoku.initialBoard = data.initial_board;
            state.sudoku.currentBoard = JSON.parse(JSON.stringify(data.initial_board));
            state.sudoku.candidates = {};
            renderSudokuGrid();
        } else if (type === "tectonic") {
            state.tectonic.initialBoard = data.initial_board;
            state.tectonic.currentBoard = JSON.parse(JSON.stringify(data.initial_board));
            state.tectonic.gridCages = data.metadata.grid_cages;
            state.tectonic.cages = data.metadata.cages;
            state.tectonic.candidates = {};
            renderTectonicGrid();
        }
    } catch (err) {
        console.error("Failed to load puzzle:", err);
    }
}

// -------------------------------------------------------------
// Sudoku Grid Rendering & Cell Selection
// -------------------------------------------------------------
function renderSudokuGrid() {
    el.sudokuGrid.innerHTML = "";
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "sudoku-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            const isFixed = state.sudoku.initialBoard[r][c] !== 0;
            const val = state.sudoku.currentBoard[r][c];

            if (isFixed) {
                cell.classList.add("fixed");
                cell.textContent = val;
            } else if (val !== 0) {
                cell.classList.add("user-filled");
                cell.textContent = val;
            } else {
                // Render candidate pencil marks
                const candKey = `${r},${c}`;
                if (state.sudoku.candidates[candKey] && state.sudoku.candidates[candKey].size > 0) {
                    const cGrid = document.createElement("div");
                    cGrid.className = "candidate-grid";
                    for (let n = 1; n <= 9; n++) {
                        const cNum = document.createElement("div");
                        cNum.className = "candidate-num";
                        if (state.sudoku.candidates[candKey].has(n)) {
                            cNum.textContent = n;
                        }
                        cGrid.appendChild(cNum);
                    }
                    cell.appendChild(cGrid);
                }
            }

            cell.addEventListener("click", () => selectCell(r, c));
            el.sudokuGrid.appendChild(cell);
        }
    }
}

// -------------------------------------------------------------
// Tectonic (Suguru) Grid Rendering
// -------------------------------------------------------------
function renderTectonicGrid() {
    el.tectonicGrid.innerHTML = "";
    const gridCages = state.tectonic.gridCages;
    const cages = state.tectonic.cages;

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement("div");
            cell.className = "tectonic-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            const cid = gridCages[r][c];

            // Add thick cage borders
            if (r === 0 || gridCages[r - 1][c] !== cid) cell.classList.add("cage-border-top");
            if (r === 5 || gridCages[r + 1][c] !== cid) cell.classList.add("cage-border-bottom");
            if (c === 0 || gridCages[r][c - 1] !== cid) cell.classList.add("cage-border-left");
            if (c === 5 || gridCages[r][c + 1] !== cid) cell.classList.add("cage-border-right");

            // Subtle background tint per cage
            const cageColors = [
                "#F8FAFC", "#F1F5F9", "#FEF3C7", "#E0F2FE", 
                "#ECFDF5", "#FDF2F8", "#F3E8FF", "#FFFBEB"
            ];
            cell.style.backgroundColor = cageColors[cid % cageColors.length];

            // First cell in cage shows cage size badge
            const cageFirstCell = cages[cid].cells[0];
            if (cageFirstCell[0] === r && cageFirstCell[1] === c) {
                const badge = document.createElement("span");
                badge.className = "cage-size-badge";
                badge.textContent = `1-${cages[cid].size}`;
                cell.appendChild(badge);
            }

            const isFixed = state.tectonic.initialBoard[r][c] !== 0;
            const val = state.tectonic.currentBoard[r][c];

            if (isFixed) {
                cell.classList.add("fixed");
                const numSpan = document.createElement("span");
                numSpan.textContent = val;
                cell.appendChild(numSpan);
            } else if (val !== 0) {
                cell.classList.add("user-filled");
                const numSpan = document.createElement("span");
                numSpan.textContent = val;
                cell.appendChild(numSpan);
            } else {
                // Render candidate pencil marks
                const candKey = `${r},${c}`;
                if (state.tectonic.candidates[candKey] && state.tectonic.candidates[candKey].size > 0) {
                    const cGrid = document.createElement("div");
                    cGrid.className = "candidate-grid";
                    for (let n = 1; n <= 5; n++) {
                        const cNum = document.createElement("div");
                        cNum.className = "candidate-num";
                        if (state.tectonic.candidates[candKey].has(n)) {
                            cNum.textContent = n;
                        }
                        cGrid.appendChild(cNum);
                    }
                    cell.appendChild(cGrid);
                }
            }

            cell.addEventListener("click", () => selectCell(r, c));
            el.tectonicGrid.appendChild(cell);
        }
    }
}

// -------------------------------------------------------------
// Cell Selection & Input Handling
// -------------------------------------------------------------
function selectCell(row, col) {
    const isSudoku = state.activeTab === "sudoku";
    if (isSudoku) {
        state.sudoku.selectedCell = { row, col };
        highlightCells("sudoku", row, col);
    } else {
        state.tectonic.selectedCell = { row, col };
        highlightCells("tectonic", row, col);
    }
}

function highlightCells(type, row, col) {
    const container = type === "sudoku" ? el.sudokuGrid : el.tectonicGrid;
    const cells = container.querySelectorAll(type === "sudoku" ? ".sudoku-cell" : ".tectonic-cell");

    cells.forEach(c => {
        c.classList.remove("selected", "highlight-same");
        const r = parseInt(c.dataset.row, 10);
        const colIdx = parseInt(c.dataset.col, 10);
        if (r === row && colIdx === col) {
            c.classList.add("selected");
        }
    });
}

function handleInputNumber(num) {
    const isSudoku = state.activeTab === "sudoku";
    const pState = isSudoku ? state.sudoku : state.tectonic;

    if (!pState.selectedCell) return;
    const { row, col } = pState.selectedCell;

    // Fixed clue cells cannot be modified
    if (pState.initialBoard[row][col] !== 0) return;

    const candKey = `${row},${col}`;

    if (state.isPencilMode && num !== 0) {
        // Candidate pencil mode
        if (!pState.candidates[candKey]) {
            pState.candidates[candKey] = new Set();
        }
        if (pState.candidates[candKey].has(num)) {
            pState.candidates[candKey].delete(num);
        } else {
            pState.candidates[candKey].add(num);
        }
        pState.currentBoard[row][col] = 0; // Clear solid value
    } else {
        // Solid pen mode
        pState.currentBoard[row][col] = num;
        if (pState.candidates[candKey]) {
            delete pState.candidates[candKey];
        }
    }

    if (isSudoku) {
        renderSudokuGrid();
    } else {
        renderTectonicGrid();
    }
    selectCell(row, col);

    // Auto-check completion when all cells are filled
    checkIfBoardIsFull(isSudoku);
}

function checkIfBoardIsFull(isSudoku) {
    const pState = isSudoku ? state.sudoku : state.tectonic;
    const size = isSudoku ? 9 : 6;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (pState.currentBoard[r][c] === 0) return;
        }
    }

    // All cells full -> verify with backend
    verifyCurrentBoard(true);
}

// -------------------------------------------------------------
// Board Verification & Submission
// -------------------------------------------------------------
async function verifyCurrentBoard(isAutoCheck) {
    const type = state.activeTab;
    const pState = type === "sudoku" ? state.sudoku : state.tectonic;

    try {
        const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date_key: state.dateKey,
                puzzle_type: type,
                board: pState.currentBoard
            })
        });
        const result = await res.json();

        // Highlight errors if any
        const container = type === "sudoku" ? el.sudokuGrid : el.tectonicGrid;
        container.querySelectorAll(".error").forEach(c => c.classList.remove("error"));

        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(err => {
                const cell = container.querySelector(`[data-row="${err.row}"][data-col="${err.col}"]`);
                if (cell) cell.classList.add("error");
            });
        }

        if (result.completed) {
            state.isCompleted = true;
            clearInterval(state.timerInterval);
            showVictoryModal();
        } else if (!isAutoCheck && result.valid) {
            alert("Alla ifyllda siffror ar korrekta hittills!");
        }
    } catch (err) {
        console.error("Verification failed:", err);
    }
}

function showVictoryModal() {
    el.modalTimeValue.textContent = el.timerDisplay.textContent;
    el.modalStatusReport.textContent = state.isCleanSolve ? "Klassad som: Ren losning" : "Klassad som: Assisterad (Hjalpfunktioner anvanda)";
    el.modalStatusReport.style.color = state.isCleanSolve ? "#10B981" : "#D97706";
    el.victoryModal.classList.remove("hidden");
}

async function submitScoreToAPI() {
    const type = state.activeTab;
    const pState = type === "sudoku" ? state.sudoku : state.tectonic;
    const playerName = el.playerNameInput.value.trim() || "Anonymous Solver";

    try {
        const res = await fetch("/api/submit-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date_key: state.dateKey,
                puzzle_type: type,
                player_name: playerName,
                time_seconds: state.timerSeconds,
                is_clean_solve: state.isCleanSolve,
                hints_used: state.hintsUsed,
                board: pState.currentBoard
            })
        });
        const data = await res.json();

        if (data.success) {
            el.victoryModal.classList.add("hidden");
            // Switch to leaderboard tab
            document.querySelector('.tab-btn[data-tab="leaderboard"]').click();
            document.querySelector(`.filter-pill[data-type="${type}"]`).click();
        } else {
            alert("Kunde inte spara resultat: " + (data.error || "Okant fel"));
        }
    } catch (err) {
        console.error("Score submission error:", err);
    }
}

// -------------------------------------------------------------
// Leaderboard View
// -------------------------------------------------------------
async function loadLeaderboard(type) {
    try {
        const res = await fetch(`/api/leaderboard?type=${type}&date=${state.dateKey}`);
        const data = await res.json();
        el.leaderboardBody.innerHTML = "";

        if (data.leaderboard.length === 0) {
            el.leaderboardBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748B; padding:20px;">Inga resultat registrerade for idag an. Bli den forsta!</td></tr>`;
            return;
        }

        data.leaderboard.forEach(entry => {
            const tr = document.createElement("tr");
            const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : "";
            const statusClass = entry.is_clean_solve ? "clean" : "assisted";
            const statusText = entry.is_clean_solve ? "Ren losning" : "Assisterad";

            tr.innerHTML = `
                <td><span class="rank-badge ${rankClass}">#${entry.rank}</span></td>
                <td><strong>${escapeHtml(entry.player_name)}</strong></td>
                <td>${entry.formatted_time}</td>
                <td><span class="clean-badge ${statusClass}">${statusText}</span></td>
                <td style="color:#64748B;">${entry.submitted_at ? entry.submitted_at.split(" ")[0] : state.dateKey}</td>
            `;
            el.leaderboardBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load leaderboard:", err);
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
