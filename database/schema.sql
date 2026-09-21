-- Database Schema for Daily Logic Puzzles

CREATE TABLE IF NOT EXISTS daily_puzzles (
    puzzle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    puzzle_type TEXT NOT NULL,          -- 'sudoku' or 'tectonic'
    initial_board_json TEXT NOT NULL,
    solution_board_json TEXT NOT NULL,
    metadata_json TEXT,                 -- Cages for tectonic, clues count
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date_key, puzzle_type)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    puzzle_type TEXT NOT NULL,          -- 'sudoku' or 'tectonic'
    player_name TEXT NOT NULL,
    completion_time_seconds REAL NOT NULL,
    is_clean_solve INTEGER NOT NULL,    -- 1 = Clean solve (no hints/error checks), 0 = Assisted
    hints_used INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_query 
ON leaderboard_entries (date_key, puzzle_type, is_clean_solve, completion_time_seconds ASC);
