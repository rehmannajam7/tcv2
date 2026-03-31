module.exports = {
  apps: [{
    name: 'thumbcrowd-docs',
    script: 'npm',
    args: 'run start',
    cwd: '/home/chatwoot/docs',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    },
    env_production: {
      NODE_ENV: 'production',
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    }
  }]
};