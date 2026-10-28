# =========================================================
# 🐳 BCRG RUCKUS WI-FI MANAGER — Frontend (React Vite + Nginx)
# Multi-stage build : compilation React optimisée + Nginx
# =========================================================

# --- Étape 1 : Construction de l'application React ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des manifestes de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci

# Copie du code source frontend
COPY . .

# Argument pour l'URL API (par défaut vide pour utiliser le reverse proxy Nginx)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Compilation des assets de production
RUN npm run build

# --- Étape 2 : Serveur Web Nginx Haute Performance ---
FROM nginx:1.25-alpine AS runner

# Suppression des configurations par défaut
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copie des fichiers statiques compilés depuis l'étape de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de la configuration Nginx (reverse proxy API vers backend:5001)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port HTTP 80
EXPOSE 80

# Sonde de santé du serveur Web Nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Démarrage de Nginx
CMD ["nginx", "-g", "daemon off;"]
