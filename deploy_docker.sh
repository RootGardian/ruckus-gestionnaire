#!/bin/bash
# ===================================================================
# 🚀 Script de Déploiement Docker — BCRG RUCKUS WI-FI MANAGER (Linux)
# ===================================================================

set -e

echo "==================================================================="
echo "  Démarrage du déploiement BCRG RUCKUS WI-FI MANAGER"
echo "==================================================================="

# Vérifier si Docker et Docker Compose sont installés
if ! command -v docker &> /dev/null; then
    echo "❌ Erreur : Docker n'est pas installé sur cette machine."
    exit 1
fi

# Copier .env si non présent
if [ ! -f .env ]; then
    echo "ℹ️ Création du fichier .env à partir du modèle .env.docker.example..."
    cp .env.docker.example .env
fi

echo "📦 1/3 Construction et téléchargement des images Docker..."
docker compose build

echo "🚀 2/3 Démarrage des conteneurs en arrière-plan..."
docker compose up -d

echo "⏳ 3/3 Attente de l'état opérationnel des services..."
sleep 5
docker compose ps

echo ""
echo "==================================================================="
echo "✅ DÉPLOIEMENT RÉUSSI AVEC SUCCÈS !"
echo "👉 Accès au BCRG HUB : http://localhost:${PORT:-3001}"
echo "==================================================================="
