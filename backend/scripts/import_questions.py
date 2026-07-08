#!/usr/bin/env python3
"""
Import a scored questions CSV (like CS_scored_combined_2023_2025_3_2.csv)
into the `questions` table in Neon.

Usage:
    pip install psycopg2-binary
    export DATABASE_URL="postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
    python3 import_questions.py path/to/questions.csv [path/to/another.csv ...]

Run migrations/0002_questions.sql against the same DATABASE_URL first
(see the header of that file for the psql command).

Safe to re-run: pass --replace-subject "Computer Science" to delete all
existing rows for a subject before re-importing it (handy while you're
still iterating on the question set), otherwise rows are just appended.
"""
import argparse
import csv
import os
import sys

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    sys.exit("Missing dependency. Run: pip install psycopg2-binary")

COLUMNS = [
    "question_number", "subject", "topic", "type", "question_text",
    "option_a", "option_b", "option_c", "option_d",
    "correct_option", "correct_answer", "answer_tolerance",
    "difficulty", "exam_year", "marks", "tags",
    "theory_title", "theory_text", "needs_review", "review_reason",
]


def to_int(v):
    v = (v or "").strip()
    return int(v) if v else None


def to_num(v):
    v = (v or "").strip()
    return float(v) if v else None


def to_bool(v):
    return (v or "").strip().lower() == "yes"


def load_rows(csv_path):
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS if c not in reader.fieldnames]
        if missing:
            sys.exit(f"{csv_path}: CSV is missing expected columns: {missing}")
        for r in reader:
            rows.append((
                to_int(r["question_number"]),
                r["subject"].strip(),
                r["topic"].strip(),
                r["type"].strip().lower(),
                r["question_text"],
                r["option_a"] or None,
                r["option_b"] or None,
                r["option_c"] or None,
                r["option_d"] or None,
                r["correct_option"] or None,
                r["correct_answer"] or None,
                r["answer_tolerance"] or None,
                r["difficulty"] or None,
                to_int(r["exam_year"]),
                to_num(r["marks"]),
                r["tags"] or None,
                r["theory_title"] or None,
                r["theory_text"] or None,
                to_bool(r["needs_review"]),
                r["review_reason"] or None,
            ))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_paths", nargs="+")
    ap.add_argument(
        "--replace-subject",
        action="append",
        default=[],
        help="Delete existing rows for this subject before importing "
             "(repeatable). Omit to just append.",
    )
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Set DATABASE_URL to your Neon connection string first.")

    conn = psycopg2.connect(dsn)
    try:
        with conn:
            with conn.cursor() as cur:
                for subject in args.replace_subject:
                    cur.execute("DELETE FROM questions WHERE subject = %s", (subject,))
                    print(f"Deleted existing rows for subject={subject!r}")

                total = 0
                for path in args.csv_paths:
                    rows = load_rows(path)
                    execute_values(
                        cur,
                        f"INSERT INTO questions ({', '.join(COLUMNS)}) VALUES %s",
                        rows,
                    )
                    print(f"Imported {len(rows)} rows from {path}")
                    total += len(rows)
                print(f"Done. {total} rows imported total.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
