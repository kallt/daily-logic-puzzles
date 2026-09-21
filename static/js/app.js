/**
 * Daily Logic Puzzles - Main Client Controller
 * Manages independent game states, timers, Testportalen-style calendar widget,
 * keyboard navigation, and board rendering.
 */

// Today's real local date string (YYYY-MM-DD)
const TODAY_STR = new Date().toISOString().split("T")[0];

// Main Application State
const state = {
    activeTab: "sudoku", // 'sudoku', 'tectonic', 'leaderboard'
    selectedDate: TODAY_STR,
    isPencilMode: false,

    // Calendar state
    calYear: parseInt(TODAY_STR.split("-")[0], 10),
    calMonth: parseInt(TODAY_STR.split("-")[1], 10) - 1, // 0-indexed

    // Independent Game States
    games: {
        sudoku: {
            timerSeconds: 0,
            timerInterval: null,
            isPaused: false,
            isCompleted: false,
            initialBoard: [],
            currentBoard: [],
            candidates: {},
            selectedCell: null
        },
        tectonic: {
            timerSeconds: 0,
            timerInterval: null,
            isPaused: false,
            isCompleted: false,
            initialBoard: [],
            currentBoard: [],
            gridCages: [],
            cages: {},
            candidates: {},
            selectedCell: null
        }
    }
};

const MONTH_NAMES_SV = [
    "JANUARI", "FEBRUARI", "MARS", "APRIL", "MAJ", "JUNI",
    "JULI", "AUGUSTI", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"
];

// DOM Elements
const el = {
    mainHeading: document.getElementById("pageMainHeading"),
    subtitle: document.getElementById("pageSubtitle"),
    dateDisplay: document.getElementById("activeDateDisplay"),
    timerDisplay: document.getElementById("timerDisplay"),
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
    gameViewContainer: document.getElementById("gameViewContainer"),
    leaderboardSection: document.getElementById("leaderboardSection"),
    leaderboardBody: document.getElementById("leaderboardBody"),
    // Calendar Elements
    calMonthPill: document.getElementById("calMonthPill"),
    calDaysGrid: document.getElementById("calendarDaysGrid"),
    btnCalPrev: document.getElementById("btnCalPrev"),
    btnCalNext: document.getElementById("btnCalNext"),
    // Status Badge & Victory Modal Elements
    puzzleInfoBadge: document.getElementById("puzzleInfoBadge"),
    victoryModal: document.getElementById("victoryModal"),
    victorySubtitle: document.getElementById("victorySubtitle"),
    victoryDifficultyPill: document.getElementById("victoryDifficultyPill"),
    victoryDateText: document.getElementById("victoryDateText"),
    victoryTimeValue: document.getElementById("victoryTimeValue"),
    victoryRankValue: document.getElementById("victoryRankValue"),
    victoryBoardContainer: document.getElementById("victoryBoardContainer"),
    victorySubmitGroup: document.getElementById("victorySubmitGroup"),
    playerNameInput: document.getElementById("playerNameInput"),
    btnSubmitScore: document.getElementById("btnSubmitScore"),
    btnCloseModal: document.getElementById("btnCloseModal")
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initControls();
    initCalendarControls();
    initKeyboardListeners();

    // Set initial date
    el.dateDisplay.textContent = state.selectedDate;

    // Load initial game
    switchToGame("sudoku");
});

// -------------------------------------------------------------
// Independent Timer Management
// -------------------------------------------------------------
function startTimerFor(gameType) {
    const g = state.games[gameType];
    clearInterval(g.timerInterval);

    if (g.isCompleted || g.isPaused) return;

    g.timerInterval = setInterval(() => {
        if (!g.isPaused && !g.isCompleted) {
            g.timerSeconds++;
            if (state.activeTab === gameType) {
                updateTimerDisplay(g.timerSeconds);
            }
        }
    }, 1000);
}

function pauseTimerFor(gameType) {
    const g = state.games[gameType];
    clearInterval(g.timerInterval);
    g.timerInterval = null;
}

