const logAuditEvent = async ({ type, action, user, ip, app, status }) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT ${timestamp}] [${type || 'AUTH'}] [${status || 'INFO'}] User: ${user || 'Anonyme'} | IP: ${ip || '127.0.0.1'} | App: ${app || 'BCRG HUB'} | Action: ${action || 'Action système'}`);
};

const getRecentAuditLogs = async (limit = 50) => {
  return [];
};

module.exports = {
  logAuditEvent,
  getRecentAuditLogs
};
