// Test script for the API route
const testUpdateRanks = async () => {
  try {
    const response = await fetch('/api/update-ranks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rankUpdates: [
          { threadId: 'test-1', rank: 1 },
          { threadId: 'test-2', rank: 2 }
        ]
      })
    });

    const result = await response.json();
    console.log('API Response:', result);
  } catch (error) {
    console.error('API Error:', error);
  }
};

// Run test if in browser
if (typeof window !== 'undefined') {
  window.testUpdateRanks = testUpdateRanks;
  console.log('Test function available: testUpdateRanks()');
}
