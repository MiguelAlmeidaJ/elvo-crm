module.exports = {
  apps: [
    {
      name: 'elvo-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'elvo-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: '3001' },
    },
  ],
};
