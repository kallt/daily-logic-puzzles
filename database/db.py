"""
Database Helper Module
Manages SQLite database initialization, puzzle caching, and leaderboard queries.
"""

import os
import json
import sqlite3
from datetime import datetime
from core.daily_seed import generate_daily_seed
from core.sudoku_engine import create_daily_sudoku
from core.tectonic_engine import create_daily_tectonic

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "puzzles.db")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()

def get_or_create_daily_puzzle(date_key, puzzle_type):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT puzzle_id, date_key, puzzle_type, initial_board_json, solution_board_json, metadata_json
        FROM daily_puzzles
        WHERE date_key = ? AND puzzle_type = ?
    """, (date_key, puzzle_type))
    row = cursor.fetchone()

    if row:
        puzzle = {
            "puzzle_id": row["puzzle_id"],
            "date_key": row["date_key"],
            "puzzle_type": row["puzzle_type"],
            "initial_board": json.loads(row["initial_board_json"]),
            "metadata": json.loads(row["metadata_json"]) if row["metadata_json"] else {},
            "_solution": json.loads(row["solution_board_json"]) # internal use only
        }
        conn.close()
        return puzzle

    # Generate new puzzle
    seed = generate_daily_seed(date_key, puzzle_type)
    if puzzle_type == "sudoku":
        generated = create_daily_sudoku(seed)
        metadata = {"clues_count": generated["clues_count"]}
    elif puzzle_type == "tectonic":
        generated = create_daily_tectonic(seed)
        metadata = {
            "grid_cages": generated["grid_cages"],
            "cages": generated["cages"],
            "clues_count": generated["clues_count"]
        }
    else:
        conn.close()
        raise ValueError(f"Unsupported puzzle type: {puzzle_type}")

    cursor.execute("""
        INSERT INTO daily_puzzles (date_key, puzzle_type, initial_board_json, solution_board_json, metadata_json)
        VALUES (?, ?, ?, ?, ?)
    """, (
        date_key,
        puzzle_type,
        json.dumps(generated["initial_board"]),
        json.dumps(generated["solution_board"]),
        json.dumps(metadata)
    ))
    conn.commit()
    puzzle_id = cursor.lastrowid
    conn.close()

    return {
        "puzzle_id": puzzle_id,
        "date_key": date_key,
        "puzzle_type": puzzle_type,
        "initial_board": generated["initial_board"],
        "metadata": metadata,
        "_solution": generated["solution_board"]
    }

def submit_leaderboard_score(date_key, puzzle_type, player_name, time_seconds, is_clean_solve, hints_used=0):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Sanitize player name
    clean_name = player_name.strip()[:24] if player_name and player_name.strip() else "Anonymous Solver"

    cursor.execute("""
        INSERT INTO leaderboard_entries 
        (date_key, puzzle_type, player_name, completion_time_seconds, is_clean_solve, hints_used)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (date_key, puzzle_type, clean_name, time_seconds, 1 if is_clean_solve else 0, hints_used))
    conn.commit()
    entry_id = cursor.lastrowid

    # Compute rank for this entry among clean solves (if clean) or overall
    cursor.execute("""
        SELECT COUNT(*) + 1 AS rank_pos
        FROM leaderboard_entries
        WHERE date_key = ? AND puzzle_type = ? AND is_clean_solve = ?
          AND completion_time_seconds < ?
    """, (date_key, puzzle_type, 1 if is_clean_solve else 0, time_seconds))
    rank_pos = cursor.fetchone()["rank_pos"]

    conn.close()
    return {
        "entry_id": entry_id,
        "rank": rank_pos,
        "player_name": clean_name,
        "time_seconds": time_seconds,
        "is_clean_solve": is_clean_solve
    }

def get_leaderboard_entries(date_key, puzzle_type, limit=25):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            entry_id, player_name, completion_time_seconds, is_clean_solve, hints_used, submitted_at
        FROM leaderboard_entries
        WHERE date_key = ? AND puzzle_type = ?
        ORDER BY is_clean_solve DESC, completion_time_seconds ASC
        LIMIT ?
    """, (date_key, puzzle_type, limit))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for idx, row in enumerate(rows, start=1):
        secs = row["completion_time_seconds"]
        m = int(secs // 60)
        s = int(secs % 60)
        formatted_time = f"{m:02d}:{s:02d}"

        results.append({
            "rank": idx,
            "player_name": row["player_name"],
            "time_seconds": secs,
            "formatted_time": formatted_time,
            "is_clean_solve": bool(row["is_clean_solve"]),
            "hints_used": row["hints_used"],
            "submitted_at": row["submitted_at"]
        })

    return results