function updateTimerDisplay(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    el.timerDisplay.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// -------------------------------------------------------------
// Tab & Game Switching
// -------------------------------------------------------------
function initTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.dataset.tab;
            if (state.activeTab === targetTab) return;

            // Pause outgoing timer
            if (state.activeTab === "sudoku" || state.activeTab === "tectonic") {
                pauseTimerFor(state.activeTab);
            }

            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeTab = targetTab;

            if (targetTab === "leaderboard") {
                el.gameViewContainer.classList.add("hidden");
                el.leaderboardSection.classList.remove("hidden");
                loadLeaderboard("sudoku");
            } else {
                el.gameViewContainer.classList.remove("hidden");
                el.leaderboardSection.classList.add("hidden");
                switchToGame(targetTab);
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

function switchToGame(gameType) {
    const isSudoku = gameType === "sudoku";

    // Update headers
    el.mainHeading.textContent = isSudoku ? "Dagens Sudoku-utmaning" : "Dagens Tectonic-utmaning";

    // Update board containers
    if (isSudoku) {
        el.sudokuContainer.classList.remove("hidden");
        el.tectonicContainer.classList.add("hidden");
        if (el.puzzleInfoBadge) el.puzzleInfoBadge.textContent = "Klassisk (9x9)";
        renderNumberPad(9);
    } else {
        el.sudokuContainer.classList.add("hidden");
        el.tectonicContainer.classList.remove("hidden");
        const gT = state.games.tectonic;
        const size = gT.gridSize || 6;
        const diff = gT.difficulty || "Medel";
        if (el.puzzleInfoBadge) el.puzzleInfoBadge.textContent = `${diff} (${size}x${size})`;
        renderNumberPad(5);
    }

    // Update timer display for this specific game
    const g = state.games[gameType];
    updateTimerDisplay(g.timerSeconds);
    el.btnPause.textContent = g.isPaused ? "Fortsatt" : "Pausa";

    // Re-render calendar for the active game type
    renderCalendar();

    // Check if board already loaded for this date, otherwise fetch
    if (g.initialBoard.length === 0) {
        loadPuzzle(gameType, state.selectedDate);
    } else {
        startTimerFor(gameType);
    }
}

// -------------------------------------------------------------
// Calendar Widget (Testportalen Style)
// -------------------------------------------------------------
function initCalendarControls() {
    el.btnCalPrev.addEventListener("click", () => {
        state.calMonth--;
        if (state.calMonth < 0) {
            state.calMonth = 11;
            state.calYear--;
        }
        renderCalendar();
    });

    el.btnCalNext.addEventListener("click", () => {
        state.calMonth++;
        if (state.calMonth > 11) {
            state.calMonth = 0;
            state.calYear++;
        }
        renderCalendar();
    });
}

function getCompletionHistory(gameType) {
    const storageKey = `daily_puzzles_history_${gameType}`;
    try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function saveCompletion(gameType, dateStr, solveTimeSeconds) {
    const storageKey = `daily_puzzles_history_${gameType}`;
    const history = getCompletionHistory(gameType);

    const onTime = (dateStr === TODAY_STR);
    history[dateStr] = {
        completed: true,
        onTime: onTime,
        timeSeconds: solveTimeSeconds,
        completedAt: TODAY_STR
    };

    try {
        localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {}

    renderCalendar();
}

function renderCalendar() {
    const gameType = state.activeTab === "leaderboard" ? "sudoku" : state.activeTab;
    const history = getCompletionHistory(gameType);

    el.calMonthPill.textContent = MONTH_NAMES_SV[state.calMonth];
    el.calDaysGrid.innerHTML = "";

    const year = state.calYear;
    const month = state.calMonth;

    // First day of the month (Monday = 1, Sunday = 0 -> adjust to Monday = 0..Sunday = 6)
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Pad empty cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "cal-day-cell empty";
        el.calDaysGrid.appendChild(emptyCell);
    }

    // Days 1..daysInMonth
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const cell = document.createElement("div");
        cell.className = "cal-day-cell";

        const isFuture = cellDateStr > TODAY_STR;
        const isSelected = cellDateStr === state.selectedDate;
        const completedData = history[cellDateStr];

        if (isFuture) {
            cell.classList.add("future");
            cell.textContent = day;
        } else {
            if (completedData && completedData.completed) {
                if (completedData.onTime) {
                    cell.classList.add("status-ontime");
                } else {
                    cell.classList.add("status-retro");
                }
                cell.innerHTML = `<span>${day}</span><span class="cal-check">&#10003;</span>`;
            } else {
                cell.textContent = day;
            }

            if (isSelected) {
                cell.classList.add("selected-day");
            }

            // Click day to load that puzzle
            cell.addEventListener("click", () => {
                selectDate(cellDateStr);
            });
        }

        el.calDaysGrid.appendChild(cell);
    }
}

function selectDate(dateStr) {
    if (state.selectedDate === dateStr) return;

    state.selectedDate = dateStr;
    el.dateDisplay.textContent = dateStr;

    // Reset current game state for new date
    const g = state.games[state.activeTab];
    pauseTimerFor(state.activeTab);
    g.timerSeconds = 0;
    g.isPaused = false;
    g.isCompleted = false;
    g.initialBoard = [];
    g.currentBoard = [];
    g.candidates = {};

    renderCalendar();
    loadPuzzle(state.activeTab, dateStr);
}

// -------------------------------------------------------------
// Puzzle API Fetching
// -------------------------------------------------------------
async function loadPuzzle(type, dateStr) {
    const g = state.games[type];
    try {
        const res = await fetch(`/api/puzzle?type=${type}&date=${dateStr}`);
        const data = await res.json();

        g.initialBoard = data.initial_board;
        g.currentBoard = JSON.parse(JSON.stringify(data.initial_board));
        g.candidates = {};

        // Check if already completed in local history
        const history = getCompletionHistory(type);
        if (history[dateStr] && history[dateStr].completed) {
            g.isCompleted = true;
            g.timerSeconds = history[dateStr].timeSeconds || 0;
        } else {
            g.isCompleted = false;
        }

        if (type === "sudoku") {
            g.difficulty = "Medel";
            g.gridSize = 9;
            renderSudokuGrid();
            if (state.activeTab === "sudoku") {
                if (el.puzzleInfoBadge) el.puzzleInfoBadge.textContent = "Klassisk (9x9)";
                renderNumberPad(9);
            }
        } else if (type === "tectonic") {
            g.gridSize = (data.metadata && data.metadata.grid_size) || (data.initial_board ? data.initial_board.length : 6);
            g.difficulty = (data.metadata && data.metadata.difficulty) || "Medel";
            g.gridCages = data.metadata.grid_cages;
            g.cages = data.metadata.cages;
            renderTectonicGrid();
            if (state.activeTab === "tectonic") {
                if (el.puzzleInfoBadge) el.puzzleInfoBadge.textContent = `${g.difficulty} (${g.gridSize}x${g.gridSize})`;
                renderNumberPad(5);
            }
        }

        updateTimerDisplay(g.timerSeconds);
        if (!g.isCompleted) {
            startTimerFor(type);
        }
    } catch (err) {
        console.error("Failed to load puzzle:", err);
    }
}

// -------------------------------------------------------------
// Grid Rendering: Sudoku (9x9)
// -------------------------------------------------------------
function renderSudokuGrid() {
    el.sudokuGrid.innerHTML = "";
    const g = state.games.sudoku;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "sudoku-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            const isFixed = g.initialBoard[r][c] !== 0;
            const val = g.currentBoard[r][c];

            if (isFixed) {
                cell.classList.add("fixed");
                cell.textContent = val;
            } else if (val !== 0) {
                cell.classList.add("user-filled");
                cell.textContent = val;
            } else {
                // Pencil marks
                const candKey = `${r},${c}`;
                if (g.candidates[candKey] && g.candidates[candKey].size > 0) {
                    const cGrid = document.createElement("div");
                    cGrid.className = "candidate-grid";
                    for (let n = 1; n <= 9; n++) {
                        const cNum = document.createElement("div");
                        cNum.className = "candidate-num";
                        if (g.candidates[candKey].has(n)) {
                            cNum.textContent = n;
                        }
                        cGrid.appendChild(cNum);
                    }
                    cell.appendChild(cGrid);
                }
            }

            cell.addEventListener("click", () => selectCell("sudoku", r, c));
            el.sudokuGrid.appendChild(cell);
        }
    }
}

