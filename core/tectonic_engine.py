"""
Tectonic (Suguru) Engine
Generates polyomino partitioned grids between 6x6 and 9x9 with cages of size 2 to 5,
supports dynamic difficulty levels (Latt, Medel, Svar),
and validates submitted solutions.
"""

import random
from collections import defaultdict

# Library of verified cage partitions and base solutions
TECTONIC_TEMPLATES = {
    6: [
        {
            "cages": [
                [0, 0, 0, 1, 1, 1],
                [0, 0, 2, 2, 1, 1],
                [3, 3, 2, 2, 4, 4],
                [3, 3, 2, 5, 4, 4],
                [6, 6, 5, 5, 4, 7],
                [6, 6, 6, 5, 7, 7]
            ],
            "solution": [
                [3, 5, 2, 5, 4, 1],
                [1, 4, 1, 3, 2, 3],
                [2, 3, 5, 4, 1, 5],
                [4, 1, 2, 3, 2, 3],
                [2, 3, 4, 1, 4, 1],
                [4, 1, 5, 2, 3, 2]
            ]
        },
        {
            "cages": [
                [0, 0, 0, 0, 1, 1],
                [2, 3, 3, 1, 1, 1],
                [2, 2, 3, 3, 4, 4],
                [2, 5, 6, 6, 4, 4],
                [2, 5, 5, 7, 8, 8],
                [5, 5, 7, 7, 7, 7]
            ],
            "solution": [
                [1, 4, 3, 2, 1, 2],
                [5, 2, 1, 5, 4, 3],
                [1, 3, 4, 3, 1, 2],
                [2, 5, 1, 2, 4, 3],
                [4, 3, 4, 5, 1, 2],
                [1, 2, 1, 2, 3, 4]
            ]
        }
    ],
    7: [
        {
            "cages": [
                [0, 0, 0, 1, 1, 1, 1],
                [0, 0, 2, 2, 1, 3, 3],
                [4, 4, 2, 2, 2, 3, 3],
                [4, 4, 4, 5, 5, 5, 3],
                [6, 6, 7, 7, 5, 5, 8],
                [6, 6, 6, 7, 7, 8, 8],
                [9, 9, 9, 7, 10, 10, 8]
            ],
            "solution": [
                [4, 2, 1, 5, 3, 1, 2],
                [5, 3, 4, 2, 4, 5, 3],
                [2, 1, 5, 3, 1, 2, 4],
                [5, 3, 4, 2, 5, 3, 1],
                [1, 2, 1, 3, 1, 4, 2],
                [3, 4, 5, 4, 5, 3, 1],
                [1, 2, 3, 2, 1, 2, 4]
            ]
        }
    ],
    8: [
        {
            "cages": [
                [0, 0, 0, 1, 1, 1, 2, 2],
                [0, 0, 3, 3, 1, 1, 2, 2],
                [4, 4, 3, 3, 3, 5, 5, 2],
                [4, 4, 4, 6, 6, 5, 5, 5],
                [7, 7, 7, 6, 6, 6, 8, 8],
                [7, 7, 9, 9, 9, 10, 8, 8],
                [11, 11, 11, 9, 9, 10, 10, 8],
                [11, 11, 12, 12, 12, 12, 10, 10]
            ],
            "solution": [
                [2, 4, 5, 4, 3, 1, 4, 2],
                [3, 1, 3, 1, 2, 5, 3, 5],
                [2, 4, 2, 5, 4, 1, 2, 1],
                [3, 5, 1, 3, 2, 3, 5, 4],
                [1, 4, 2, 4, 5, 1, 2, 1],
                [5, 3, 5, 1, 2, 4, 5, 3],
                [1, 4, 2, 4, 3, 1, 2, 4],
                [3, 5, 3, 1, 2, 4, 5, 3]
            ]
        }
    ],
    9: [
        {
            "cages": [
                [0, 0, 0, 1, 1, 1, 2, 2, 2],
                [0, 0, 3, 3, 1, 1, 2, 2, 4],
                [5, 5, 3, 3, 6, 6, 6, 4, 4],
                [5, 5, 5, 7, 7, 7, 6, 6, 4],
                [8, 8, 8, 7, 7, 9, 9, 4, 10],
                [8, 8, 11, 11, 11, 9, 9, 9, 10],
                [12, 12, 12, 11, 11, 13, 13, 10, 10],
                [12, 12, 14, 14, 14, 13, 13, 13, 10],
                [15, 15, 15, 14, 14, 16, 16, 16, 16]
            ],
            "solution": [
                [1, 4, 2, 5, 2, 4, 2, 5, 4],
                [3, 5, 3, 1, 3, 1, 3, 1, 3],
                [4, 1, 4, 2, 4, 2, 5, 4, 5],
                [5, 2, 3, 1, 5, 3, 1, 3, 1],
                [3, 1, 5, 2, 4, 2, 5, 2, 5],
                [4, 2, 4, 1, 5, 3, 4, 1, 4],
                [1, 3, 5, 3, 2, 1, 2, 3, 2],
                [2, 4, 1, 4, 5, 3, 5, 4, 1],
                [1, 3, 2, 3, 2, 4, 1, 2, 3]
            ]
        }
    ]
}

