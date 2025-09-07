#!/usr/bin/env node

const { initializeDatabase } = require('./database');
const { seedDatabase } = require('./seeders/seedData');

async function runDatabaseSetup() {
  console.log('🚀 Starting database setup...');
  
  try {
    // Initialize database
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('❌ Database initialization failed');
      process.exit(1);
    }
    
    console.log('✅ Database initialized successfully');
    
    // Ask if user wants to seed data
    const args = process.argv.slice(2);
    const shouldSeed = args.includes('--seed') || args.includes('-s');
    
    if (shouldSeed) {
      console.log('🌱 Seeding database with sample data...');
      await seedDatabase();
      console.log('✅ Database seeded successfully');
    } else {
      console.log('ℹ️  Skipping data seeding. Use --seed flag to seed sample data.');
    }
    
    console.log('🎉 Database setup completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runDatabaseSetup();
}

module.exports = { runDatabaseSetup };