// -------------------------------------------------------------
// Grid Rendering: Tectonic (Dynamic 6x6 to 9x9)
// -------------------------------------------------------------
function renderTectonicGrid() {
    el.tectonicGrid.innerHTML = "";
    const g = state.games.tectonic;
    const gridCages = g.gridCages;
    const cages = g.cages;
    const size = g.gridSize || (gridCages ? gridCages.length : 6);

    // Responsive cell size based on grid dimension
    let cellSize = 56;
    if (size === 7) cellSize = 48;
    else if (size === 8) cellSize = 42;
    else if (size === 9) cellSize = 38;

    el.tectonicGrid.style.setProperty("--grid-size", size);
    el.tectonicGrid.style.setProperty("--cell-size", `${cellSize}px`);

    const CAGE_COLORS = [
        "#EEF6FF", "#FFEBEB", "#FFF0E5", "#FFFDE6", 
        "#E8F8EA", "#E3F9F6", "#F4ECFB", "#FAF5EB", 
        "#F1F5F9", "#FEF3C7"
    ];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement("div");
            cell.className = "tectonic-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            const cid = gridCages[r][c];

            // Cage borders separating different cages
            if (r === 0 || gridCages[r - 1][c] !== cid) cell.classList.add("cage-border-top");
            if (r === size - 1 || gridCages[r + 1][c] !== cid) cell.classList.add("cage-border-bottom");
            if (c === 0 || gridCages[r][c - 1] !== cid) cell.classList.add("cage-border-left");
            if (c === size - 1 || gridCages[r][c + 1] !== cid) cell.classList.add("cage-border-right");

            // Pastel background tint
            cell.style.backgroundColor = CAGE_COLORS[cid % CAGE_COLORS.length];

            // Show cage size number in bottom-left corner of every cell
            if (cages && cages[cid]) {
                const badge = document.createElement("span");
                badge.className = "cage-size-num";
                badge.textContent = cages[cid].size;
                cell.appendChild(badge);
            }

            const isFixed = g.initialBoard[r][c] !== 0;
            const val = g.currentBoard[r][c];

            if (isFixed) {
                cell.classList.add("fixed");
                const valSpan = document.createElement("span");
                valSpan.className = "cell-val";
                valSpan.textContent = val;
                cell.appendChild(valSpan);
            } else if (val !== 0) {
                cell.classList.add("user-filled");
                const valSpan = document.createElement("span");
                valSpan.className = "cell-val";
                valSpan.textContent = val;
                cell.appendChild(valSpan);
            } else {
                // Pencil marks
                const candKey = `${r},${c}`;
                if (g.candidates[candKey] && g.candidates[candKey].size > 0) {
                    const cGrid = document.createElement("div");
                    cGrid.className = "candidate-grid";
                    const maxC = (cages && cages[cid]) ? cages[cid].size : 5;
                    for (let n = 1; n <= maxC; n++) {
                        const cNum = document.createElement("div");
                        cNum.className = "candidate-num";
                        if (g.candidates[candKey].has(n)) {
                            cNum.textContent = n;
                        }
                        cGrid.appendChild(cNum);
                    }
                    cell.appendChild(cGrid);
                }
            }

            cell.addEventListener("click", () => selectCell("tectonic", r, c));
            el.tectonicGrid.appendChild(cell);
        }
    }
}

