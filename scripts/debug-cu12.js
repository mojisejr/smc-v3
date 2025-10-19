const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize Sequelize with the database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'resources/db/database.db'),
  logging: console.log
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

async function debugSettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Get all settings
    const allSettings = await Setting.findAll();
    console.log(`\n📊 Found ${allSettings.length} settings record(s):`);

    allSettings.forEach((setting, index) => {
      console.log(`\n--- Setting ${index + 1} ---`);
      console.log(`ID: ${setting.id}`);
      console.log(`Protocol Type: ${setting.protocol_type}`);
      console.log(`CU12 Address: ${setting.cu12_address}`);
      console.log(`CU12 Connection Type: ${setting.cu12_connection_type}`);
      console.log(`CU12 Host: ${setting.cu12_host}`);
      console.log(`CU12 Port: ${setting.cu12_port}`);
      console.log(`KU Port: ${setting.ku_port}`);
      console.log(`KU Baudrate: ${setting.ku_baudrate}`);
      console.log(`Available Slots: ${setting.available_slots}`);
    });

    // Simulate what getSetting() does
    const mainSetting = await Setting.findOne({ where: { id: 1 } });
    if (mainSetting) {
      console.log(`\n🎯 Main Setting (ID=1):`);
      console.log(`Protocol Type: ${mainSetting.protocol_type}`);
      console.log(`Would create ${mainSetting.protocol_type === "CU12" ? "CU12" : "KU16"} controller`);
    } else {
      console.log('\n❌ No setting found with ID=1');
    }

  } catch (error) {
    console.error('❌ Error debugging settings:', error);
  } finally {
    await sequelize.close();
  }
}

debugSettings();