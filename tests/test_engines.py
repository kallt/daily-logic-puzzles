import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.db import init_db, get_or_create_daily_puzzle, submit_leaderboard_score, get_leaderboard_entries
from core.sudoku_engine import validate_sudoku_board
from core.tectonic_engine import validate_tectonic_board

def test_engines():
    init_db()

    # Test Sudoku
    sudoku = get_or_create_daily_puzzle("2026-09-21", "sudoku")
    assert len(sudoku["initial_board"]) == 9
    val_sudoku = validate_sudoku_board(sudoku["_solution"], sudoku["_solution"])
    assert val_sudoku["completed"] is True

    # Test Tectonic
    tectonic = get_or_create_daily_puzzle("2026-09-21", "tectonic")
    assert len(tectonic["initial_board"]) == 6
    val_tectonic = validate_tectonic_board(tectonic["_solution"], tectonic["_solution"])
    assert val_tectonic["completed"] is True

    # Test Leaderboard
    submit_leaderboard_score("2026-09-21", "sudoku", "Alice", 185.2)
    submit_leaderboard_score("2026-09-21", "sudoku", "Bob", 210.0)
    lb = get_leaderboard_entries("2026-09-21", "sudoku")
    assert len(lb) >= 2
    assert lb[0]["player_name"] == "Alice"

    print("All engine and database tests passed.")

if __name__ == "__main__":
    test_engines()
