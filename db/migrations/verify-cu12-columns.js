const { Sequelize, QueryTypes } = require('sequelize');

// Initialize Sequelize connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "resources/db/database.db",
  logging: false,
});

async function verifyCU12Columns() {
  try {
    console.log('Verifying CU12 columns...');

    // Check table structure
    const tableInfo = await sequelize.query(
      `PRAGMA table_info(Setting)`,
      { type: QueryTypes.SELECT }
    );

    const cu12Columns = ['protocol_type', 'cu12_address', 'cu12_connection_type', 'cu12_host', 'cu12_port'];

    console.log('\nCurrent Setting table columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})${col.dflt_value ? ` default: ${col.dflt_value}` : ''}`);
    });

    console.log('\nCU12 Columns Status:');
    cu12Columns.forEach(colName => {
      const exists = tableInfo.some(col => col.name === colName);
      console.log(`  - ${colName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

    // Check if there's at least one setting row
    const settingsCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM Setting`,
      { type: QueryTypes.SELECT }
    );

    console.log(`\nSettings table has ${settingsCount[0].count} row(s)`);

    if (settingsCount[0].count > 0) {
      const sampleRow = await sequelize.query(
        `SELECT protocol_type, cu12_address, cu12_connection_type, cu12_host, cu12_port FROM Setting LIMIT 1`,
        { type: QueryTypes.SELECT }
      );

      console.log('\nSample CU12 configuration:');
      console.log(`  - protocol_type: ${sampleRow[0].protocol_type}`);
      console.log(`  - cu12_address: ${sampleRow[0].cu12_address}`);
      console.log(`  - cu12_connection_type: ${sampleRow[0].cu12_connection_type}`);
      console.log(`  - cu12_host: ${sampleRow[0].cu12_host}`);
      console.log(`  - cu12_port: ${sampleRow[0].cu12_port}`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyCU12Columns()
    .then(() => {
      console.log('\n✅ Verification completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyCU12Columns };