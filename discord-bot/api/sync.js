const { smartSync } = require('../dist/lib/smartSync.js');
const { updateRanksAfterSync } = require('../dist/lib/updateRanks.js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { forceFull = false } = req.body;

    console.log('🔄 Starting smart sync...', { forceFull });

    // Import Discord.js dynamically
    const { Client, GatewayIntentBits, Partials } = require('discord.js');
    
    // Create a minimal client for sync
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);

    // Run smart sync
    await smartSync(client, { forceFull });
    
    // Update ranks after sync
    await updateRanksAfterSync();

    // Cleanup
    client.destroy();

    console.log('✅ Smart sync completed successfully');

    res.status(200).json({
      success: true,
      message: 'Smart sync completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Smart sync failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
