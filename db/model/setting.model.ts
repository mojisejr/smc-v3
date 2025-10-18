import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Setting extends Model {}

Setting.init(
  {
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
    // CU12 Protocol Configuration
    protocol_type: { type: DataTypes.ENUM("KU16", "CU12"), defaultValue: "KU16" },
    cu12_address: { type: DataTypes.INTEGER, defaultValue: 0 },
    cu12_connection_type: { type: DataTypes.ENUM("tcp", "rs485"), defaultValue: "rs485" },
    cu12_host: { type: DataTypes.STRING, defaultValue: "192.168.1.100" },
    cu12_port: { type: DataTypes.INTEGER, defaultValue: 5000 },
  },
  {
    sequelize,
    modelName: "Setting",
    tableName: "Setting",
    createdAt: false,
    updatedAt: false,
  }
);
