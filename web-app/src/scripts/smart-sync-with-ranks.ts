import { spawn } from 'child_process';

async function smartSyncWithRanks() {
  console.log('🚀 Starting Smart Sync with automatic rank update...\n');
  
  // Step 1: Run smart sync from discord-bot (now includes rank update)
  console.log('📡 Running smart sync from Discord (with auto rank update)...');
  
  return new Promise<void>((resolve, reject) => {
    // Change to discord-bot directory and run smart sync
    const smartSyncProcess = spawn('npm', ['run', 'smart-sync'], {
      cwd: '../discord-bot',
      stdio: 'pipe',
      shell: true
    });
    
    let syncOutput = '';
    let syncCompleted = false;
    
    smartSyncProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      syncOutput += output;
      console.log(output.trim());
      
      // Check if complete workflow finished successfully
      if (output.includes('Smart sync completed successfully') || 
          output.includes('All thread_ranks updated successfully')) {
        syncCompleted = true;
      }
    });
    
    smartSyncProcess.stderr?.on('data', (data) => {
      console.error('❌ Sync Error:', data.toString());
    });
    
    smartSyncProcess.on('close', async (code) => {
      console.log(`\n📊 Smart sync process exited with code ${code}`);
      
      if (code === 0 && syncCompleted) {
        console.log('✅ Complete workflow finished successfully!');
        console.log('🎉 Smart sync + rank update completed!');
        resolve();
      } else {
        console.error('❌ Smart sync failed or did not complete successfully');
        console.error('Sync output:', syncOutput);
        reject(new Error(`Smart sync failed with code ${code}`));
      }
    });
    
    smartSyncProcess.on('error', (error) => {
      console.error('❌ Failed to start smart sync process:', error);
      reject(error);
    });
  });
}

// Run the complete workflow
smartSyncWithRanks().catch((error) => {
  console.error('❌ Workflow failed:', error);
  process.exit(1);
});
