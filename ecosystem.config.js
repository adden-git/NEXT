module.exports = {
  apps: [
    {
      name: 'nexus-auth',
      script: 'auth_server/run_auth.py',
      cwd: '/var/www/next',
      interpreter: '/var/www/next/.venv/bin/python',
      watch: false,
      autorestart: true,
      max_memory_restart: '256M',
      restart_delay: 2000,
      env: { PYTHONUNBUFFERED: '1' },
      error_file: '/var/www/next/logs/auth.err.log',
      out_file: '/var/www/next/logs/auth.out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
