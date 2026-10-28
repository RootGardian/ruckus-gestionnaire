const dotenv = require('dotenv');
dotenv.config();

const { sequelize, User, Role } = require('./models');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    
    let role = await Role.findOne({ where: { name: 'Employé' } });
    if (!role) {
      role = await Role.create({ name: 'Employé', description: 'Employé standard' });
    }
    
    let user = await User.findOne({ where: { matricule: '2000' } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('medi1', salt);
      user = await User.create({
        last_name: 'Employé',
        first_name: 'Test',
        email: 'employe@bcrg.gn',
        matricule: '2000',
        password_hash: password_hash,
        is_active: true,
        is_admin: false
      });
      await user.addRole(role);
      console.log('✅ Utilisateur matricule 2000 créé avec succès !');
    } else {
      console.log('ℹ️ L\'utilisateur 2000 existe déjà.');
    }

    let admin = await User.findOne({ where: { matricule: '2001' } });
    if (!admin) {
      let roleAdmin = await Role.findOne({ where: { name: 'Administrateur' } });
      if (!roleAdmin) {
        roleAdmin = await Role.create({ name: 'Administrateur', description: 'Accès complet au système' });
      }
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('medi1', salt);
      admin = await User.create({
        last_name: 'Admin',
        first_name: 'Super',
        email: 'admin@bcrg.gn',
        matricule: '2001',
        password_hash: password_hash,
        is_active: true,
        is_admin: true
      });
      await admin.addRole(roleAdmin);
      console.log('✅ Administrateur matricule 2001 créé avec succès !');
    } else {
      console.log('ℹ️ L\'administrateur 2001 existe déjà.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur de seed:', err);
    process.exit(1);
  }
};
seed();
