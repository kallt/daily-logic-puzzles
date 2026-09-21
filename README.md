# Daily Logic Puzzles (Sudoku & Tectonic)

I built this hobby project because I really enjoy solving logic puzzles in my spare time (especially daily ones on sites like Testportalen.se). I wanted to see if I could make my own browser-based version from scratch, with seeded daily puzzles, calendar streak tracking, and local leaderboards.

---

## What is this?

A web application that generates a new logic challenge every day:

- **Daily Sudoku (9x9):** The classic number-placement puzzle with rows, columns, and 3x3 boxes.
- **Daily Tectonic (Suguru):** A polyomino grid puzzle that randomly rotates between different grid sizes (6x6, 7x7, 8x8, and 9x9) and difficulty levels (Easy, Medium, and Hard). Each square displays the size of its block in the bottom-left corner.
- **Calendar Progress:** An interactive calendar tracking your finished puzzles. Solving a puzzle on the day it releases marks it green, while finishing past puzzles marks them yellow. Puzzles can be played back to July 2026, while future dates stay locked until their release day.
- **Separate Timers:** Switching between Sudoku and Tectonic pauses the timer on the inactive game, so times are kept completely independent.
- **Quality-of-life Controls:** Clicking or typing the same number in a filled cell toggles it back to empty. Arrow keys navigate the board, and pressing 'P' switches between pen and pencil note mode.
- **Daily Leaderboards:** A simple daily highscore board where you can submit your completion times and compare your ranks.

---

## How to Play Tectonic (Suguru)

If you haven't played Tectonic before, the rules are straightforward:

1. The board is divided into bold polyomino blocks (cages) of sizes 2 to 5.
2. A block of size N must contain numbers 1 through N exactly once (e.g. a 5-block has 1, 2, 3, 4, 5).
3. The small grey number in the bottom-left corner of each cell tells you the total size of that block.
4. Identical numbers cannot touch each other anywhere, including diagonally in all 8 directions.

---

## How to Run It Locally

You only need Python installed:

```bash
# 1. Clone the repo
git clone https://github.com/kallt/daily-logic-puzzles.git
cd daily-logic-puzzles

# 2. Install dependencies (only Flask is required)
pip install -r requirements.txt

# 3. Start the server
python app.py
```

Then open `http://127.0.0.1:5000` in your web browser.

To run the automated tests:
```bash
python tests/test_engines.py
```

---

## Tech Behind the Project

I wanted to keep things lightweight and snappy without unnecessary dependencies:

- **Backend:** Python with Flask serving JSON endpoints and SQLite for storing puzzles and leaderboard entries.
- **Puzzle Generators:** Deterministic SHA-256 date seeding so everyone gets the exact same daily board, with constraint propagation and Minimum Remaining Values (MRV) backtracking.
- **Frontend:** Vanilla JavaScript, CSS3, and HTML5. State is handled on the client with LocalStorage preserving calendar history across visits.

---

## Author

Built by [kallt](https://github.com/kallt) for the love of puzzles.
