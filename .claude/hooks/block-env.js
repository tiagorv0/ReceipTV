const path = require('path');

const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
const filename = path.basename(input.file_path || '');

if (filename.startsWith('.env')) {
  console.error(`Bloqueado: edições em arquivos .env não são permitidas (${filename})`);
  process.exit(1);
}

process.exit(0);
