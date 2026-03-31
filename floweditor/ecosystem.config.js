module.exports = {
  apps: [
    {
      name: 'floweditor-ui',
      script: 'npm',
      args: 'run start',
      cwd: '/home/chatwoot/floweditor',
      env: {
        NODE_ENV: 'production',
        VITE_PORT: 3001,
        VITE_HMR_PORT: 24678,
        VITE_HOST: '0.0.0.0',
        VITE_CORS_ORIGIN: 'http://localhost:3000,http://10.20.4.131:3000',
        VITE_ASSET_SERVER_URL: 'http://localhost:3001',
      },
      log_file: '/home/chatwoot/floweditor/logs/floweditor-ui.log',
      error_file: '/home/chatwoot/floweditor/logs/floweditor-ui-error.log',
      out_file: '/home/chatwoot/floweditor/logs/floweditor-ui-out.log',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'floweditor-api',
      script: 'server/src/index.js',
      cwd: '/home/chatwoot/floweditor',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        CHATWOOT_JWT_SECRET:
          'nYvGZfQCDBRpEb4EZVNbKCf7Mth2ed0A3AK8bNoqHZHXkls8qaWx8voShhsBCLW',
        CORS_ORIGIN:
          'http://localhost:3000,http://localhost:8000,http://10.20.4.131:3000',
      },
      log_file: '/home/chatwoot/floweditor/logs/floweditor-api.log',
      error_file: '/home/chatwoot/floweditor/logs/floweditor-api-error.log',
      out_file: '/home/chatwoot/floweditor/logs/floweditor-api-out.log',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
