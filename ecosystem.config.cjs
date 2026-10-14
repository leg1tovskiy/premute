module.exports = {
  apps: [
    {
      name: "fearassist",
      script: ".output/server/index.mjs",
      cwd: "/var/www/fearassist",
      env: {
        PORT: 3000,
        HOST: "127.0.0.1",
        NODE_ENV: "production",
        PGLITE_DATA_DIR: "/var/www/fearassist/data",
        BETTER_AUTH_URL: "https://fearassist.online",
      },
    },
  ],
};