// -------------------------------------------------------------
// Selection & Input Handling
// -------------------------------------------------------------
function selectCell(gameType, row, col) {
    state.games[gameType].selectedCell = { row, col };
    const container = gameType === "sudoku" ? el.sudokuGrid : el.tectonicGrid;
    const cells = container.querySelectorAll(gameType === "sudoku" ? ".sudoku-cell" : ".tectonic-cell");

    cells.forEach(c => {
        c.classList.remove("selected");
        const r = parseInt(c.dataset.row, 10);
        const colIdx = parseInt(c.dataset.col, 10);
        if (r === row && colIdx === col) {
            c.classList.add("selected");
        }
    });
}

function handleInputNumber(num) {
    const gameType = state.activeTab;
    if (gameType === "leaderboard") return;

    const g = state.games[gameType];
    if (!g.selectedCell || g.isCompleted) return;

    const { row, col } = g.selectedCell;
    if (g.initialBoard[row][col] !== 0) return; // Fixed clues locked

    const candKey = `${row},${col}`;

    if (state.isPencilMode && num !== 0) {
        if (!g.candidates[candKey]) {
            g.candidates[candKey] = new Set();
        }
        if (g.candidates[candKey].has(num)) {
            g.candidates[candKey].delete(num);
        } else {
            g.candidates[candKey].add(num);
        }
        g.currentBoard[row][col] = 0;
    } else {
        g.currentBoard[row][col] = num;
        if (g.candidates[candKey]) {
            delete g.candidates[candKey];
        }
    }

    if (gameType === "sudoku") {
        renderSudokuGrid();
    } else {
        renderTectonicGrid();
    }
    selectCell(gameType, row, col);

    checkIfBoardIsFull(gameType);
}

