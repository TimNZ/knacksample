module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: "Expotential",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        CM_JP_INSTANCEID: "1"
      }
    }
  ]
};
