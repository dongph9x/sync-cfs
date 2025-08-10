import mysql from 'mysql2/promise';

interface DatabaseConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

let pool: mysql.Pool | null = null;

export function createPool(config: DatabaseConfig): mysql.Pool {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: config.host,
    port: config.port || 3306,
    user: config.user,
    password: config.password || "",
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    bigNumberStrings: true
  } as mysql.PoolOptions);
  return pool;
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createPool first.');
  }
  return pool;
}

// Types for database records
export interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  created_at: Date;
  thread_count?: number;
}

export interface Thread {
  id: string;
  channel_id: string;
  slug: string;
  title: string;
  author_alias: string;
  body_html: string | null;
  tags: string[] | null;
  reply_count: number;
  rank: number;
  created_at: Date;
  updated_at: Date;
  channel_name?: string;
  channel_slug?: string;
}

export interface Post {
  id: string;
  thread_id: string;
  author_alias: string;
  body_html: string | null;
  reply_to_id: string | null;
  reply_to_author_alias: string | null;
  created_at: Date;
  updated_at: Date;
}

// Database query functions
export async function getAllChannels(): Promise<Channel[]> {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT 
      c.*,
      COUNT(t.id) as thread_count
    FROM channels c
    LEFT JOIN threads t ON c.id = t.channel_id
    GROUP BY c.id
    ORDER BY c.position ASC, c.name ASC
  `);

  return (rows as any[]).map(row => ({
    ...row,
    id: String(row.id),
    thread_count: parseInt(row.thread_count) || 0
  }));
}

export async function getChannelById(id: string): Promise<Channel | null> {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT 
      c.*,
      COUNT(t.id) as thread_count
    FROM channels c
    LEFT JOIN threads t ON c.id = t.channel_id
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);

  const result = rows as any[];
  if (result.length === 0) return null;

  const row = result[0];
  return {
    ...row,
    id: String(row.id),
    thread_count: parseInt(row.thread_count) || 0
  };
}

export async function getThreadsByChannelId(channelId: string): Promise<Thread[]> {
  const pool = getPool();

  const [rows] = await pool.execute(`
    SELECT 
      t.*,
      c.name as channel_name,
      c.slug as channel_slug
    FROM threads t
    JOIN channels c ON t.channel_id = c.id
    WHERE t.channel_id = ?
    ORDER BY t.rank ASC, t.created_at ASC
  `, [channelId]);

  return (rows as any[]).map(row => ({
    ...row,
    id: String(row.id),
    channel_id: String(row.channel_id),
    rank: parseInt(row.rank) || 0,
    tags: row.tags ? (() => {
      try {
        return JSON.parse(row.tags);
      } catch (e) {
        console.warn('Failed to parse tags JSON:', row.tags);
        return null;
      }
    })() : null
  }));
}

export async function getThreadById(threadId: string, channelId: string): Promise<Thread | null> {
  const pool = getPool();

  const [rows] = await pool.execute(`
    SELECT 
      t.*,
      c.name as channel_name,
      c.slug as channel_slug
    FROM threads t
    JOIN channels c ON t.channel_id = c.id
    WHERE t.id = ? AND t.channel_id = ?
  `, [threadId, channelId]);

  const result = rows as any[];
  if (result.length === 0) return null;

  const row = result[0];
  return {
    ...row,
    id: String(row.id),
    channel_id: String(row.channel_id),
    rank: parseInt(row.rank) || 0,
    tags: row.tags ? (() => {
      try {
        return JSON.parse(row.tags);
      } catch (e) {
        console.warn('Failed to parse tags JSON:', row.tags);
        return null;
      }
    })() : null
  };
}

export async function getPostsByThreadId(threadId: string): Promise<Post[]> {
  const pool = getPool();

  const [rows] = await pool.execute(`
        SELECT *
        FROM posts
        WHERE thread_id = ?
        ORDER BY created_at ASC
    `, [threadId]);

  return (rows as any[]).map(row => ({
    ...row,
    id: String(row.id),
    thread_id: String(row.thread_id),
    reply_to_id: row.reply_to_id ? String(row.reply_to_id) : null
  }));
}

export async function getChannelBySlug(slug: string): Promise<Channel | null> {
  const pool = getPool();
  const [rows] = await pool.execute(`
        SELECT id FROM channels WHERE slug = ?
    `, [slug]);

  if ((rows as any[]).length === 0) return null;

  const channelId = (rows as any[])[0].id;
  return getChannelById(String(channelId));
}

export async function getThreadsByChannelSlug(channelSlug: string): Promise<Thread[]> {
  const pool = getPool();

  // First get channel ID by slug
  const [channelRows] = await pool.execute(`
        SELECT id FROM channels WHERE slug = ?
    `, [channelSlug]);

  if ((channelRows as any[]).length === 0) return [];

  const channelId = (channelRows as any[])[0].id;
  return getThreadsByChannelId(String(channelId));
}

export async function getThreadBySlug(channelSlug: string, threadSlug: string): Promise<Thread | null> {
  const pool = getPool();

  // First get channel ID by slug
  const [channelRows] = await pool.execute(`
        SELECT id FROM channels WHERE slug = ?
    `, [channelSlug]);

  if ((channelRows as any[]).length === 0) return null;

  const channelId = (channelRows as any[])[0].id;

  // Then get thread ID by slug within that channel
  const [threadRows] = await pool.execute(`
        SELECT id FROM threads WHERE slug = ? AND channel_id = ?
    `, [threadSlug, channelId]);

  if ((threadRows as any[]).length === 0) return null;

  const threadId = (threadRows as any[])[0].id;
  return getThreadById(String(threadId), String(channelId));
}

// Functions for managing thread ranks
export async function updateThreadRank(threadId: string, newRank: number): Promise<void> {
  const pool = getPool();
  await pool.execute(`
    UPDATE threads 
    SET rank = ?, updated_at = NOW()
    WHERE id = ?
  `, [newRank, threadId]);
}

export async function updateThreadRanks(rankUpdates: { threadId: string; rank: number }[]): Promise<void> {
  const pool = getPool();
  
  // Use a transaction to ensure all updates are atomic
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const update of rankUpdates) {
      await connection.execute(`
        UPDATE threads 
        SET rank = ?, updated_at = NOW()
        WHERE id = ?
      `, [update.rank, update.threadId]);
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function initializeThreadRanks(channelId: string): Promise<void> {
  const pool = getPool();
  
  // Get all threads in the channel ordered by created_at
  const [rows] = await pool.execute(`
    SELECT id FROM threads 
    WHERE channel_id = ? 
    ORDER BY created_at ASC
  `, [channelId]);
  
  const threads = rows as any[];
  
  // Update ranks sequentially
  for (let i = 0; i < threads.length; i++) {
    await pool.execute(`
      UPDATE threads 
      SET rank = ?, updated_at = NOW()
      WHERE id = ?
    `, [i + 1, threads[i].id]); // Use increment of 1
  }
}

export async function syncThreadFromDiscord(threadData: {
  id: string;
  channel_id: string;
  slug: string;
  title: string;
  author_alias: string;
  body_html: string | null;
  tags: string[] | null;
  reply_count: number;
}): Promise<void> {
  const pool = getPool();
  
  try {
    // Check if thread exists
    const [existingRows] = await pool.execute(`
      SELECT id, rank FROM threads WHERE id = ?
    `, [threadData.id]);
    
    if ((existingRows as any[]).length > 0) {
      // Update existing thread - preserve existing rank
      await pool.execute(`
        UPDATE threads 
        SET 
          channel_id = ?,
          slug = ?,
          title = ?,
          author_alias = ?,
          body_html = ?,
          tags = ?,
          reply_count = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        threadData.channel_id,
        threadData.slug,
        threadData.title,
        threadData.author_alias,
        threadData.body_html,
        threadData.tags ? JSON.stringify(threadData.tags) : null,
        threadData.reply_count,
        threadData.id
      ]);
    } else {
      // Insert new thread with rank
      // Get the maximum rank in the channel, handle NULL values
      const [channelThreads] = await pool.execute(`
        SELECT COALESCE(MAX(rank), 0) as max_rank 
        FROM threads 
        WHERE channel_id = ? AND rank IS NOT NULL
      `, [threadData.channel_id]);
      
      const maxRank = (channelThreads as any[])[0]?.max_rank || 0;
      const newRank = maxRank + 1; // Simple increment by 1
      
      console.log(`Inserting new thread ${threadData.id} with rank ${newRank} in channel ${threadData.channel_id}`);
      
      await pool.execute(`
        INSERT INTO threads (
          id, channel_id, slug, title, author_alias, 
          body_html, tags, reply_count, rank, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        threadData.id,
        threadData.channel_id,
        threadData.slug,
        threadData.title,
        threadData.author_alias,
        threadData.body_html,
        threadData.tags ? JSON.stringify(threadData.tags) : null,
        threadData.reply_count,
        newRank
      ]);
    }
  } catch (error) {
    console.error('Error syncing thread from Discord:', error);
    console.error('Thread data:', threadData);
    throw error;
  }
}

export async function fixMissingRanks(): Promise<void> {
  const pool = getPool();
  
  try {
    console.log('🔧 Fixing missing rank values...');
    
    // Get all channels
    const [channels] = await pool.execute(`
      SELECT DISTINCT channel_id FROM threads WHERE rank IS NULL
    `);
    
    for (const channel of channels as any[]) {
      const channelId = channel.channel_id;
      console.log(`Processing channel ${channelId}...`);
      
      // Get threads without rank in this channel, ordered by created_at
      const [threads] = await pool.execute(`
        SELECT id FROM threads 
        WHERE channel_id = ? AND rank IS NULL 
        ORDER BY created_at ASC
      `, [channelId]);
      
      // Get current max rank in this channel
      const [maxRankResult] = await pool.execute(`
        SELECT COALESCE(MAX(rank), 0) as max_rank 
        FROM threads 
        WHERE channel_id = ? AND rank IS NOT NULL
      `, [channelId]);
      
      let currentRank = (maxRankResult as any[])[0]?.max_rank || 0;
      
      // Assign ranks to threads without rank
      for (const thread of threads as any[]) {
        currentRank += 1; // Simple increment by 1
        await pool.execute(`
          UPDATE threads 
          SET rank = ?, updated_at = NOW()
          WHERE id = ?
        `, [currentRank, thread.id]);
        
        console.log(`  - Thread ${thread.id}: rank ${currentRank}`);
      }
    }
    
    console.log('✅ Fixed missing rank values successfully!');
  } catch (error) {
    console.error('❌ Error fixing missing ranks:', error);
    throw error;
  }
}