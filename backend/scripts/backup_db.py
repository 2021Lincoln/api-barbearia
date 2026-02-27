import os
import shutil
from datetime import datetime
from pathlib import Path


def sqlite_path_from_url(database_url: str) -> Path:
    if database_url.startswith("sqlite:///"):
        return Path(database_url.replace("sqlite:///", "", 1)).resolve()
    raise ValueError("Este script suporta apenas DATABASE_URL sqlite.")


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./backend/barber.db")
    db_path = sqlite_path_from_url(database_url)

    if not db_path.exists():
        raise FileNotFoundError(f"Banco nao encontrado: {db_path}")

    backup_dir = Path("./backend/backups").resolve()
    backup_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"barber-{stamp}.db"
    shutil.copy2(db_path, backup_path)
    print(f"Backup criado: {backup_path}")


if __name__ == "__main__":
    main()
