const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  commands: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rootFolder: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'stopped',
  },
  labelIds: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  timestamps: false,
});

module.exports = Project;
