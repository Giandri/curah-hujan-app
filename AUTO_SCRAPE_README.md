# Auto-Scraping Setup - BWS Data Collection

Panduan lengkap untuk setup auto-scraping saat server startup.

## 🎯 **Overview**

Sistem auto-scraping memastikan data BWS tersedia setiap kali aplikasi dijalankan. Ada beberapa cara untuk menjalankan auto-scraping:

1. **Script-based**: Jalankan scraper sebelum start dev server
2. **API Trigger**: Trigger scraping via API call saat startup
3. **Hook-based**: Otomatis trigger saat aplikasi pertama kali dimuat

## 🚀 **Quick Start**

### **Option 1: Development dengan Auto-Scrape (Recommended)**

```bash
# Jalankan development server dengan auto-scraping
npm run dev:scrape
```

**Yang terjadi:**

1. ✅ Jalankan scraper untuk collect data
2. ✅ Tunggu sampai selesai
3. ✅ Start Next.js dev server
4. ✅ Aplikasi siap dengan data terbaru

## 🚀 **Cara Menjalankan Scraper**

### **1. Auto-Scraping Production (Recommended)**

Scraper berjalan otomatis setiap 10 menit saat aplikasi production:

```bash
# Development (scraper tidak aktif)
npm run dev

# Production (scraper aktif otomatis)
npm run build
npm start
```

### **2. Manual Trigger via Browser/Web**

Buka browser dan akses endpoint:

#### **Via Browser Console:**

```javascript
// Jalankan di browser console saat aplikasi berjalan
fetch("/api/scraper/trigger", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "run-now" }),
})
  .then((r) => r.json())
  .then(console.log);
```

#### **Via UI Button (Halaman Data):**

1. Buka halaman `/Data`
2. Klik tombol **"Refresh Data"**
3. Scraper akan dijalankan dan data diperbarui

### **3. Via Command Line:**

```bash
# Via curl
curl -X POST http://localhost:3000/api/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{"action":"run-now"}'

# Check cron status
curl http://localhost:3000/api/scraper/cron
```

### **4. Direct Script Execution (Advanced):**

```bash
# Via npm script
npm run scraper:run

# Via tsx (jika tersedia)
npx tsx src/lib/scraper/index.ts
```

### **Option 2: Manual Auto-Scrape**

```bash
# 1. Jalankan auto-scrape saja
npm run auto-scrape

# 2. Jalankan dev server normal
npm run dev
```

### **Option 3: API Trigger**

```bash
# Jalankan dev server normal
npm run dev

# Trigger scraping via API (di browser/postman)
GET http://localhost:3000/api/scraper/trigger?action=startup
```

## 📁 **File Structure**

```
📁 Auto-Scrape System
├── 📄 scripts/
│   ├── auto-scrape.js          # Main auto-scrape script
│   └── dev-with-scrape.js      # Dev server with scraping
├── 📄 src/
│   ├── app/api/scraper/trigger/route.ts  # API trigger endpoint
│   ├── hooks/use-startup-scrape.ts       # React hook for startup
│   └── components/StartupScraperTrigger.tsx # Startup component
└── 📄 package.json (updated scripts)
```

## 🔧 **Scripts Available**

### **NPM Scripts**

```bash
# Development dengan auto-scraping
npm run dev:scrape

# Jalankan auto-scrape saja
npm run auto-scrape

# Scraper management
npm run scraper:start    # Start scraper service
npm run scraper:test     # Test scraper
npm run scraper:status   # Check scraper status
```

### **Manual Scripts**

```bash
# Jalankan auto-scrape script
node scripts/auto-scrape.js

# Jalankan dev dengan scraping
node scripts/dev-with-scrape.js
```

## 📊 **How It Works**

### **Auto-Scrape Logic**

1. **Check Existing Data**

   ```javascript
   // Cek apakah file data sudah ada
   const dataStatus = checkExistingData();
   ```

2. **Data Validation**

   ```javascript
   // Cek apakah data masih fresh (< 30 menit)
   if (oldestFile.age > 30) {
     await runScraper();
   }
   ```

3. **Run Scraper if Needed**

   ```javascript
   if (dataStatus.shouldScrape) {
     await runScraper();
   }
   ```

4. **Final Verification**
   ```javascript
   const finalStatus = checkExistingData();
   if (finalStatus.allExist) {
     // Success - start application
   }
   ```

### **Startup Flow**

```
App Start → Layout Mount → StartupScraperTrigger → useStartupScrape → API Call → Scraper Trigger → Data Ready
```

## 🔍 **Monitoring & Debugging**

### **Check Data Status**

```bash
# Via npm script
npm run auto-scrape

# Via scraper utils
cd scraper && npm run list-files
cd scraper && npm run status
```

### **API Endpoints**

```bash
# Trigger scraping
GET  /api/scraper/trigger?action=startup
POST /api/scraper/trigger

# Check data
GET /api/scraper           # All data
GET /api/scraper/duga-air  # POS Duga Air only
```

