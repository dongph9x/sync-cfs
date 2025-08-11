import { createPool } from '../lib/db';
import 'dotenv/config';

async function checkSchema() {
  console.log('🔍 Checking threads table schema...');

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

  try {
    // Check table schema
    const [schemaRows] = await pool.execute(`
      DESCRIBE threads
    `);

    console.log('\n📋 Threads table schema:');
    (schemaRows as any[]).forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
    });

    // Check specific thread
    const threadId = '1401996143923171390';
    console.log(`\n🔍 Checking specific thread: ${threadId}`);
    
    const [threadRows] = await pool.execute(`
      SELECT id, title, published, published + 0 as published_num
      FROM threads 
      WHERE id = ?
    `, [threadId]);

    if ((threadRows as any[]).length > 0) {
      const thread = (threadRows as any[])[0];
      console.log('Thread data:', {
        id: thread.id,
        title: thread.title,
        published: thread.published,
        publishedType: typeof thread.published,
        publishedNum: thread.published_num,
        publishedNumType: typeof thread.published_num
      });
    }

    // Test update with different values
    console.log('\n🧪 Testing different update values...');
    
    // Test with 0
    await pool.execute(`
      UPDATE threads 
      SET published = 0
      WHERE id = ?
    `, [threadId]);
    
    const [after0Rows] = await pool.execute(`
      SELECT published FROM threads WHERE id = ?
    `, [threadId]);
    console.log('After setting to 0:', (after0Rows as any[])[0].published);

    // Test with FALSE
    await pool.execute(`
      UPDATE threads 
      SET published = FALSE
      WHERE id = ?
    `, [threadId]);
    
    const [afterFalseRows] = await pool.execute(`
      SELECT published FROM threads WHERE id = ?
    `, [threadId]);
    console.log('After setting to FALSE:', (afterFalseRows as any[])[0].published);

    // Test with 1
    await pool.execute(`
      UPDATE threads 
      SET published = 1
      WHERE id = ?
    `, [threadId]);
    
    const [after1Rows] = await pool.execute(`
      SELECT published FROM threads WHERE id = ?
    `, [threadId]);
    console.log('After setting to 1:', (after1Rows as any[])[0].published);

    // Test with TRUE
    await pool.execute(`
      UPDATE threads 
      SET published = TRUE
      WHERE id = ?
    `, [threadId]);
    
    const [afterTrueRows] = await pool.execute(`
      SELECT published FROM threads WHERE id = ?
    `, [threadId]);
    console.log('After setting to TRUE:', (afterTrueRows as any[])[0].published);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema()
  .then(() => {
    console.log('✅ Schema check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  });
