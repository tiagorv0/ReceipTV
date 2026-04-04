const { execSync } = require('child_process');
const path = require('path');

const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
const filePath = (input.file_path || '').replace(/\\/g, '/');

if (!filePath.includes('/server/routes/') || !filePath.endsWith('.js')) {
  process.exit(0);
}

try {
  execSync(`grep -q "@swagger" "${filePath}"`, { stdio: 'pipe' });
} catch (_) {
  console.warn(
    `[swagger-reminder] ${path.basename(filePath)} não contém blocos @swagger.\n` +
    `Lembre de documentar os endpoints modificados antes do commit.`
  );
}

process.exit(0);
