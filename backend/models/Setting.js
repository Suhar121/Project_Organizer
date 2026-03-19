const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  value: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: false,
});

module.exports = Setting;