function checkIfBoardIsFull(gameType) {
    const g = state.games[gameType];
    const size = gameType === "sudoku" ? 9 : (g.gridSize || (g.currentBoard ? g.currentBoard.length : 6));

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (g.currentBoard[r][c] === 0) return;
        }
    }
    verifyCurrentBoard(gameType, true);
}

// -------------------------------------------------------------
// Verification & Score Submission
// -------------------------------------------------------------
async function verifyCurrentBoard(gameType, isAutoCheck) {
    const g = state.games[gameType];

    try {
        const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date_key: state.selectedDate,
                puzzle_type: gameType,
                time_seconds: g.timerSeconds,
                board: g.currentBoard
            })
        });
        const result = await res.json();

        // Highlight errors
        const container = gameType === "sudoku" ? el.sudokuGrid : el.tectonicGrid;
        container.querySelectorAll(".error").forEach(c => c.classList.remove("error"));

        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(err => {
                const cell = container.querySelector(`[data-row="${err.row}"][data-col="${err.col}"]`);
                if (cell) cell.classList.add("error");
            });
        }

        if (result.completed) {
            g.isCompleted = true;
            pauseTimerFor(gameType);

            // Record completion in local history and calendar
            saveCompletion(gameType, state.selectedDate, g.timerSeconds);
            renderCalendar();

            showVictoryModal(gameType, g.timerSeconds, result);
        } else if (!isAutoCheck && result.valid) {
            alert("Alla ifyllda siffror ar korrekta hittills!");
        }
    } catch (err) {
        console.error("Verification failed:", err);
    }
}

function formatSwedishDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const swedishMonths = [
        "januari", "februari", "mars", "april", "maj", "juni",
        "juli", "augusti", "september", "oktober", "november", "december"
    ];
    return `${day} ${swedishMonths[monthIdx] || ""} ${year}`;
}

function showVictoryModal(gameType, seconds, result) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const formattedTime = `${m}:${String(s).padStart(2, "0")}`;

    if (el.victoryTimeValue) el.victoryTimeValue.textContent = formattedTime;
    if (el.victoryRankValue) {
        el.victoryRankValue.textContent = (result && result.projected_rank) ? `#${result.projected_rank}` : "#1";
    }

    const gameName = gameType === "sudoku" ? "Sudoku" : "Tectonic";
    if (el.victorySubtitle) el.victorySubtitle.textContent = `Du klarade dagens ${gameName}`;

    const diff = (result && result.metadata && result.metadata.difficulty) || state.games[gameType].difficulty || "Medel";
    if (el.victoryDifficultyPill) el.victoryDifficultyPill.textContent = diff;
    if (el.victoryDateText) el.victoryDateText.textContent = formatSwedishDate(state.selectedDate);

    // Render Solved Board
    const solution = (result && result.solution_board) || state.games[gameType].currentBoard;
    renderVictorySolutionBoard(gameType, solution);

    el.victoryModal.classList.remove("hidden");
}

