module.exports = {
  apps: [
    {
      name: 'isa-api',
      script: './apps/api-server/dist/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
    },
  ],
};
