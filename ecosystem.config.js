module.exports = {
  apps: [
    {
      name: 'miniapp-backend',
      script: 'npx',
      args: 'tsx server.ts',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'miniapp-bot',
      script: 'npx',
      args: 'tsx bot/src/bot.ts',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
