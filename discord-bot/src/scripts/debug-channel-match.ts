import { initializeDatabase, getPool } from '../lib/db';

async function debugChannelMatch() {
  try {
    console.log('🔍 Debugging channel matching...');
    
    await initializeDatabase();
    const pool = getPool();
    
    // Get all channels
    const [channelsResult] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(t.id) as thread_count
      FROM channels c
      LEFT JOIN threads t ON c.id = t.channel_id
      GROUP BY c.id
      ORDER BY c.position ASC, c.name ASC
    `);
    
    const channels = (channelsResult as any[]).map(row => ({
      ...row,
      id: String(row.id),
      thread_count: parseInt(row.thread_count) || 0
    }));
    
    console.log(`Found ${channels.length} channels:`);
    channels.forEach(channel => {
      console.log(`  - ${channel.name} (${channel.slug}): ID=${channel.id}, Threads=${channel.thread_count}`);
    });
    
    // Get all threads with their channel info
    const [threadsResult] = await pool.execute(`
      SELECT id, title, channel_id, rank, created_at
      FROM threads 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    const threads = threadsResult as any[];
    console.log(`\nFound ${threads.length} sample threads:`);
    threads.forEach(thread => {
      console.log(`  - "${thread.title}": ThreadID=${thread.id}, ChannelID=${thread.channel_id}, Rank=${thread.rank}`);
    });
    
    // Test matching for each channel
    for (const channel of channels) {
      console.log(`\n🔍 Testing channel: ${channel.name} (ID: ${channel.id})`);
      
      // Test exact match
      const [exactMatch] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM threads 
        WHERE channel_id = ?
      `, [channel.id]);
      
      console.log(`  Exact match: ${(exactMatch as any[])[0].count} threads`);
      
      // Test string match
      const [stringMatch] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM threads 
        WHERE CAST(channel_id AS CHAR) = ?
      `, [channel.id]);
      
      console.log(`  String match: ${(stringMatch as any[])[0].count} threads`);
      
      // Test bigint match
      const [bigintMatch] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM threads 
        WHERE channel_id = ?
      `, [BigInt(channel.id)]);
      
      console.log(`  BigInt match: ${(bigintMatch as any[])[0].count} threads`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugChannelMatch();
