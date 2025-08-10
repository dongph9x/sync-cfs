const { smartSync } = require('./dist/lib/smartSync.js');
const { updateRanksAfterSync } = require('./dist/lib/updateRanks.js');
const { getPool } = require('./dist/lib/db.js');

// Test health check
async function testHealth() {
  try {
    console.log('🔍 Testing health check...');
    const pool = getPool();
    await pool.execute('SELECT 1 as health_check');
    console.log('✅ Health check passed');
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Test update ranks
async function testUpdateRanks() {
  try {
    console.log('🔄 Testing update ranks...');
    await updateRanksAfterSync();
    console.log('✅ Update ranks completed');
    return true;
  } catch (error) {
    console.error('❌ Update ranks failed:', error.message);
    return false;
  }
}

// Test smart sync (minimal)
async function testSmartSync() {
  try {
    console.log('🔄 Testing smart sync...');
    
    // Import Discord.js
    const { Client, GatewayIntentBits, Partials } = require('discord.js');
    
    // Create minimal client
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    // Login
    await client.login(process.env.DISCORD_TOKEN);
    console.log('✅ Discord client connected');

    // Run minimal sync
    await smartSync(client, { forceFull: false });
    
    // Cleanup
    client.destroy();
    console.log('✅ Smart sync completed');
    return true;
  } catch (error) {
    console.error('❌ Smart sync failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting API tests...\n');

  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Update Ranks', fn: testUpdateRanks },
    { name: 'Smart Sync', fn: testSmartSync }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { testHealth, testUpdateRanks, testSmartSync };
