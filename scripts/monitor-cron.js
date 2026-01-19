#!/usr/bin/env node

/**
 * Cron Job Monitor
 * Memantau status dan kesehatan cron job scraper
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();
const PROJECT_ROOT = path.join(__dirname, '..');
const SCRAPER_DIR = path.join(PROJECT_ROOT, 'scraper');
const DATA_DIR = path.join(SCRAPER_DIR, 'data');
const LOG_FILE = path.join(SCRAPER_DIR, 'scraper-cron.log');

console.log('📊 Cron Job Monitor - BWS Scraper\n');

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

function checkDataFiles() {
  console.log('📁 Data Files Status:');

  if (!fs.existsSync(DATA_DIR)) {
    console.log('❌ Data directory not found');
    return { totalFiles: 0, totalSize: 0, files: [] };
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let totalSize = 0;
  const fileDetails = [];

  files.forEach(filename => {
    const filePath = path.join(DATA_DIR, filename);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;

    // Try to read basic info from JSON
    let recordCount = 0;
    let lastUpdated = null;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      recordCount = data.total_records || 0;
      lastUpdated = data.last_updated ? new Date(data.last_updated) : null;
    } catch (error) {
      // Ignore parse errors for basic stats
    }

    fileDetails.push({
      name: filename,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      modified: stats.mtime,
      age: formatTimeAgo(stats.mtime),
      records: recordCount,
      lastUpdated: lastUpdated
    });
  });

  fileDetails.forEach(file => {
    const status = file.records > 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${file.name}: ${file.records} records, ${file.sizeFormatted}, ${file.age}`);
  });

  console.log(`\n📊 Summary: ${files.length} files, ${formatBytes(totalSize)} total\n`);

  return { totalFiles: files.length, totalSize, files: fileDetails };
}

function checkRunningProcesses() {
  console.log('🔄 Running Processes:');

  try {
    const { execSync } = require('child_process');
    let command, grepPattern;

    if (platform === 'win32') {
      // Windows: check node processes
      command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
      const output = execSync(command, { encoding: 'utf8' });
      const lines = output.split('\n').filter(line => line.includes('node.exe'));

      if (lines.length > 0) {
        console.log('✅ Node.js processes found:');
        lines.forEach((line, index) => {
          console.log(`  ${index + 1}. ${line.split(',')[0].replace(/"/g, '')}`);
        });
      } else {
        console.log('❌ No Node.js processes found');
      }
    } else {
      // Linux/Mac: check for scraper processes
      command = 'ps aux | grep -E "(node|scraper)" | grep -v grep';
      const output = execSync(command, { encoding: 'utf8' });
      const lines = output.split('\n').filter(line => line.trim());

      if (lines.length > 0) {
        console.log('✅ Scraper processes found:');
        lines.forEach((line, index) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          const command = parts.slice(10).join(' ');
          console.log(`  ${index + 1}. PID ${pid}: ${command}`);
        });
      } else {
        console.log('❌ No scraper processes found');
      }
    }
  } catch (error) {
    console.log('❌ Error checking processes:', error.message);
  }

  console.log('');
}

function checkCronJobs() {
  console.log('⏰ Cron Jobs Status:');

  try {
    if (platform === 'win32') {
      // Windows Task Scheduler
      try {
        const { execSync } = require('child_process');
        const output = execSync('schtasks /query /tn "BWS Scraper" 2>nul', { encoding: 'utf8' });

        if (output.includes('BWS Scraper')) {
          console.log('✅ Windows Task "BWS Scraper" is configured');

          // Get next run time
          const lines = output.split('\n');
          const nextRunLine = lines.find(line => line.includes('Next Run Time'));
          if (nextRunLine) {
            console.log(`  📅 ${nextRunLine.trim()}`);
          }
        } else {
          console.log('❌ Windows Task "BWS Scraper" not found');
        }
      } catch (error) {
        console.log('❌ Windows Task Scheduler check failed');
        console.log('💡 Make sure Task Scheduler is accessible');
      }
    } else {
      // Linux/Mac crontab
      try {
        const { execSync } = require('child_process');
        const output = execSync('crontab -l 2>/dev/null || echo "No crontab"', { encoding: 'utf8' });

        if (output.includes('scraper') || output.includes('BWS')) {
          console.log('✅ Crontab contains scraper jobs');

          // Show relevant lines
          const lines = output.split('\n').filter(line =>
            line.includes('scraper') || line.includes('BWS') || line.includes('node')
          );
          lines.forEach(line => console.log(`  📝 ${line}`));
        } else {
          console.log('❌ No scraper jobs found in crontab');
        }
      } catch (error) {
        console.log('❌ Crontab check failed');
        console.log('💡 Make sure crontab is accessible');
      }
    }
  } catch (error) {
    console.log('❌ Cron job check failed:', error.message);
  }

  console.log('');
}

function checkRecentLogs() {
  console.log('📋 Recent Log Activity:');

  if (!fs.existsSync(LOG_FILE)) {
    console.log('❌ Log file not found');
    return;
  }

  try {
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      console.log('📭 Log file is empty');
      return;
    }

    // Get last 10 lines
    const recentLines = lines.slice(-10);

    console.log('📄 Last 10 log entries:');
    recentLines.forEach((line, index) => {
      if (line.trim()) {
        const lineNum = lines.length - 10 + index + 1;
        console.log(`  ${lineNum}. ${line}`);
      }
    });

    // Check for errors in recent logs
    const recentErrors = recentLines.filter(line =>
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('failed') ||
      line.includes('❌')
    );

    if (recentErrors.length > 0) {
      console.log(`\n⚠️ Found ${recentErrors.length} potential errors in recent logs`);
    } else {
      console.log('\n✅ No errors found in recent logs');
    }

  } catch (error) {
    console.log('❌ Error reading log file:', error.message);
  }

  console.log('');
}

function generateHealthReport() {
  console.log('🏥 Health Report:');

  const dataStatus = checkDataFiles();
  let score = 0;
  let maxScore = 4;

  // Check data files
  if (dataStatus.totalFiles >= 3) {
    console.log('✅ Data files: All present');
    score++;
  } else {
    console.log('❌ Data files: Incomplete');
  }

  // Check file freshness (should be < 30 minutes old)
  const now = new Date();
  const recentFiles = dataStatus.files.filter(file => {
    const ageMinutes = (now - file.modified) / (1000 * 60);
    return ageMinutes < 30;
  });

  if (recentFiles.length >= dataStatus.files.length * 0.8) {
    console.log('✅ Data freshness: Recent');
    score++;
  } else {
    console.log('⚠️ Data freshness: Some files are old');
  }

  // Check log file
  if (fs.existsSync(LOG_FILE)) {
    const logStats = fs.statSync(LOG_FILE);
    const logAge = (now - logStats.mtime) / (1000 * 60);

    if (logAge < 60) { // Log updated in last hour
      console.log('✅ Logging: Active');
      score++;
    } else {
      console.log('⚠️ Logging: Not recently updated');
    }
  } else {
    console.log('❌ Logging: No log file');
  }

  // Overall score
  const healthPercentage = Math.round((score / maxScore) * 100);
  const healthStatus = healthPercentage >= 75 ? '🟢 Good' :
                      healthPercentage >= 50 ? '🟡 Fair' : '🔴 Poor';

  console.log(`\n📊 Overall Health: ${healthStatus} (${score}/${maxScore} checks passed)`);

  if (healthPercentage < 75) {
    console.log('\n💡 Recommendations:');
    if (dataStatus.totalFiles < 3) console.log('  - Run scraper to generate missing data files');
    if (recentFiles.length < dataStatus.files.length) console.log('  - Check cron job is running regularly');
    if (!fs.existsSync(LOG_FILE)) console.log('  - Verify log file path and permissions');
  }

  console.log('');
}

function showNextRuns() {
  console.log('📅 Next Scheduled Runs:');

  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();

  // Calculate next 5 runs for */10 * * * * schedule
  const nextRuns = [];
  for (let i = 0; i < 5; i++) {
    let nextMinute = Math.ceil((currentMinute + 1) / 10) * 10;
    if (nextMinute >= 60) {
      nextMinute = 0;
    }

    const nextTime = new Date(now);
    if (nextMinute <= currentMinute) {
      nextTime.setHours(currentHour + 1, nextMinute, 0, 0);
    } else {
      nextTime.setMinutes(nextMinute, 0, 0);
    }

    // Skip if we've already calculated this time
    if (nextRuns.length > 0 && nextTime.getTime() === nextRuns[nextRuns.length - 1].getTime()) {
      nextTime.setMinutes(nextTime.getMinutes() + 10);
    }

    nextRuns.push(new Date(nextTime));
    now.setTime(nextTime.getTime()); // Update for next iteration
  }

  nextRuns.forEach((runTime, index) => {
    const timeString = runTime.toLocaleString('id-ID');
    const minutesUntil = Math.round((runTime - new Date()) / (1000 * 60));
    console.log(`  ${index + 1}. ${timeString} (${minutesUntil} minutes from now)`);
  });

  console.log('');
}

