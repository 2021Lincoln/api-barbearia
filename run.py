# import subprocess
# import sys

# def start_backend():
#     print("🚀 Iniciando o Backend (API FastAPI)...")
#     # Agora exibindo o IP correto para o seu celular
#     print("📖 Documentação disponível em: http://192.168.1.167:8000/docs")
    
#     backend = subprocess.Popen(
#         [
#             sys.executable, "-m", "uvicorn", "backend.main:app", 
#             "--reload", 
#             "--port", "8000",
#             "--host", "0.0.0.0"  # <--- ISSO PERMITE A CONEXÃO EXTERNA
#         ],
#         cwd=".",
#     )
#     return backend

# if __name__ == "__main__":
#     backend = start_backend()
#     try:
#         backend.wait()
#     except KeyboardInterrupt:
#         print("\n🛑 Encerrando o servidor...")
#         backend.terminate()


import uvicorn
import os

if __name__ == "__main__":
    # O Render fornece a porta na variável de ambiente PORT, se não existir, usa 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Importante: se o Root Directory for 'backend', o nome aqui é 'main:app'
    # Se o Root Directory for a raiz, o nome é 'backend.main:app'
    uvicorn.run("main:app", host="0.0.0.0", port=port)