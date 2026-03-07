/**
 * Coach Dashboard API Usage Examples
 * Demonstrates how to use the coach dashboard backend API
 */

import CoachDashboardServer from '../backend/server';
import ReportGenerator from '../backend/ReportGenerator';

/**
 * Example 1: Start the Coach Dashboard Server
 */
export async function startCoachDashboardServer(): Promise<void> {
  console.log('=== Starting Coach Dashboard Server ===\n');

  const server = new CoachDashboardServer(3000);
  server.start();

  console.log('Server started successfully!');
  console.log('Available endpoints:');
  console.log('  - GET /health');
  console.log('  - GET /api/coach/students/:coachId');
  console.log('  - GET /api/coach/progress/:coachId');
  console.log('  - GET /api/coach/issues/:coachId');
  console.log('  - GET /api/coach/alerts/:coachId');
  console.log('  - GET /api/coach/student/:studentId/analytics');
  console.log('  - GET /api/reports/generate');
  console.log('  - GET /api/reports/admin-summary/:coachId\n');
}

/**
 * Example 2: Generate Progress Report (CSV)
 */
export async function generateCSVReport(): Promise<void> {
  console.log('=== Generating CSV Progress Report ===\n');

  try {
    const report = await ReportGenerator.generateReport({
      coachId: 'coach-123',
      format: 'csv',
      timeframe: '30d',
      includeDetails: true
    });

    console.log('CSV Report Generated:');
    console.log(report);
    console.log('\nReport can be opened in Excel or Google Sheets\n');
  } catch (error) {
    console.error('Error generating CSV report:', error);
  }
}

/**
 * Example 3: Generate Progress Report (JSON)
 */
export async function generateJSONReport(): Promise<void> {
  console.log('=== Generating JSON Progress Report ===\n');

  try {
    const report = await ReportGenerator.generateReport({
      coachId: 'coach-123',
      format: 'json',
      timeframe: '30d',
      includeDetails: true
    });

    const parsed = JSON.parse(report);
    console.log('JSON Report Generated:');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('\nReport includes:');
    console.log(`  - Total Students: ${parsed.totalStudents}`);
    console.log(`  - Average Score: ${parsed.summary.averageScore.toFixed(2)}`);
    console.log(`  - Students Needing Intervention: ${parsed.summary.studentsNeedingIntervention}\n`);
  } catch (error) {
    console.error('Error generating JSON report:', error);
  }
}

/**
 * Example 4: Generate Administrative Summary
 */
export async function generateAdminSummary(): Promise<void> {
  console.log('=== Generating Administrative Summary ===\n');

  try {
    const summary = await ReportGenerator.generateAdminSummary('coach-123');

    console.log('Administrative Summary:');
    console.log(`  Total Students: ${summary.totalStudents}`);
    console.log(`  Active Students: ${summary.activeStudents}`);
    console.log(`  Average Engagement: ${summary.averageEngagement.toFixed(1)} sessions/week`);
    console.log(`  Students Needing Intervention: ${summary.studentsNeedingIntervention}`);
    console.log(`  Performance Trend: ${summary.performanceTrend}`);
    console.log('\n  Top Issues:');
    summary.topIssues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue.issue}: ${issue.count} occurrences`);
    });
    console.log();
  } catch (error) {
    console.error('Error generating admin summary:', error);
  }
}

/**
 * Example 5: Batch Report Generation for Large Datasets
 */
export async function generateBatchReport(): Promise<void> {
  console.log('=== Generating Batch Report for Large Dataset ===\n');

  try {
    const generator = await ReportGenerator.generateBatchReport(
      {
        coachId: 'coach-123',
        format: 'json',
        timeframe: '30d'
      },
      50 // Process 50 students per batch
    );

    let batchNumber = 1;
    for await (const batch of generator) {
      console.log(`Processing batch ${batchNumber}...`);
      const parsed = JSON.parse(batch);
      console.log(`  Students in batch: ${parsed.students.length}`);
      batchNumber++;
    }

    console.log('\nBatch processing complete!\n');
  } catch (error) {
    console.error('Error generating batch report:', error);
  }
}

/**
 * Example 6: Making API Requests (using fetch)
 */
export async function makeAPIRequests(): Promise<void> {
  console.log('=== Making API Requests ===\n');

  const baseURL = 'http://localhost:3000';
  const coachId = 'coach-123';

  try {
    // Get student progress summaries
    console.log('1. Fetching student progress summaries...');
    const progressResponse = await fetch(`${baseURL}/api/coach/progress/${coachId}`);
    const progressData = await progressResponse.json();
    console.log(`   Found ${progressData.summaries?.length || 0} students\n`);

    // Get common form issues
    console.log('2. Fetching common form issues...');
    const issuesResponse = await fetch(`${baseURL}/api/coach/issues/${coachId}`);
    const issuesData = await issuesResponse.json();
    console.log(`   Found ${issuesData.issues?.length || 0} common issues\n`);

    // Get intervention alerts
    console.log('3. Fetching intervention alerts...');
    const alertsResponse = await fetch(`${baseURL}/api/coach/alerts/${coachId}`);
    const alertsData = await alertsResponse.json();
    console.log(`   Found ${alertsData.alerts?.length || 0} alerts\n`);

    // Generate report
    console.log('4. Generating CSV report...');
    const reportResponse = await fetch(
      `${baseURL}/api/reports/generate?coachId=${coachId}&format=csv&timeframe=30d`
    );
    const reportData = await reportResponse.text();
    console.log(`   Report size: ${reportData.length} bytes\n`);

    console.log('All API requests completed successfully!\n');
  } catch (error) {
    console.error('Error making API requests:', error);
    console.log('Note: Make sure the server is running (npm run server)\n');
  }
}

/**
 * Example 7: Integration with Mobile App Sync
 */
export async function integrateWithMobileApp(): Promise<void> {
  console.log('=== Mobile App Integration Example ===\n');

  console.log('The coach dashboard API integrates with the mobile app through:');
  console.log('1. SyncManager automatically syncs session data to the backend');
  console.log('2. Coach dashboard queries this synced data for analytics');
  console.log('3. Reports are generated from the aggregated student data\n');

  console.log('Integration Flow:');
  console.log('  Student App → Records Session → Local Storage');
  console.log('  Local Storage → SyncManager → Backend Database');
  console.log('  Backend Database → Coach Dashboard API → Coach Web Interface\n');

  console.log('Key Benefits:');
  console.log('  - Offline-first: Students can practice without connectivity');
  console.log('  - Automatic sync: Data syncs when connectivity is available');
  console.log('  - Real-time insights: Coaches see updated data as it syncs');
  console.log('  - Scalable: Handles multiple students and coaches efficiently\n');
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Coach Dashboard API - Usage Examples              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Note: In a real scenario, you would run these examples separately
  // as some require the server to be running

  await integrateWithMobileApp();

  console.log('To run the server and test the API:');
  console.log('  1. Start the server: npm run server');
  console.log('  2. In another terminal, make API requests using curl or Postman');
  console.log('  3. Or use the makeAPIRequests() function from this file\n');

  console.log('Example curl commands:');
  console.log('  curl http://localhost:3000/health');
  console.log('  curl http://localhost:3000/api/coach/progress/coach-123');
  console.log('  curl http://localhost:3000/api/reports/generate?coachId=coach-123&format=json\n');
}

// Export all examples
export default {
  startCoachDashboardServer,
  generateCSVReport,
  generateJSONReport,
  generateAdminSummary,
  generateBatchReport,
  makeAPIRequests,
  integrateWithMobileApp,
  runAllExamples
};
