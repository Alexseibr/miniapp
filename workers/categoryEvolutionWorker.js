import cron from 'node-cron';
import CategoryEvolutionService from '../services/CategoryEvolutionService.js';

console.log('[CategoryEvolutionWorker] Starting category evolution worker...');
console.log('[CategoryEvolutionWorker] Will analyze "Other" categories daily at 4:00 AM');

cron.schedule('0 4 * * *', async () => {
  console.log('[CategoryEvolutionWorker] Starting daily analysis at', new Date().toISOString());
  
  try {
    const results = await CategoryEvolutionService.analyzeOtherCategories();
    console.log(`[CategoryEvolutionWorker] Analysis complete. Created ${results.length} new proposals`);
    
    if (results.length > 0) {
      console.log('[CategoryEvolutionWorker] New proposals:');
      results.forEach(proposal => {
        console.log(`  - "${proposal.suggestedName}" in ${proposal.parentCategorySlug} (${proposal.matchedAdsCount} ads)`);
      });
    }
  } catch (error) {
    console.error('[CategoryEvolutionWorker] Error during analysis:', error);
  }
}, {
  timezone: 'Europe/Minsk',
});

console.log('[CategoryEvolutionWorker] Cron job scheduled - runs daily at 4:00 AM (Europe/Minsk)');

export default {
  name: 'CategoryEvolutionWorker',
  runManually: async () => {
    console.log('[CategoryEvolutionWorker] Manual run triggered');
    try {
      const results = await CategoryEvolutionService.analyzeOtherCategories();
      console.log(`[CategoryEvolutionWorker] Manual analysis complete. Created ${results.length} proposals`);
      return results;
    } catch (error) {
      console.error('[CategoryEvolutionWorker] Manual run error:', error);
      throw error;
    }
  },
};
