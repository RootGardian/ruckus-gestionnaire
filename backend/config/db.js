require('dotenv').config();
const { Sequelize } = require('sequelize');

const useSsl = process.env.DB_SSL === 'true' || (
  process.env.DB_SSL !== 'false' &&
  process.env.DB_HOST &&
  !['localhost', '127.0.0.1', 'db', 'postgres'].includes(process.env.DB_HOST)
);

const dialectOptions = useSsl
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for some remote DBs like Render
      },
      keepAlive: true
    }
  : {
      keepAlive: true
    };

const maxPool = process.env.DB_POOL_MAX
  ? parseInt(process.env.DB_POOL_MAX, 10)
  : (process.env.DB_HOST && process.env.DB_HOST.includes('render.com') ? 15 : 40);

const minPool = process.env.DB_POOL_MIN
  ? parseInt(process.env.DB_POOL_MIN, 10)
  : (process.env.DB_HOST && process.env.DB_HOST.includes('render.com') ? 2 : 5);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bcrg_hub',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions,
    retry: {
      max: 3,
      match: [
        /ECONNRESET/,
        /ETIMEDOUT/,
        /Connection terminated/,
        /timeout/
      ]
    },
    pool: {
      max: maxPool,
      min: minPool,
      acquire: 60000,
      idle: 30000
    },
    define: {
      timestamps: false
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connecté avec succès.');
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
