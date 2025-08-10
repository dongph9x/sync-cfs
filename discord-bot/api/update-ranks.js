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
    console.log('🔄 Starting rank update...');

    // Update ranks
    await updateRanksAfterSync();

    console.log('✅ Rank update completed successfully');

    res.status(200).json({
      success: true,
      message: 'Rank update completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Rank update failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
