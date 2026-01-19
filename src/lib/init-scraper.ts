import { initializeScraper } from './scraper';

// Initialize scraper in both development and production
console.log('🏭 Starting scraper initialization...');

try {
  initializeScraper();
} catch (error) {
  console.error('❌ Failed to initialize scraper:', error);
  // Don't crash the app if scraper fails to initialize
}

// Export for manual initialization if needed
export { initializeScraper } from './scraper';
