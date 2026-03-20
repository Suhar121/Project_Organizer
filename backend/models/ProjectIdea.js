const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectIdea = sequelize.define('ProjectIdea', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft',
  }
});

module.exports = ProjectIdea;