function renderVictorySolutionBoard(gameType, solutionBoard) {
    if (!el.victoryBoardContainer || !solutionBoard) return;
    el.victoryBoardContainer.innerHTML = "";

    if (gameType === "tectonic") {
        const g = state.games.tectonic;
        const gridCages = g.gridCages;
        const cages = g.cages;
        const size = solutionBoard.length;

        let solvedCellSize = 38;
        if (size === 7) solvedCellSize = 34;
        else if (size === 8) solvedCellSize = 30;
        else if (size === 9) solvedCellSize = 26;

        const grid = document.createElement("div");
        grid.className = "victory-solved-grid";
        grid.style.gridTemplateColumns = `repeat(${size}, ${solvedCellSize}px)`;
        grid.style.gridTemplateRows = `repeat(${size}, ${solvedCellSize}px)`;
        grid.style.setProperty("--solved-cell-size", `${solvedCellSize}px`);

        const CAGE_COLORS = [
            "#EEF6FF", "#FFEBEB", "#FFF0E5", "#FFFDE6", 
            "#E8F8EA", "#E3F9F6", "#F4ECFB", "#FAF5EB", 
            "#F1F5F9", "#FEF3C7"
        ];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement("div");
                cell.className = "victory-solved-cell";
                const cid = gridCages[r][c];

                if (r === 0 || gridCages[r - 1][c] !== cid) cell.classList.add("cage-border-top");
                if (r === size - 1 || gridCages[r + 1][c] !== cid) cell.classList.add("cage-border-bottom");
                if (c === 0 || gridCages[r][c - 1] !== cid) cell.classList.add("cage-border-left");
                if (c === size - 1 || gridCages[r][c + 1] !== cid) cell.classList.add("cage-border-right");

                cell.style.backgroundColor = CAGE_COLORS[cid % CAGE_COLORS.length];

                // Bottom-left cage size badge
                if (cages && cages[cid]) {
                    const kSpan = document.createElement("span");
                    kSpan.className = "cage-size-num";
                    kSpan.style.fontSize = `${Math.max(8, solvedCellSize * 0.22)}px`;
                    kSpan.textContent = cages[cid].size;
                    cell.appendChild(kSpan);
                }

                const numSpan = document.createElement("span");
                numSpan.textContent = solutionBoard[r][c];
                numSpan.style.fontSize = `${Math.max(12, solvedCellSize * 0.48)}px`;
                cell.appendChild(numSpan);

                grid.appendChild(cell);
            }
        }
        el.victoryBoardContainer.appendChild(grid);
    } else {
        // Sudoku
        const size = 9;
        const solvedCellSize = 28;
        const grid = document.createElement("div");
        grid.className = "victory-solved-grid";
        grid.style.gridTemplateColumns = `repeat(9, ${solvedCellSize}px)`;
        grid.style.gridTemplateRows = `repeat(9, ${solvedCellSize}px)`;
        grid.style.setProperty("--solved-cell-size", `${solvedCellSize}px`);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement("div");
                cell.className = "victory-solved-cell";
                if (c === 2 || c === 5) cell.classList.add("sudoku-border-right");
                if (r === 2 || r === 5) cell.classList.add("sudoku-border-bottom");

                cell.textContent = solutionBoard[r][c];
                cell.style.fontSize = "13px";
                grid.appendChild(cell);
            }
        }
        el.victoryBoardContainer.appendChild(grid);
    }
}

