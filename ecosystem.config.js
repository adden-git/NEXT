module.exports = {
  apps: [
    {
      name: "kimi-dev-5500",
      script: "./run_dev.py",
      args: "--port 5500 --dynamic-auth",
      cwd: "/var/www/kimi-next",
      interpreter: "python3",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      error_file: "/var/www/kimi-next/logs/err.log",
      out_file: "/var/www/kimi-next/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
