module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Discord Bot API is working!',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      has_mysql_host: !!process.env.MYSQL_HOST,
      has_discord_token: !!process.env.DISCORD_TOKEN
    }
  });
};
