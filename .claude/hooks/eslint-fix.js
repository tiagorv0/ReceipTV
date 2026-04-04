const path = require('path');
const { execSync } = require('child_process');

const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
const filePath = (input.file_path || '').replace(/\\/g, '/');

const isClientSrc = filePath.includes('/client/src/');
const isJsFile = /\.(js|jsx|ts|tsx)$/.test(filePath);

if (!isClientSrc || !isJsFile) {
  process.exit(0);
}

try {
  const clientDir = path.join(__dirname, '..', '..', 'client');
  execSync(`npx eslint --fix "${filePath}"`, {
    cwd: clientDir,
    stdio: 'pipe',
  });
} catch (_) {
  // Erros de lint não devem bloquear o fluxo
}

process.exit(0);
