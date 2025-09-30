const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'todo_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });
    
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  async connect() {
    try {
      await this.pool.query('SELECT 1');
      console.log('📊 Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async ensureMigrationsTable() {
    const migrationTableSQL = fs.readFileSync(
      path.join(this.migrationsPath, '000_create_migrations_table.sql'), 
      'utf8'
    );
    
    await this.pool.query(migrationTableSQL);
    console.log('✅ Migrations table ensured');
  }

  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.match(/^\d{3}_.*\.sql$/) && !file.includes('rollback'))
      .sort();
    
    return files.map(file => {
      const version = file.split('_')[0];
      const name = file.replace(/^\d{3}_/, '').replace('.sql', '');
      const filePath = path.join(this.migrationsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');
      
      return { version, name, file, filePath, content, checksum };
    });
  }

  async getExecutedMigrations() {
    const result = await this.pool.query(
      'SELECT version, name, executed_at, checksum FROM migrations ORDER BY version'
    );
    return result.rows;
  }

  async executeMigration(migration) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration
      await client.query(migration.content);
      
      // Record migration
      await client.query(
        'INSERT INTO migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, migration.checksum]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${migration.version}_${migration.name} executed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(version) {
    const rollbackFile = path.join(this.migrationsPath, `${version}_*_rollback.sql`);
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.startsWith(`${version}_`) && file.includes('rollback'));
    
    if (files.length === 0) {
      throw new Error(`No rollback file found for migration ${version}`);
    }
    
    const rollbackPath = path.join(this.migrationsPath, files[0]);
    const rollbackContent = fs.readFileSync(rollbackPath, 'utf8');
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute rollback
      await client.query(rollbackContent);
      
      // Remove migration record
      await client.query('DELETE FROM migrations WHERE version = $1', [version]);
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${version} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    console.log('🔄 Running migrations...');
    
    await this.ensureMigrationsTable();
    
    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    
    const pendingMigrations = migrationFiles.filter(m => !executedVersions.has(m.version));
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      try {
        await this.executeMigration(migration);
      } catch (error) {
        console.error(`❌ Migration ${migration.version}_${migration.name} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
  }

  async rollback(version = null) {
    console.log('🔄 Rolling back migrations...');
    
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }
    
    if (version) {
      const migration = executedMigrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration ${version} not found`);
      }
      await this.rollbackMigration(version);
    } else {
      // Rollback last migration
      const lastMigration = executedMigrations[executedMigrations.length - 1];
      await this.rollbackMigration(lastMigration.version);
    }
  }

  async status() {
    console.log('📊 Migration Status:');
    console.log('==================');
    
    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    
    for (const migration of migrationFiles) {
      const isExecuted = executedVersions.has(migration.version);
      const status = isExecuted ? '✅ EXECUTED' : '⏳ PENDING';
      const executedAt = isExecuted 
        ? executedMigrations.find(m => m.version === migration.version)?.executed_at
        : null;
      
      console.log(`${migration.version}_${migration.name}: ${status}`);
      if (executedAt) {
        console.log(`  Executed: ${executedAt}`);
      }
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  const runner = new MigrationRunner();
  
  try {
    await runner.connect();
    
    switch (command) {
      case 'migrate':
        await runner.migrate();
        break;
      case 'rollback':
        await runner.rollback(arg);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log('Usage: node migrate.js [migrate|rollback|status] [version]');
        console.log('  migrate  - Run pending migrations');
        console.log('  rollback - Rollback last migration or specific version');
        console.log('  status   - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
