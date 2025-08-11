import { createPool, getThreadsByChannelId } from '../lib/db';
import 'dotenv/config';

async function testUpdateAndCheck() {
  console.log('🧪 Testing update and immediate check...');

  // Initialize database
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  const pool = createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  const threadId = '1401996143923171390';

  try {
    // 1. Check current status using our function
    console.log('\n📋 Step 1: Check current status using getThreadsByChannelId');
    const channels = await pool.execute('SELECT id FROM channels LIMIT 1');
    const channelId = (channels[0] as any[])[0].id;
    
    const threads = await getThreadsByChannelId(String(channelId), true);
    const currentThread = threads.find(t => t.id === threadId);
    
    if (currentThread) {
      console.log('Current thread from function:', {
        id: currentThread.id,
        title: currentThread.title,
        published: currentThread.published,
        publishedType: typeof currentThread.published
      });
    }

    // 2. Update to false
    console.log('\n🔄 Step 2: Update to false');
    await pool.execute(`
      UPDATE threads 
      SET published = 0, updated_at = NOW()
      WHERE id = ?
    `, [threadId]);

    // 3. Check immediately after update
    console.log('\n📋 Step 3: Check immediately after update');
    const threadsAfterUpdate = await getThreadsByChannelId(String(channelId), true);
    const updatedThread = threadsAfterUpdate.find(t => t.id === threadId);
    
    if (updatedThread) {
      console.log('Thread after update:', {
        id: updatedThread.id,
        title: updatedThread.title,
        published: updatedThread.published,
        publishedType: typeof updatedThread.published
      });
    }

    // 4. Check raw database value
    console.log('\n📋 Step 4: Check raw database value');
    const [rawRows] = await pool.execute(`
      SELECT published FROM threads WHERE id = ?
    `, [threadId]);
    
    const rawValue = (rawRows as any[])[0];
    console.log('Raw database value:', {
      published: rawValue.published,
      publishedType: typeof rawValue.published
    });

    // 5. Update back to true
    console.log('\n🔄 Step 5: Update back to true');
    await pool.execute(`
      UPDATE threads 
      SET published = 1, updated_at = NOW()
      WHERE id = ?
    `, [threadId]);

    // 6. Final check
    console.log('\n📋 Step 6: Final check');
    const threadsFinal = await getThreadsByChannelId(String(channelId), true);
    const finalThread = threadsFinal.find(t => t.id === threadId);
    
    if (finalThread) {
      console.log('Final thread:', {
        id: finalThread.id,
        title: finalThread.title,
        published: finalThread.published,
        publishedType: typeof finalThread.published
      });
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpdateAndCheck()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
