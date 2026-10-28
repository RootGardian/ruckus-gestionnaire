# ===================================================
# 🐳 BCRG WI-FI MANAGER — Backend (Node.js API)
# ===================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Installation de dumb-init pour la gestion robuste des signaux PID 1 (SIGTERM, SIGINT)
RUN apk add --no-cache dumb-init

# Définition de l'environnement de production
ENV NODE_ENV=production
ENV PORT=5001

# Copie des manifestes de dépendances
COPY package*.json ./

# Installation des dépendances de production uniquement
RUN npm ci --omit=dev && npm cache clean --force

# Copie de l'ensemble du code source
COPY . .

# Définition des permissions pour l'utilisateur non-root "node"
RUN chown -R node:node /app

# Bascule sur l'utilisateur non privilégié
USER node

# Exposition du port de l'API
EXPOSE 5001

# Sonde de santé (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5001/api/health || exit 1

# Démarrage du serveur avec dumb-init
CMD ["dumb-init", "node", "server.js"]
