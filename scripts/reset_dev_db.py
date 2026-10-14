"""
DEV ONLY: delete and recreate the AI service's SQLite database.

The AI service creates its tables with SQLAlchemy's create_all, which never alters an existing
table. After a schema change (a new or renamed column) the old database file must go.
This wipes every stored analysis. It refuses to touch anything that is not a local SQLite file.

Usage (from the repo root, with the FastAPI service stopped):
    music-mash-ai\\.venv\\Scripts\\python scripts\\reset_dev_db.py
"""
import os
import sys
from pathlib import Path

AI_DIR = Path(__file__).resolve().parents[1] / "music-mash-ai"


def main() -> int:
    os.chdir(AI_DIR)  # DATABASE_URL is relative to the service folder, as when it runs
    os.environ["DEBUG"] = "false"  # no SQL echo
    sys.path.insert(0, str(AI_DIR))

    from app.core.config import settings
    from app.database.database import Base, engine
    import app.models  # noqa: F401  (registers every table on Base)

    if not settings.DATABASE_URL.startswith("sqlite:///"):
        print(f"Refusing to reset a non-SQLite database: {engine.url.render_as_string(hide_password=True)}")
        return 1

    db_file = Path(settings.DATABASE_URL.removeprefix("sqlite:///")).resolve()
    engine.dispose()
    if db_file.exists():
        try:
            db_file.unlink()
        except PermissionError:
            print(f"{db_file} is in use. Stop the FastAPI service first (scripts\\dev_stop.ps1).")
            return 1
        print(f"Deleted {db_file}")

    Base.metadata.create_all(bind=engine)
    print(f"Created fresh tables: {', '.join(sorted(Base.metadata.tables))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
