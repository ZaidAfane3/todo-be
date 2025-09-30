const MigrationRunner = require('./migrate');

async function setupDatabase() {
  const runner = new MigrationRunner();
  
  try {
    console.log('🔄 Setting up database...');
    await runner.connect();
    await runner.migrate();
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