DIFFICULTY_CONFIG = {
    "Lätt": 0.48,   # ~48% cells given as clues
    "Medel": 0.36,  # ~36% cells given as clues
    "Svår": 0.26    # ~26% cells given as clues
}

def rotate_grid(grid):
    return [list(row) for row in zip(*grid[::-1])]

def reflect_grid(grid):
    return [row[::-1] for row in grid]

def get_transformed_puzzle(template_dict, rotation_k, do_reflect):
    cages_grid = [row[:] for row in template_dict["cages"]]
    sol_grid = [row[:] for row in template_dict["solution"]]

    for _ in range(rotation_k % 4):
        cages_grid = rotate_grid(cages_grid)
        sol_grid = rotate_grid(sol_grid)

    if do_reflect:
        cages_grid = reflect_grid(cages_grid)
        sol_grid = reflect_grid(sol_grid)

    rows = len(cages_grid)
    cols = len(cages_grid[0])

    # Re-normalize cage IDs to be 0..M-1
    id_map = {}
    normalized_cages = []
    current_id = 0
    for r in range(rows):
        row = []
        for c in range(cols):
            orig_id = cages_grid[r][c]
            if orig_id not in id_map:
                id_map[orig_id] = current_id
                current_id += 1
            row.append(id_map[orig_id])
        normalized_cages.append(row)

    return normalized_cages, sol_grid

def create_daily_tectonic(seed_int):
    """
    Creates a deterministic daily Tectonic puzzle with randomized size (6x6 to 9x9)
    and difficulty ('Latt', 'Medel', 'Svar').
    """
    rng = random.Random(seed_int)

    # Randomize size between 6x6 and 9x9
    size = rng.choice([6, 7, 8, 9])

    # Randomize difficulty
    difficulty = rng.choice(["Lätt", "Medel", "Svår"])
    clue_ratio = DIFFICULTY_CONFIG[difficulty]

    templates = TECTONIC_TEMPLATES[size]
    selected_template = rng.choice(templates)

    rotation_k = rng.randint(0, 3)
    do_reflect = rng.choice([True, False])

    grid_cages, solution = get_transformed_puzzle(selected_template, rotation_k, do_reflect)

    total_cells = size * size
    target_clues = max(int(total_cells * clue_ratio), size * 2)

    # Collect cage data
    cages = defaultdict(list)
    for r in range(size):
        for c in range(size):
            cages[grid_cages[r][c]].append([r, c])

    # Mask cells deterministically
    puzzle = [row[:] for row in solution]
    all_cells = [(r, c) for r in range(size) for c in range(size)]
    rng.shuffle(all_cells)

    cells_to_remove = total_cells - target_clues
    for r, c in all_cells[:cells_to_remove]:
        puzzle[r][c] = 0

    cages_export = {}
    for cid, cells in cages.items():
        cages_export[cid] = {
            "size": len(cells),
            "cells": cells
        }

    return {
        "grid_size": size,
        "difficulty": difficulty,
        "clues_count": target_clues,
        "grid_cages": grid_cages,
        "cages": cages_export,
        "initial_board": puzzle,
        "solution_board": solution
    }

def validate_tectonic_board(user_board, solution_board):
    """
    Validates user board against solution board dynamically for any grid size.
    """
    errors = []
    is_complete = True
    rows = len(solution_board)
    cols = len(solution_board[0])

    for r in range(rows):
        for c in range(cols):
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
