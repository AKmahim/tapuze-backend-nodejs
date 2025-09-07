const { sequelize } = require('./models');

async function initializeDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with the database
    // Use { force: true } only in development to recreate tables
    // Use { alter: true } to modify existing tables to match models
    await sequelize.sync({ 
      force: process.env.NODE_ENV === 'development' && process.env.RESET_DB === 'true',
      alter: process.env.NODE_ENV === 'development'
    });
    
    console.log('All models were synchronized successfully.');
    
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = { initializeDatabase };
