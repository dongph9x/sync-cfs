import { createPool, getAllChannels, initializeThreadRanks } from '../lib/db';

async function initializeAllThreadRanks() {
  // Initialize database connection
  const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DATABASE || "forum",
  };

  createPool(dbConfig);

  try {
    console.log('Starting rank initialization for all channels...');
    
    const channels = await getAllChannels();
    console.log(`Found ${channels.length} channels`);

    for (const channel of channels) {
      console.log(`Initializing ranks for channel: ${channel.name} (${channel.slug})`);
      await initializeThreadRanks(channel.id);
      console.log(`✅ Completed: ${channel.name}`);
    }

    console.log('🎉 All thread ranks have been initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing thread ranks:', error);
    process.exit(1);
  }
}

// Run the script
initializeAllThreadRanks();
