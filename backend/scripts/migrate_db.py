from backend.database import create_db


def main() -> None:
    create_db()
    print("Migracao basica concluida.")


if __name__ == "__main__":
    main()
