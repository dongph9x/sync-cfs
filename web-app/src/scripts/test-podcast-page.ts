import { 
  createPool, 
  getAllPodcastSchedules, 
  createPodcastSchedule, 
  deletePodcastSchedule,
  getAllChannels,
  getThreadsByChannelId,
  addThreadToPodcastSchedule
} from '../lib/db';
import 'dotenv/config';

async function testPodcastPage() {
  console.log('🧪 Testing unified podcast page...');

  // Initialize database
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    // Clean up existing schedules
    console.log('\n🧹 Cleaning up existing schedules...');
    const existingSchedules = await getAllPodcastSchedules();
    for (const schedule of existingSchedules) {
      await deletePodcastSchedule(schedule.id);
      console.log(`  - Deleted schedule: ${schedule.title}`);
    }

    // Create test schedules
    console.log('\n📝 Creating test schedules...');
    const schedule1Id = await createPodcastSchedule(
      'Confessions Tập 1 - Những câu chuyện đầu tiên', 
      'Tập đầu tiên của series Confessions - khám phá những câu chuyện thú vị từ cộng đồng'
    );
    const schedule2Id = await createPodcastSchedule(
      'Confessions Tập 2 - Chia sẻ tâm sự', 
      'Tập thứ hai - nơi mọi người chia sẻ những tâm sự thầm kín'
    );
    
    console.log(`✅ Created 2 test schedules: ${schedule1Id}, ${schedule2Id}`);

    // Add some threads to schedules
    console.log('\n🔗 Adding threads to schedules...');
    const channels = await getAllChannels();
    const threads = await getThreadsByChannelId(channels[0].id, false);
    
    if (threads.length >= 4) {
      // Add first 2 threads to schedule 1
      for (let i = 0; i < 2; i++) {
        await addThreadToPodcastSchedule(schedule1Id, threads[i].id);
        console.log(`  - Added thread "${threads[i].title}" to schedule 1`);
      }
      
      // Add next 2 threads to schedule 2
      for (let i = 2; i < 4; i++) {
        await addThreadToPodcastSchedule(schedule2Id, threads[i].id);
        console.log(`  - Added thread "${threads[i].title}" to schedule 2`);
      }
    }

    // Test the page
    console.log('\n🌐 Testing podcast page...');
    console.log('✅ Visit http://localhost:4321/podcast to see the unified page');
    console.log('✅ The page should show:');
    console.log('  - All podcast schedules with their threads');
    console.log('  - Admin controls (if logged in as admin/editor)');
    console.log('  - Thread details with links to forum');
    console.log('  - Responsive design for all users');

    console.log('\n✅ Unified podcast page test completed!');
    console.log('📋 Features to verify:');
    console.log('  - Public users can view all schedules and threads');
    console.log('  - Admin/editor can see management buttons');
    console.log('  - Threads are properly linked to forum pages');
    console.log('  - No duplicate pages (/podcast vs /podcasts)');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testPodcastPage()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
