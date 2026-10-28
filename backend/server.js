// ===================================================================
// 🏛️ BCRG HUB — Backend Server (Node.js / Express / Cluster)
// ===================================================================

// 1. Définir la taille du pool de threads libuv pour absorber les calculs cryptographiques concurrents (Bcrypt + RS256)
// Indispensable pour absorber 800+ connexions simultanées sans latence CPU
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cluster = require('cluster');
const os = require('os');

// Chargement des variables d'environnement
dotenv.config();

const { sequelize, connectDB } = require('./config/db');
require('./models'); // Charger les modèles et associations

const PORT = process.env.PORT || 5001;
const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
const isClusterMode = process.env.ENABLE_CLUSTER === 'true';

// Helper : Création ou vérification de l'administrateur par défaut
const initDefaultAdmin = async () => {
  const bcrypt = require('bcryptjs');
  const { User } = require('./models');

  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const adminMatricule = process.env.DEFAULT_ADMIN_MATRICULE || 'ADMIN001';

    if (adminEmail && adminPassword) {
      const existingAdmin = await User.findOne({ where: { email: adminEmail } });
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        await User.create({
          matricule: adminMatricule,
          email: adminEmail,
          password_hash: hashedPassword,
          first_name: 'Super',
          last_name: 'Admin',
          department: 'IT',
          is_active: true,
          is_admin: true
        });
        console.log('✅ Default Admin created successfully.');
      } else {
        console.log('ℹ️ Default Admin already exists.');
      }
    }
  } catch (err) {
    console.error('❌ Error creating default admin:', err);
  }
};

// Helper : Vérification et migration transparente des colonnes requises
const ensureSchemaUpdates = async () => {
  try {
    await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ldap_groups" JSON DEFAULT \'[]\';');
    console.log('✅ Column ldap_groups verified on users table.');
  } catch (err) {
    console.log('ℹ️ Schema update check:', err.message);
  }
};

// Fonction de configuration et démarrage d'une instance de serveur Express (Worker)
const startServer = () => {
  const app = express();

  // Faire confiance au reverse proxy (Nginx) pour résoudre correctement le protocole (https) et l'hôte (DNS)
  app.set('trust proxy', 1);

  // En-têtes de sécurité HTTP (Helmet - Compatible HTTP & HTTPS)
  app.use(helmet({
    hsts: isHttps ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "http:", "https:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null
      }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // Origines autorisées pour CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  }));

  app.use(cookieParser());
  app.use(express.json());

  // Déclaration des routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/wifi', require('./routes/wifiRoutes'));
  app.use('/api/ldap-config', require('./routes/ldapRoutes'));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'BCRG Wi-Fi Manager API',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/', (req, res) => {
    res.send('BCRG Wi-Fi Manager API is running...');
  });

  // Démarrage de l'écoute HTTP
  app.listen(PORT, '0.0.0.0', () => {
    const workerInfo = cluster.isWorker ? ` (Worker PID: ${process.pid})` : '';
    console.log(`Server running on port ${PORT} (0.0.0.0)${workerInfo}`);
  });
};

// ===================================================================
// GESTION DU CYCLE DE VIE : STANDALONE VS MODE CLUSTER
// ===================================================================

if (isClusterMode && cluster.isPrimary) {
  // Mode Multi-Cœurs en Production : Le processus maître orchestre les cœurs CPU
  const numCPUs = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS, 10) : os.cpus().length;
  console.log(`🚀 Mode Cluster activé : Lancement de ${numCPUs} processus de travail (workers)...`);

  connectDB().then(() => {
    sequelize.sync().then(async () => {
      console.log('Database synced');
      await ensureSchemaUpdates();
      await initDefaultAdmin();

      // Démarrage des instances workers sur tous les cœurs CPU
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      // Redémarrage automatique d'un worker s'il s'arrête de manière inattendue
      cluster.on('exit', (worker, code, signal) => {
        console.warn(`⚠️ Worker ${worker.process.pid} arrêté. Redémarrage d'un nouveau worker...`);
        cluster.fork();
      });
    });
  });
} else {
  // Mode Développeur ou Worker individuel
  connectDB().then(() => {
    sequelize.sync().then(async () => {
      console.log('Database synced');
      await ensureSchemaUpdates();
      await initDefaultAdmin();
      startServer();
    }).catch(err => {
      console.error('⚠️ Avertissement synchronisation Sequelize:', err.message);
      startServer();
    });
  }).catch(err => {
    console.error('❌ Échec initialisation connectDB:', err.message);
  });
}
