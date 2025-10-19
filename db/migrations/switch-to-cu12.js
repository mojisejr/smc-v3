const { Sequelize, QueryTypes } = require('sequelize');

// Initialize Sequelize connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "resources/db/database.db",
  logging: false,
});

async function switchToCU12() {
  try {
    console.log('Current Settings:');
    const currentSettings = await sequelize.query(
      `SELECT protocol_type, ku_port, ku_baudrate, cu12_address, cu12_connection_type, cu12_host, cu12_port FROM Setting LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (currentSettings.length > 0) {
      const settings = currentSettings[0];
      console.log(`  - Protocol Type: ${settings.protocol_type}`);
      console.log(`  - KU Port: ${settings.ku_port}`);
      console.log(`  - KU Baudrate: ${settings.ku_baudrate}`);
      console.log(`  - CU12 Address: ${settings.cu12_address}`);
      console.log(`  - CU12 Connection: ${settings.cu12_connection_type}`);
      console.log(`  - CU12 Host: ${settings.cu12_host}`);
      console.log(`  - CU12 Port: ${settings.cu12_port}`);
    }

    console.log('\n=== CU12 Configuration Options ===');
    console.log('\n1. RS485 Connection (Default)');
    console.log('   - Address: 0-255');
    console.log('   - Uses serial port communication');
    console.log('\n2. TCP Connection');
    console.log('   - Host: IP address (e.g., 192.168.1.100)');
    console.log('   - Port: TCP port number (e.g., 5000)');
    console.log('   - Uses network communication');

    // Update to CU12 with RS485 (most common setup)
    await sequelize.query(`
      UPDATE Setting SET
        protocol_type = 'CU12',
        cu12_address = 1,
        cu12_connection_type = 'rs485',
        cu12_host = '192.168.1.100',
        cu12_port = 5000
    `);

    console.log('\n✅ Updated to CU12 protocol with RS485 connection');
    console.log('   - Protocol Type: CU12');
    console.log('   - CU12 Address: 1');
    console.log('   - Connection Type: rs485');
    console.log('   - Host: 192.168.1.100');
    console.log('   - Port: 5000');

    console.log('\n=== TCP Alternative ===');
    console.log('To use TCP instead, run this SQL:');
    console.log(`UPDATE Setting SET
      protocol_type = 'CU12',
      cu12_connection_type = 'tcp',
      cu12_host = 'YOUR_CU12_IP_ADDRESS',
      cu12_port = 5000
    WHERE id = 1;`);

  } catch (error) {
    console.error('❌ Configuration failed:', error);
    throw error;
  }
}

// Run configuration if this file is executed directly
if (require.main === module) {
  switchToCU12()
    .then(() => {
      console.log('\n✅ CU12 configuration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Configuration failed:', error);
      process.exit(1);
    });
}

module.exports = { switchToCU12 };