async function submitScoreToAPI() {
    const gameType = state.activeTab;
    const g = state.games[gameType];
    const playerName = el.playerNameInput.value.trim() || "Anonymous Solver";

    try {
        const res = await fetch("/api/submit-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date_key: state.selectedDate,
                puzzle_type: gameType,
                player_name: playerName,
                time_seconds: g.timerSeconds,
                board: g.currentBoard
            })
        });
        const data = await res.json();

        if (data.success) {
            el.victoryModal.classList.add("hidden");
            // Switch to leaderboard tab
            document.querySelector('.tab-btn[data-tab="leaderboard"]').click();
            document.querySelector(`.filter-pill[data-type="${gameType}"]`).click();
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
        const res = await fetch(`/api/leaderboard?type=${type}&date=${state.selectedDate}`);
        const data = await res.json();
        el.leaderboardBody.innerHTML = "";

        if (data.leaderboard.length === 0) {
            el.leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748B; padding:20px;">Inga resultat for ${state.selectedDate} an. Bli den forsta!</td></tr>`;
            return;
        }

        data.leaderboard.forEach(entry => {
            const tr = document.createElement("tr");
            const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : "";

            tr.innerHTML = `
                <td><span class="rank-badge ${rankClass}">#${entry.rank}</span></td>
                <td><strong>${escapeHtml(entry.player_name)}</strong></td>
                <td>${entry.formatted_time}</td>
                <td style="color:#64748B;">${entry.submitted_at ? entry.submitted_at.split(" ")[0] : state.selectedDate}</td>
            `;
            el.leaderboardBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load leaderboard:", err);
    }
}

// -------------------------------------------------------------
// Controls & Inputs
// -------------------------------------------------------------
function initControls() {
    el.btnPause.addEventListener("click", () => {
        const gameType = state.activeTab;
        if (gameType === "leaderboard") return;
        const g = state.games[gameType];

        g.isPaused = !g.isPaused;
        el.btnPause.textContent = g.isPaused ? "Fortsatt" : "Pausa";
        if (g.isPaused) {
            pauseTimerFor(gameType);
        } else {
            startTimerFor(gameType);
        }
    });

    el.btnReset.addEventListener("click", () => {
        if (confirm("Vill du borja om detta pussel? Tiden nollstalls.")) {
            const gameType = state.activeTab;
            const g = state.games[gameType];
            pauseTimerFor(gameType);
            g.timerSeconds = 0;
            g.isPaused = false;
            g.isCompleted = false;
            g.currentBoard = JSON.parse(JSON.stringify(g.initialBoard));
            g.candidates = {};

            updateTimerDisplay(0);
            if (gameType === "sudoku") renderSudokuGrid();
            else renderTectonicGrid();
            startTimerFor(gameType);
        }
    });

    el.btnCheckErrors.addEventListener("click", () => {
        verifyCurrentBoard(state.activeTab, false);
    });

    el.btnModePen.addEventListener("click", () => setPencilMode(false));
    el.btnModePencil.addEventListener("click", () => setPencilMode(true));
    el.btnErase.addEventListener("click", () => handleInputNumber(0));

    el.btnCloseModal.addEventListener("click", () => el.victoryModal.classList.add("hidden"));
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

function initKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
        if (state.activeTab === "leaderboard") return;
        const g = state.games[state.activeTab];
        if (g.isCompleted) return;

        if (e.key >= "1" && e.key <= "9") {
            const num = parseInt(e.key, 10);
            const max = state.activeTab === "sudoku" ? 9 : 5;
            if (num <= max) handleInputNumber(num);
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
    const g = state.games[state.activeTab];
    const size = isSudoku ? 9 : (g.gridSize || (g.initialBoard ? g.initialBoard.length : 6));

    if (!g.selectedCell) {
        selectCell(state.activeTab, 0, 0);
        return;
    }

    let { row, col } = g.selectedCell;
    if (key === "ArrowUp") row = Math.max(0, row - 1);
    if (key === "ArrowDown") row = Math.min(size - 1, row + 1);
    if (key === "ArrowLeft") col = Math.max(0, col - 1);
    if (key === "ArrowRight") col = Math.min(size - 1, col + 1);

    selectCell(state.activeTab, row, col);
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
