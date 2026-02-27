import subprocess
import sys

def start_backend():
    print("🚀 Iniciando o Backend (API FastAPI)...")
    # Agora exibindo o IP correto para o seu celular
    print("📖 Documentação disponível em: http://192.168.1.167:8000/docs")
    
    backend = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "backend.main:app", 
            "--reload", 
            "--port", "8000",
            "--host", "0.0.0.0"  # <--- ISSO PERMITE A CONEXÃO EXTERNA
        ],
        cwd=".",
    )
    return backend

if __name__ == "__main__":
    backend = start_backend()
    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n🛑 Encerrando o servidor...")
        backend.terminate()