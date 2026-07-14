"""
Imports gatequest_import_ready_clean.csv into the `questions` table on Neon.

Usage (PowerShell):
    $env:DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"
    python import_to_neon.py
"""

import csv
import os
import ssl
import sys
from urllib.parse import urlparse, unquote

import pg8000.native

CSV_PATH = "gatequest_import_ready_clean.csv"

COLUMNS = [
    "question_number", "subject", "topic", "type", "question_text",
    "option_a", "option_b", "option_c", "option_d", "correct_option",
    "correct_answer", "answer_tolerance", "difficulty", "exam_year",
    "marks", "tags", "theory_title", "theory_text", "needs_review",
    "review_reason",
]


def parse_database_url(url: str):
    parsed = urlparse(url)
    return {
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
    }


def to_int(v):
    v = (v or "").strip()
    return int(v) if v else None


def to_float(v):
    v = (v or "").strip()
    return float(v) if v else None


def to_bool(v):
    return (v or "").strip().lower() == "true"


def none_if_blank(v):
    v = v if v is not None else ""
    return v if v.strip() != "" else None


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: could not find {CSV_PATH} in the current directory.")
        print(f"Current directory: {os.getcwd()}")
        sys.exit(1)

    conn_args = parse_database_url(db_url)

    print(f"Connecting to {conn_args['host']} / {conn_args['database']} ...")
    ssl_context = ssl.create_default_context()
    conn = pg8000.native.Connection(
        user=conn_args["user"],
        password=conn_args["password"],
        host=conn_args["host"],
        port=conn_args["port"],
        database=conn_args["database"],
        ssl_context=ssl_context,
    )
    print("Connected.")

    insert_sql = f"""
        INSERT INTO questions ({", ".join(COLUMNS)})
        VALUES ({", ".join(":" + c for c in COLUMNS)})
    """

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Found {len(rows)} rows in {CSV_PATH}. Importing...")

    inserted = 0
    for row in rows:
        params = {
            "question_number": to_int(row["question_number"]),
            "subject": row["subject"],
            "topic": row["topic"],
            "type": row["type"],
            "question_text": row["question_text"],
            "option_a": none_if_blank(row["option_a"]),
            "option_b": none_if_blank(row["option_b"]),
            "option_c": none_if_blank(row["option_c"]),
            "option_d": none_if_blank(row["option_d"]),
            "correct_option": none_if_blank(row["correct_option"]),
            "correct_answer": none_if_blank(row["correct_answer"]),
            "answer_tolerance": none_if_blank(row["answer_tolerance"]),
            "difficulty": none_if_blank(row["difficulty"]),
            "exam_year": to_int(row["exam_year"]),
            "marks": to_float(row["marks"]),
            "tags": none_if_blank(row["tags"]),
            "theory_title": none_if_blank(row["theory_title"]),
            "theory_text": none_if_blank(row["theory_text"]),
            "needs_review": to_bool(row["needs_review"]),
            "review_reason": none_if_blank(row["review_reason"]),
        }
        conn.run(insert_sql, **params)
        inserted += 1
        if inserted % 100 == 0:
            print(f"  {inserted} / {len(rows)} rows inserted...")

    print(f"Done. Inserted {inserted} rows.")

    total = conn.run("SELECT COUNT(*) FROM questions")[0][0]
    print(f"Total rows now in questions table: {total}")

    conn.close()


if __name__ == "__main__":
    main()