### **Browser Console Logs**

```javascript
// Logs yang muncul saat startup
🚀 Triggering startup scraping...
✅ Startup scraping triggered: Scraper process started successfully
🎉 Startup scraping completed: Data ready
```

## ⚙️ **Configuration**

### **Auto-Scrape Settings**

```javascript
// scripts/auto-scrape.js
const SCRAPER_TIMEOUT = 120000; // 2 minutes
const MAX_DATA_AGE = 30; // minutes
```

### **API Settings**

```javascript
// src/app/api/scraper/trigger/route.ts
const SCRAPER_TIMEOUT = 300000; // 5 minutes for API calls
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Scraper Timeout**

   ```bash
   # Increase timeout in scripts/auto-scrape.js
   const SCRAPER_TIMEOUT = 180000; // 3 minutes
   ```

2. **Data Directory Not Found**

   ```bash
   # Create manually
   mkdir -p scraper/data
   ```

3. **Permission Issues**

   ```bash
   # Fix permissions
   chmod +x scripts/auto-scrape.js
   chmod +x scripts/dev-with-scrape.js
   ```

4. **Port Already in Use**
   ```bash
   # Kill existing processes
   npx kill-port 3000
   ```

### **Debug Mode**

```bash
# Run with detailed logs
DEBUG=* npm run dev:scrape

# Check scraper directly
cd scraper && npm run inspect
```

## 📈 **Performance**

### **Timing Breakdown**

- **Data Check**: ~100ms
- **Scraper Run**: 30-120 seconds (depends on network)
- **File Validation**: ~50ms
- **App Start**: ~5-10 seconds

### **Resource Usage**

- **Memory**: ~50-100MB during scraping
- **CPU**: Minimal (single-threaded scraping)
- **Network**: ~10-20 requests per scraping session

## 🔄 **Workflow Options**

### **Development Workflow**

```bash
# Option A: Full auto-scrape (recommended)
npm run dev:scrape

# Option B: Manual control
npm run auto-scrape  # Collect data first
npm run dev         # Then start dev server
```

### **Production Workflow**

```bash
# Build and start
npm run build
npm run start

# Scraper runs separately as background service
npm run scraper:start
```

### **CI/CD Workflow**

```yaml
# .github/workflows/deploy.yml
- name: Run auto-scrape
  run: npm run auto-scrape

- name: Build application
  run: npm run build

- name: Start services
  run: |
    npm run scraper:start &
    npm run start
```

## 🎯 **Best Practices**

### **Development**

- ✅ Use `npm run dev:scrape` for daily development
- ✅ Check console logs for scraping status
- ✅ Use browser dev tools Network tab to monitor API calls

### **Production**

- ✅ Run scraper as background service
- ✅ Monitor scraper logs regularly
- ✅ Set up alerts for scraping failures
- ✅ Backup data periodically

### **Maintenance**

- ✅ Clean old data files regularly
- ✅ Monitor scraper performance
- ✅ Update scraping logic when BWS website changes
- ✅ Test scraping after BWS website updates

## 📞 **API Reference**

### **Trigger Endpoints**

#### `GET /api/scraper/trigger?action=startup`

Trigger scraping saat aplikasi startup.

**Response:**

```json
{
  "success": true,
  "message": "Startup scraping triggered successfully",
  "processId": 12345,
  "data": {
    "scraperDir": "/app/scraper",
    "command": "node",
    "args": ["index.js"]
  }
}
```

#### `POST /api/scraper/trigger`

Trigger scraping secara manual.

**Response:** Same as GET request.

### **Data Endpoints**

#### `GET /api/scraper`

Ambil semua data scraper.

#### `GET /api/scraper/[type]`

Ambil data spesifik:

- `duga-air`
- `curah-hujan`
- `klimatologi`

## 🎉 **Success Indicators**

### **Console Logs**

```
✅ Auto-scrape completed successfully!
📊 All data files are ready for the application.
🔧 Starting Next.js development server...
```

### **Browser Indicators**

- Status dashboard menampilkan data
- Tidak ada error messages
- Tabel terisi dengan data terkini

### **File System**

```
scraper/data/
├── pos_duga_air_latest.json      ✅
├── pos_curah_hujan_latest.json   ✅
└── pos_klimatologi_latest.json   ✅
```

## 🚨 **Error Handling**

### **Scraper Failures**

- Auto-scraping akan melanjutkan ke dev server meski gagal
- Error akan dilog ke console
- Aplikasi tetap bisa berjalan dengan data cache (jika ada)

### **Timeout Issues**

- Scraper timeout setelah 2 menit
- Otomatis kill process jika timeout
- Continue dengan dev server

### **Network Issues**

- Retry mechanism built-in
- Fallback ke data existing jika network down
- Graceful degradation

---

**🎯 Auto-scraping system siap digunakan! Jalankan `npm run dev:scrape` untuk memulai development dengan data terkini.**
