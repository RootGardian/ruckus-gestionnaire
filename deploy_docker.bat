@echo off
chcp 65001 > nul
echo ===================================================================
echo   Démarrage du déploiement BCRG RUCKUS WI-FI MANAGER (Windows)
echo ===================================================================

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Docker Desktop n'est pas installé ou n'est pas dans le PATH !
    pause
    exit /b 1
)

if not exist .env (
    echo [INFO] Création du fichier .env depuis le modèle...
    copy .env.docker.example .env >nul
)

echo.
echo [1/3] Construction des images Docker...
docker compose build

echo.
echo [2/3] Démarrage des conteneurs (PostgreSQL, Backend API, Frontend Nginx)...
docker compose up -d

echo.
echo [3/3] État des services :
docker compose ps

echo.
echo ===================================================================
echo [SUCCÈS] Déploiement terminé avec succès !
echo 👉 Ouvrez votre navigateur sur : http://localhost:3001
echo ===================================================================
echo.
pause
