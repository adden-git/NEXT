module.exports = {
  apps: [
    {
      name: 'nexus-station',
      script: './run.py',
      interpreter: 'python3',
      cwd: __dirname,
      env: {
        PYTHONPATH: './src',
        NEXUS_PORT: '5600',
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      log_file: './logs/nexus.log',
      out_file: './logs/nexus-out.log',
      err_file: './logs/nexus-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
