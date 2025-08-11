import { createPool, getAllChannels, getThreadsByChannelId } from '../lib/db';
import 'dotenv/config';

async function debugThreads() {
  console.log('🔍 Debugging threads and published status...');

  // Initialize database
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    const channels = await getAllChannels();
    console.log('📋 Found channels:', channels.length);

    for (const channel of channels) {
      console.log(`\n📁 Channel: ${channel.name} (${channel.id})`);
      
      // Get all threads (including unpublished)
      const threads = await getThreadsByChannelId(channel.id, true);
      console.log(`   Threads found: ${threads.length}`);
      
      threads.forEach((thread, index) => {
        console.log(`   ${index + 1}. ID: "${thread.id}" (type: ${typeof thread.id})`);
        console.log(`      Title: ${thread.title}`);
        console.log(`      Published: ${thread.published} (type: ${typeof thread.published})`);
        console.log(`      Created: ${thread.created_at}`);
      });
    }

    // Check specific thread
    const specificThreadId = '1401996143923171390';
    console.log(`\n🔍 Looking for specific thread: ${specificThreadId}`);
    
    for (const channel of channels) {
      const threads = await getThreadsByChannelId(channel.id, true);
      const foundThread = threads.find(t => t.id === specificThreadId);
      if (foundThread) {
        console.log(`✅ Found thread in channel ${channel.name}:`);
        console.log(`   ID: "${foundThread.id}"`);
        console.log(`   Title: ${foundThread.title}`);
        console.log(`   Published: ${foundThread.published}`);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugThreads()
  .then(() => {
    console.log('✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
