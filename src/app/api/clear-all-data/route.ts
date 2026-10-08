import { NextRequest, NextResponse } from 'next/server';
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

export async function GET(request: NextRequest) {
  try {
    console.log('🧹 Clearing all IndexedDB data...');
    
    // This will run in the server context, so we can't access browser IndexedDB
    // Return a client-side script to clear the data
    return new NextResponse(`
      <html>
        <body>
          <h1>Clearing all data...</h1>
          <div id="status"></div>
          <script>
            async function clearAllData() {
              const status = document.getElementById('status');
              
              try {
                // Delete all IndexedDB databases
                const databases = await indexedDB.databases();
                for (const db of databases) {
                  await indexedDB.deleteDatabase(db.name);
                  status.innerHTML += '<p>Deleted database: ' + db.name + '</p>';
                }
                
                // Clear localStorage
                localStorage.clear();
                status.innerHTML += '<p>Cleared localStorage</p>';
                
                // Clear sessionStorage
                sessionStorage.clear();
                status.innerHTML += '<p>Cleared sessionStorage</p>';
                
                status.innerHTML += '<h2 style="color: green;">✅ All data cleared successfully!</h2>';
                status.innerHTML += '<p><a href="/welcome">Go to Welcome Page</a></p>';
              } catch (error) {
                status.innerHTML = '<h2 style="color: red;">Error: ' + error.message + '</h2>';
              }
            }
            
            clearAllData();
          </script>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in clear-all-data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}