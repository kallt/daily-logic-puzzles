"""
Daily Logic Puzzles Web Application
Flask REST API and server serving interactive Sudoku and Tectonic challenges.
"""

from flask import Flask, render_template, request, jsonify
from datetime import datetime
from database.db import init_db, get_or_create_daily_puzzle, submit_leaderboard_score, get_leaderboard_entries, get_projected_rank
from core.sudoku_engine import validate_sudoku_board
from core.tectonic_engine import validate_tectonic_board

app = Flask(__name__)

# Initialize database tables on startup
init_db()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/puzzle", methods=["GET"])
def get_puzzle():
    puzzle_type = request.args.get("type", "sudoku").lower()
    date_key = request.args.get("date", datetime.utcnow().strftime("%Y-%m-%d"))

    if puzzle_type not in ["sudoku", "tectonic"]:
        return jsonify({"error": "Invalid puzzle type. Must be 'sudoku' or 'tectonic'."}), 400

    try:
        puzzle = get_or_create_daily_puzzle(date_key, puzzle_type)
        response_data = {
            "puzzle_id": puzzle["puzzle_id"],
            "date_key": puzzle["date_key"],
            "puzzle_type": puzzle["puzzle_type"],
            "initial_board": puzzle["initial_board"],
            "metadata": puzzle["metadata"]
        }
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/verify", methods=["POST"])
def verify_board():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    date_key = data.get("date_key")
    puzzle_type = data.get("puzzle_type", "sudoku").lower()
    user_board = data.get("board")

    if not date_key or not user_board:
        return jsonify({"error": "Missing date_key or board data"}), 400

    try:
        puzzle = get_or_create_daily_puzzle(date_key, puzzle_type)
        solution = puzzle["_solution"]

        if puzzle_type == "sudoku":
            result = validate_sudoku_board(user_board, solution)
        elif puzzle_type == "tectonic":
            result = validate_tectonic_board(user_board, solution)
        else:
            return jsonify({"error": "Unsupported puzzle type"}), 400

        if result.get("completed"):
            time_seconds = float(data.get("time_seconds", 0))
            result["projected_rank"] = get_projected_rank(date_key, puzzle_type, time_seconds)
            result["solution_board"] = solution
            result["metadata"] = puzzle.get("metadata", {})

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/submit-score", methods=["POST"])
def submit_score():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing payload"}), 400

    date_key = data.get("date_key")
    puzzle_type = data.get("puzzle_type", "sudoku").lower()
    player_name = data.get("player_name", "Anonymous Solver")
    time_seconds = float(data.get("time_seconds", 0))
    user_board = data.get("board")

    if not date_key or not user_board:
        return jsonify({"error": "Missing date or board data"}), 400

    try:
        puzzle = get_or_create_daily_puzzle(date_key, puzzle_type)
        solution = puzzle["_solution"]

        # Re-verify complete solution on server
        if puzzle_type == "sudoku":
            validation = validate_sudoku_board(user_board, solution)
        elif puzzle_type == "tectonic":
            validation = validate_tectonic_board(user_board, solution)
        else:
            return jsonify({"error": "Invalid puzzle type"}), 400

        if not validation["completed"]:
            return jsonify({"error": "Board is not correctly completed", "errors": validation["errors"]}), 400

        # Save to database
        entry = submit_leaderboard_score(
            date_key, puzzle_type, player_name, time_seconds
        )

        return jsonify({
            "success": True,
            "entry": entry
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    puzzle_type = request.args.get("type", "sudoku").lower()
    date_key = request.args.get("date", datetime.utcnow().strftime("%Y-%m-%d"))

    try:
        entries = get_leaderboard_entries(date_key, puzzle_type)
        return jsonify({
            "date_key": date_key,
            "puzzle_type": puzzle_type,
            "leaderboard": entries
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
