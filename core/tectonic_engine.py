"""
Tectonic (Suguru) Engine
Generates polyomino partitioned grids (6x6) with cages of size 2 to 5,
solves using Minimum Remaining Values (MRV) constraint propagation,
and validates submitted solutions.
"""

import random
from collections import defaultdict

# Library of diverse 6x6 polyomino cage partitions
# Each partition contains 8 cages of sizes 3 to 5 (summing to 36 cells)
CAGE_TEMPLATES = [
    # Template 1
    [
        [0, 0, 0, 1, 1, 1],
        [0, 0, 2, 2, 1, 1],
        [3, 3, 2, 2, 4, 4],
        [3, 3, 2, 5, 4, 4],
        [6, 6, 5, 5, 4, 7],
        [6, 6, 6, 5, 7, 7]
    ],
    # Template 2
    [
        [0, 0, 1, 1, 1, 2],
        [0, 0, 0, 1, 2, 2],
        [3, 3, 4, 1, 2, 2],
        [3, 4, 4, 5, 5, 6],
        [3, 3, 4, 4, 5, 6],
        [7, 7, 7, 7, 5, 6]
    ],
    # Template 3
    [
        [0, 0, 0, 0, 1, 1],
        [2, 2, 0, 1, 1, 1],
        [2, 3, 3, 4, 4, 4],
        [2, 2, 3, 3, 4, 4],
        [5, 5, 3, 6, 6, 7],
        [5, 5, 5, 6, 6, 7]
    ],
    # Template 4
    [
        [0, 0, 1, 1, 1, 1],
        [0, 0, 0, 2, 2, 1],
        [3, 3, 2, 2, 2, 4],
        [3, 5, 5, 5, 4, 4],
        [3, 3, 6, 5, 4, 4],
        [6, 6, 6, 5, 7, 7]
    ]
]

def rotate_grid(grid):
    return [list(row) for row in zip(*grid[::-1])]

def reflect_grid(grid):
    return [row[::-1] for row in grid]

def get_transformed_template(template_idx, rotation_k, do_reflect):
    grid = [row[:] for row in CAGE_TEMPLATES[template_idx % len(CAGE_TEMPLATES)]]
    for _ in range(rotation_k % 4):
        grid = rotate_grid(grid)
    if do_reflect:
        grid = reflect_grid(grid)

    # Re-normalize cage IDs to be 0..N
    id_map = {}
    normalized = []
    current_id = 0
    for r in range(6):
        row = []
        for c in range(6):
            orig_id = grid[r][c]
            if orig_id not in id_map:
                id_map[orig_id] = current_id
                current_id += 1
            row.append(id_map[orig_id])
        normalized.append(row)

    return normalized

def solve_tectonic_mrv(grid_cages, rng):
    rows, cols = 6, 6
    cages = defaultdict(list)
    for r in range(rows):
        for c in range(cols):
            cages[grid_cages[r][c]].append((r, c))

    board = [[0 for _ in range(cols)] for _ in range(rows)]

    def is_valid(r, c, val):
        cid = grid_cages[r][c]
        if val > len(cages[cid]):
            return False
        # Cage uniqueness
        for cr, cc in cages[cid]:
            if (cr, cc) != (r, c) and board[cr][cc] == val:
                return False
        # 8-direction adjacency
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    if board[nr][nc] == val:
                        return False
        return True

    def get_candidates(r, c):
        cid = grid_cages[r][c]
        size = len(cages[cid])
        valid_nums = [v for v in range(1, size + 1) if is_valid(r, c, v)]
        rng.shuffle(valid_nums)
        return valid_nums

    def search():
        # Minimum Remaining Values (MRV) heuristic
        min_cands = None
        best_cell = None
        for r in range(rows):
            for c in range(cols):
                if board[r][c] == 0:
                    cands = get_candidates(r, c)
                    if len(cands) == 0:
                        return False
                    if min_cands is None or len(cands) < len(min_cands):
                        min_cands = cands
                        best_cell = (r, c)
        if best_cell is None:
            return True # Solved

        br, bc = best_cell
        for val in min_cands:
            board[br][bc] = val
            if search():
                return True
            board[br][bc] = 0
        return False

    if search():
        return board, cages
    return None, None

def create_daily_tectonic(seed_int, clues=14):
    rng = random.Random(seed_int)
    template_idx = rng.randint(0, len(CAGE_TEMPLATES) - 1)
    rotation_k = rng.randint(0, 3)
    do_reflect = rng.choice([True, False])

    grid_cages = get_transformed_template(template_idx, rotation_k, do_reflect)
    solution, cages = solve_tectonic_mrv(grid_cages, rng)

    if solution is None:
        # Fallback to direct first template
        grid_cages = CAGE_TEMPLATES[0]
        solution, cages = solve_tectonic_mrv(grid_cages, random.Random(42))

    puzzle = [row[:] for row in solution]

    # Mask cells deterministically
    all_cells = [(r, c) for r in range(6) for c in range(6)]
    rng.shuffle(all_cells)

    cells_to_remove = 36 - clues
    for r, c in all_cells[:cells_to_remove]:
        puzzle[r][c] = 0

    cages_export = {}
    for cid, cells in cages.items():
        cages_export[cid] = {
            "size": len(cells),
            "cells": cells
        }

    return {
        "grid_cages": grid_cages,
        "cages": cages_export,
        "initial_board": puzzle,
        "solution_board": solution,
        "clues_count": clues
    }

def validate_tectonic_board(user_board, solution_board):
    errors = []
    is_complete = True

    for r in range(6):
        for c in range(6):
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
