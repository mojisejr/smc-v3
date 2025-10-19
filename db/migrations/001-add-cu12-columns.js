const { Sequelize, QueryTypes } = require('sequelize');

// Initialize Sequelize connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "resources/db/database.db",
  logging: false,
});

async function addCU12Columns() {
  try {
    console.log('Starting CU12 column migration...');

    // Check if columns already exist
    const tableInfo = await sequelize.query(
      `PRAGMA table_info(Setting)`,
      { type: QueryTypes.SELECT }
    );

    const existingColumns = tableInfo.map(col => col.name);

    // Columns to add for CU12 protocol
    const cu12Columns = [
      {
        name: 'protocol_type',
        sql: "ADD COLUMN protocol_type TEXT DEFAULT 'KU16' CHECK(protocol_type IN ('KU16', 'CU12'))"
      },
      {
        name: 'cu12_address',
        sql: "ADD COLUMN cu12_address INTEGER DEFAULT 0"
      },
      {
        name: 'cu12_connection_type',
        sql: "ADD COLUMN cu12_connection_type TEXT DEFAULT 'rs485' CHECK(cu12_connection_type IN ('tcp', 'rs485'))"
      },
      {
        name: 'cu12_host',
        sql: "ADD COLUMN cu12_host TEXT DEFAULT '192.168.1.100'"
      },
      {
        name: 'cu12_port',
        sql: "ADD COLUMN cu12_port INTEGER DEFAULT 5000"
      }
    ];

    // Add missing columns
    for (const column of cu12Columns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        await sequelize.query(`ALTER TABLE Setting ${column.sql}`);
        console.log(`✓ Added column: ${column.name}`);
      } else {
        console.log(`✓ Column already exists: ${column.name}`);
      }
    }

    console.log('✅ CU12 migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addCU12Columns()
    .then(() => {
      console.log('Migration completed. Closing connection...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addCU12Columns };