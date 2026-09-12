module.exports = {
  apps: [
    {
      name: 'rayia-contratos-api',
      cwd: '/opt/analisador_contratos_planos/apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
