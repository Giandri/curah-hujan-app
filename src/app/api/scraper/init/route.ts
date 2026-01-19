import { NextResponse } from 'next/server';

// Force Node.js runtime for scraper operations
export const runtime = 'nodejs';

// Initialize scraper on server startup
let isInitialized = false;

export async function GET() {
  try {
    if (isInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Scraper already initialized',
        initialized: true
      });
    }

    console.log('🏭 Initializing scraper via API...');

    try {
      const { initializeScraper } = await import('../../../../lib/scraper/index');
      initializeScraper();
      isInitialized = true;

      return NextResponse.json({
        success: true,
        message: 'Scraper initialized successfully',
        initialized: true,
        environment: process.env.NODE_ENV || 'unknown'
      });
    } catch (scraperError) {
      console.error('❌ Failed to initialize scraper:', scraperError);
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize scraper',
        error: scraperError instanceof Error ? scraperError.message : 'Unknown error',
        initialized: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ API initialization error:', error);
    return NextResponse.json({
      success: false,
      message: 'API initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
