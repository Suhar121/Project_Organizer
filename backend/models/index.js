const sequelize = require('../config/database');
const Project = require('./Project');
const ActivityLog = require('./ActivityLog');
const Label = require('./Label');
const Note = require('./Note');
const Setting = require('./Setting');
const PortAlias = require('./PortAlias');
const KanbanTicket = require('./KanbanTicket');
const ProjectIdea = require('./ProjectIdea');

module.exports = {
  sequelize,
  Project,
  ActivityLog,
  Label,
  Note,
  Setting,
  PortAlias,
  KanbanTicket,
  ProjectIdea
};
