import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rankUpdates } = req.body;

    if (!rankUpdates || !Array.isArray(rankUpdates)) {
      return res.status(400).json({ error: 'Invalid rankUpdates data' });
    }

    // Create database connection
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'discord_forum',
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    // Update ranks
    for (const update of rankUpdates) {
      await pool.execute(
        'UPDATE threads SET thread_rank = ? WHERE id = ?',
        [update.rank, update.threadId]
      );
    }

    await pool.end();

    res.status(200).json({ success: true, message: 'Ranks updated successfully' });
  } catch (error) {
    console.error('Error updating ranks:', error);
    res.status(500).json({ error: 'Failed to update ranks' });
  }
}
