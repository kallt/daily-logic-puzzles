"""
Deterministic Daily Seed Generator
Generates reproducible integer seeds based on UTC calendar date and puzzle type.
"""

import hashlib
from datetime import datetime

def get_current_date_string():
    return datetime.utcnow().strftime("%Y-%m-%d")

def generate_daily_seed(date_str, puzzle_type):
    # Combines date and type into deterministic 32-bit integer seed
    token = f"{date_str}:{puzzle_type.lower()}:v1"
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    seed_int = int(digest[:8], 16)
    return seed_int
