"""
Sudoku Engine
Generates valid 9x9 Sudoku boards using randomized backtracking,
masks cells to produce daily puzzles, and validates submitted solutions.
"""

import random

def is_valid_sudoku_move(board, row, col, num):
    # Check row
    for c in range(9):
        if board[row][c] == num:
            return False

    # Check col
    for r in range(9):
        if board[r][col] == num:
            return False

    # Check 3x3 subgrid
    start_r = (row // 3) * 3
    start_c = (col // 3) * 3
    for r in range(start_r, start_r + 3):
        for c in range(start_c, start_c + 3):
            if board[r][c] == num:
                return False

    return True

def solve_sudoku(board):
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                for num in range(1, 10):
                    if is_valid_sudoku_move(board, r, c, num):
                        board[r][c] = num
                        if solve_sudoku(board):
                            return True
                        board[r][c] = 0
                return False
    return True

def generate_full_sudoku(rng):
    board = [[0 for _ in range(9)] for _ in range(9)]
    
    # Fill diagonal 3x3 boxes first (independent of each other)
    for box_idx in [0, 3, 6]:
        nums = list(range(1, 10))
        rng.shuffle(nums)
        idx = 0
        for r in range(box_idx, box_idx + 3):
            for c in range(box_idx, box_idx + 3):
                board[r][c] = nums[idx]
                idx += 1

    # Solve the rest with randomized order
    def fill_remaining(b):
        for r in range(9):
            for c in range(9):
                if b[r][c] == 0:
                    nums = list(range(1, 10))
                    rng.shuffle(nums)
                    for num in nums:
                        if is_valid_sudoku_move(b, r, c, num):
                            b[r][c] = num
                            if fill_remaining(b):
                                return True
                            b[r][c] = 0
                    return False
        return True

    fill_remaining(board)
    return board

def create_daily_sudoku(seed_int, clues=33):
    rng = random.Random(seed_int)
    solution = generate_full_sudoku(rng)
    
    # Deep copy for puzzle board
    puzzle = [row[:] for row in solution]
    
    # Remove cells symmetrically to leave 'clues' numbers
    cells = [(r, c) for r in range(9) for c in range(9)]
    rng.shuffle(cells)
    
    cells_to_remove = 81 - clues
    removed = 0
    for r, c in cells:
        if removed >= cells_to_remove:
            break
        puzzle[r][c] = 0
        removed += 1

    return {
        "initial_board": puzzle,
        "solution_board": solution,
        "clues_count": clues
    }

def validate_sudoku_board(user_board, solution_board):
    errors = []
    is_complete = True

    for r in range(9):
        for c in range(9):
            val = user_board[r][c]
            if val == 0:
                is_complete = False
            elif val != solution_board[r][c]:
                errors.append({"row": r, "col": c, "value": val})

    return {
        "valid": len(errors) == 0,
        "completed": is_complete and len(errors) == 0,
        "errors": errors
    }
