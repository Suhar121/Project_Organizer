const sequelize = require('../config/database');
const Project = require('./Project');
const ActivityLog = require('./ActivityLog');
const Label = require('./Label');
const Note = require('./Note');
const Setting = require('./Setting');

module.exports = { sequelize, Project, ActivityLog, Label, Note, Setting };
