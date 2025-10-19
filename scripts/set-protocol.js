const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize Sequelize with the database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../resources/db/database.db'),
  logging: false
});

// Define Setting model
const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ku_port: { type: DataTypes.STRING },
  ku_baudrate: { type: DataTypes.INTEGER },
  available_slots: { type: DataTypes.INTEGER },
  max_user: { type: DataTypes.INTEGER },
  service_code: { type: DataTypes.STRING },
  max_log_counts: { type: DataTypes.INTEGER },
  organization: { type: DataTypes.STRING },
  customer_name: { type: DataTypes.STRING },
  activated_key: { type: DataTypes.STRING },
  indi_port: { type: DataTypes.STRING },
  indi_baudrate: { type: DataTypes.INTEGER },
  protocol_type: { type: DataTypes.ENUM("KU16", "CU12"), defaultValue: "KU16" },
  cu12_address: { type: DataTypes.INTEGER, defaultValue: 0 },
  cu12_connection_type: { type: DataTypes.ENUM("tcp", "rs485"), defaultValue: "rs485" },
  cu12_host: { type: DataTypes.STRING, defaultValue: "192.168.1.100" },
  cu12_port: { type: DataTypes.INTEGER, defaultValue: 5000 },
}, {
  tableName: "Setting",
  createdAt: false,
  updatedAt: false,
});

async function setProtocolToCU12() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Check if settings exist
    const settings = await Setting.findAll();
    if (settings.length === 0) {
      console.log('No settings found, creating default CU12 settings...');
      await Setting.create({
        protocol_type: "CU12",
        cu12_address: 1,
        cu12_connection_type: "rs485",
        cu12_host: "192.168.1.100",
        cu12_port: 5000,
        ku_port: "/dev/ttyUSB0",
        ku_baudrate: 9600,
        available_slots: 12,
        max_user: 100,
        service_code: "SMC-001",
        max_log_counts: 10000,
        organization: "Test Hospital",
        customer_name: "Test Department",
        activated_key: "TEST-KEY-123"
      });
      console.log('✅ CU12 protocol settings created successfully!');
    } else {
      // Update existing settings to use CU12
      await Setting.update(
        {
          protocol_type: "CU12",
          cu12_address: 1,
          cu12_connection_type: "rs485"
        },
        { where: {} }
      );
      console.log('✅ Protocol updated to CU12 successfully!');
    }

    // Verify the update
    const updatedSettings = await Setting.findAll();
    updatedSettings.forEach(setting => {
      console.log(`Protocol: ${setting.protocol_type}, CU12 Address: ${setting.cu12_address}, Connection: ${setting.cu12_connection_type}`);
    });

  } catch (error) {
    console.error('Error setting protocol to CU12:', error);
  } finally {
    await sequelize.close();
  }
}

setProtocolToCU12();