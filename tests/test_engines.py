import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.db import init_db, get_connection, get_or_create_daily_puzzle, submit_leaderboard_score, get_leaderboard_entries, get_projected_rank
from core.sudoku_engine import create_daily_sudoku, validate_sudoku_board
from core.tectonic_engine import create_daily_tectonic, validate_tectonic_board

def test_engines():
    init_db()

    # 1. Test Sudoku
    sudoku = get_or_create_daily_puzzle("2026-09-21", "sudoku")
    assert len(sudoku["initial_board"]) == 9
    assert len(sudoku["_solution"]) == 9
    val_sudoku = validate_sudoku_board(sudoku["_solution"], sudoku["_solution"])
    assert val_sudoku["completed"] is True
    assert val_sudoku["valid"] is True

    # 2. Test Tectonic Multi-Size and Difficulty Across Seeds
    observed_sizes = set()
    observed_diffs = set()

    for s in range(50):
        t = create_daily_tectonic(s)
        size = t["grid_size"]
        diff = t["difficulty"]
        observed_sizes.add(size)
        observed_diffs.add(diff)

        assert 6 <= size <= 9
        assert diff in ["Lätt", "Medel", "Svår"]
        assert len(t["initial_board"]) == size
        assert len(t["solution_board"]) == size
        assert len(t["grid_cages"]) == size

        # Validate solved board
        v = validate_tectonic_board(t["solution_board"], t["solution_board"])
        assert v["completed"] is True
        assert v["valid"] is True

    assert observed_sizes.issuperset({6, 7, 8, 9})
    assert observed_diffs.issuperset({"Lätt", "Medel", "Svår"})

    # 3. Test Database Tectonic Retrieval
    tectonic_db = get_or_create_daily_puzzle("2026-09-21", "tectonic")
    assert "grid_size" in tectonic_db["metadata"]
    assert "difficulty" in tectonic_db["metadata"]
    assert "grid_cages" in tectonic_db["metadata"]
    assert "cages" in tectonic_db["metadata"]
    assert len(tectonic_db["initial_board"]) == tectonic_db["metadata"]["grid_size"]

    # 4. Test Leaderboard and Projected Rank
    test_date = "2099-01-01"
    conn = get_connection()
    conn.execute("DELETE FROM leaderboard_entries WHERE date_key = ?", (test_date,))
    conn.commit()
    conn.close()

    submit_leaderboard_score(test_date, "tectonic", "Player1", 95.0)
    submit_leaderboard_score(test_date, "tectonic", "Player2", 140.0)

    rank_fast = get_projected_rank(test_date, "tectonic", 80.0)
    assert rank_fast == 1

    rank_middle = get_projected_rank(test_date, "tectonic", 110.0)
    assert rank_middle == 2

    rank_slow = get_projected_rank(test_date, "tectonic", 200.0)
    assert rank_slow == 3

    lb = get_leaderboard_entries(test_date, "tectonic")
    assert len(lb) >= 2
    assert lb[0]["player_name"] == "Player1"

    print("All engine, database, and ranking tests passed successfully.")

if __name__ == "__main__":
    test_engines()
