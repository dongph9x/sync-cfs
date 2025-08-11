import 'dotenv/config';

async function testApiToggle() {
  console.log('🧪 Testing API toggle published...');

  const threadId = '1401996143923171390';
  const baseUrl = 'http://localhost:4321';

  try {
    // 1. Test toggle to false
    console.log('\n🔄 Step 1: Toggle to false');
    const falseResponse = await fetch(`${baseUrl}/api/admin/thread/toggle-published`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadId, published: false }),
    });

    const falseData = await falseResponse.json();
    console.log('Toggle to false response:', falseData);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Check if thread is hidden from public page
    console.log('\n📋 Step 2: Check public page');
    const publicResponse = await fetch(`${baseUrl}/confessions`);
    const publicHtml = await publicResponse.text();
    const isVisible = publicHtml.includes('📝 Confession #3');
    console.log('Thread visible on public page:', isVisible);

    // 3. Test toggle to true
    console.log('\n🔄 Step 3: Toggle to true');
    const trueResponse = await fetch(`${baseUrl}/api/admin/thread/toggle-published`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadId, published: true }),
    });

    const trueData = await trueResponse.json();
    console.log('Toggle to true response:', trueData);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Check if thread is visible again
    console.log('\n📋 Step 4: Check public page again');
    const publicResponse2 = await fetch(`${baseUrl}/confessions`);
    const publicHtml2 = await publicResponse2.text();
    const isVisible2 = publicHtml2.includes('📝 Confession #3');
    console.log('Thread visible on public page:', isVisible2);

    console.log('\n✅ API test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiToggle()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
