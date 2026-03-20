const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PortAlias = sequelize.define('PortAlias', {
  port: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  alias: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = PortAlias;
