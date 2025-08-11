import { createPool } from '../lib/db';
import 'dotenv/config';

async function testTogglePublished() {
  console.log('🧪 Testing toggle published directly in database...');

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
    // 1. Check current status
    console.log('\n📋 Step 1: Check current published status');
    const [currentRows] = await pool.execute(`
      SELECT id, title, published 
      FROM threads 
      WHERE id = ?
    `, [threadId]);

    if ((currentRows as any[]).length === 0) {
      console.log('❌ Thread not found!');
      return;
    }

    const currentThread = (currentRows as any[])[0];
    console.log('Current thread:', {
      id: currentThread.id,
      title: currentThread.title,
      published: currentThread.published,
      publishedType: typeof currentThread.published
    });

    // 2. Update to false
    console.log('\n🔄 Step 2: Update published to false');
    const updateResult = await pool.execute(`
      UPDATE threads 
      SET published = FALSE, updated_at = NOW()
      WHERE id = ?
    `, [threadId]);

    console.log('Update result:', updateResult);

    // 3. Check after update
    console.log('\n📋 Step 3: Check published status after update');
    const [afterRows] = await pool.execute(`
      SELECT id, title, published 
      FROM threads 
      WHERE id = ?
    `, [threadId]);

    const afterThread = (afterRows as any[])[0];
    console.log('After update:', {
      id: afterThread.id,
      title: afterThread.title,
      published: afterThread.published,
      publishedType: typeof afterThread.published
    });

    // 4. Update back to true
    console.log('\n🔄 Step 4: Update published back to true');
    await pool.execute(`
      UPDATE threads 
      SET published = TRUE, updated_at = NOW()
      WHERE id = ?
    `, [threadId]);

    // 5. Final check
    console.log('\n📋 Step 5: Final check');
    const [finalRows] = await pool.execute(`
      SELECT id, title, published 
      FROM threads 
      WHERE id = ?
    `, [threadId]);

    const finalThread = (finalRows as any[])[0];
    console.log('Final status:', {
      id: finalThread.id,
      title: finalThread.title,
      published: finalThread.published,
      publishedType: typeof finalThread.published
    });

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTogglePublished()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