// Main execution
async function main() {
  console.log('🔍 Monitoring BWS Scraper Cron Jobs...\n');

  try {
    // Check data files
    checkDataFiles();

    // Check running processes
    checkRunningProcesses();

    // Check cron job configuration
    checkCronJobs();

    // Check recent logs
    checkRecentLogs();

    // Show next scheduled runs
    showNextRuns();

    // Generate health report
    generateHealthReport();

    console.log('✅ Monitoring complete!');

  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Cron Job Monitor for BWS Scraper

Usage:
  node scripts/monitor-cron.js [options]

Options:
  --help, -h          Show this help message
  --data             Check only data files
  --processes        Check only running processes
  --cron             Check only cron job configuration
  --logs             Check only recent logs
  --health           Show only health report

Description:
  Monitors the health and status of BWS scraper cron jobs,
  including data files, running processes, cron configuration,
  and recent activity logs.

Examples:
  node scripts/monitor-cron.js         # Full monitoring
  node scripts/monitor-cron.js --data  # Check data files only
  node scripts/monitor-cron.js --health # Health report only
`);
  process.exit(0);
}

// Run specific checks
if (args.includes('--data')) {
  checkDataFiles();
  process.exit(0);
}

if (args.includes('--processes')) {
  checkRunningProcesses();
  process.exit(0);
}

if (args.includes('--cron')) {
  checkCronJobs();
  process.exit(0);
}

if (args.includes('--logs')) {
  checkRecentLogs();
  process.exit(0);
}

if (args.includes('--health')) {
  checkDataFiles();
  generateHealthReport();
  process.exit(0);
}

// Run full monitoring
main();
