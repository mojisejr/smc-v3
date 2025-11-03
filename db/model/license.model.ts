import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import { ILicense } from "../../main/interfaces/license";

export class License extends Model {}

License.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    activation_key: {
      type: DataTypes.TEXT,
      comment: 'Encrypted PEM license key - never store raw keys'
    },
    expires_at: {
      type: DataTypes.DATE,
      comment: 'License expiration date and time'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'License activation status'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'License creation timestamp'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'License last update timestamp'
    }
  },
  {
    sequelize,
    modelName: "License",
    tableName: "licenses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["is_active"]
      },
      {
        fields: ["expires_at"]
      }
    ]
  }
);