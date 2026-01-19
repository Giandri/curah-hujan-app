# Cron Job Setup - Auto-Scraping Setiap 10 Menit

Panduan lengkap untuk setup cron job auto-scraping di berbagai environment.

## 🎯 **Overview**

Cron job akan menjalankan scraper setiap 10 menit untuk memastikan data BWS selalu terkini.

### **Schedule**: `*/10 * * * *`

- **Minute**: `*/10` = setiap 10 menit (0, 10, 20, 30, 40, 50)
- **Hour**: `*` = setiap jam
- **Day**: `*` = setiap hari
- **Month**: `*` = setiap bulan
- **Day of Week**: `*` = setiap hari dalam seminggu

## 🚀 **Setup Options**

### **Option 1: Node.js Cron (Built-in - Recommended)**

Scraper sudah memiliki cron job built-in. Jalankan sebagai service:

```bash
# Start scraper dengan cron job
cd scraper
npm run service

# Atau jalankan langsung
npm start
```

**Keuntungan:**

- ✅ Tidak perlu setup sistem cron
- ✅ Auto-restart jika crash
- ✅ Logging terintegrasi
- ✅ Cross-platform (Windows/Linux/Mac)

### **Option 2: Windows Task Scheduler**

#### **Step 1: Buat Batch File**

```batch
@echo off
echo Starting BWS Scraper...
cd /d "D:\CODINGAN\fullstack\curah-hujan\scraper"
node index.js
echo Scraper completed at %date% %time%
```

Simpan sebagai `scraper-task.bat`

#### **Step 2: Setup Task Scheduler**

1. **Buka Task Scheduler:**

   - Win + R → `taskschd.msc` → Enter

2. **Create New Task:**

   - **Name**: `BWS Scraper`
   - **Description**: `Auto-scraping BWS data every 10 minutes`

3. **Triggers Tab:**

   - **New Trigger** → **Begin the task**: `On a schedule`
   - **Settings**: `Daily`
   - **Recur every**: `1 days`
   - **Advanced settings**:
     - ✅ **Repeat task every**: `10 minutes`
     - ✅ **for a duration of**: `Indefinitely`

4. **Actions Tab:**

   - **New Action** → **Start a program**
   - **Program/script**: `D:\CODINGAN\fullstack\curah-hujan\scraper\scraper-task.bat`
   - **Add arguments**: (kosong)
   - **Start in**: `D:\CODINGAN\fullstack\curah-hujan\scraper`

5. **Conditions Tab:**

   - ✅ **Start only if the following network connection is available**: `Any connection`

6. **Settings Tab:**

   - ✅ **Allow task to be run on demand**
   - ✅ **Run task as soon as possible after a scheduled start is missed**
   - ✅ **If the running task does not end when requested, force it to stop**
   - ✅ **Run with highest privileges** (optional)

7. **Save Task**

#### **Step 3: Test Task**

```batch
# Jalankan manual untuk test
schtasks /run /tn "BWS Scraper"

# Check status
schtasks /query /tn "BWS Scraper"
```

### **Option 3: Linux/Mac Crontab**

#### **Step 1: Buat Shell Script**

```bash
#!/bin/bash

# BWS Scraper Cron Job
PROJECT_DIR="/path/to/your/project"
SCRAPER_DIR="$PROJECT_DIR/scraper"
LOG_FILE="$SCRAPER_DIR/scraper-cron.log"

echo "$(date): Starting BWS Scraper..." >> "$LOG_FILE"

cd "$SCRAPER_DIR"

# Jalankan scraper dengan timeout 5 menit
timeout 300s node index.js >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "$(date): Scraper completed with exit code $EXIT_CODE" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"
```

Simpan sebagai `scraper-cron.sh` dan buat executable:

```bash
chmod +x scraper-cron.sh
```

#### **Step 2: Setup Crontab**

```bash
# Edit crontab
crontab -e

# Tambahkan line berikut (sesuaikan path):
*/10 * * * * /path/to/scraper-cron.sh

# Atau jalankan langsung:
*/10 * * * * cd /path/to/scraper && timeout 300s node index.js >> scraper-cron.log 2>&1
```

#### **Step 3: Verify Setup**

```bash
# List cron jobs
crontab -l

# Check cron service status
sudo systemctl status cron  # Linux
sudo launchctl list | grep cron  # Mac

# Monitor logs
tail -f scraper/scraper-cron.log
```

### **Option 4: PM2 Cron Management**

#### **Step 1: Install PM2**

```bash
npm install -g pm2
```

#### **Step 2: Buat Ecosystem File**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "bws-scraper",
      script: "scraper/index.js",
      cwd: "/path/to/your/project",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      cron_restart: "*/10 * * * *", // Restart setiap 10 menit
      log_file: "logs/scraper.log",
      out_file: "logs/scraper-out.log",
      error_file: "logs/scraper-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
```

#### **Step 3: Jalankan dengan PM2**

```bash
# Start aplikasi
pm2 start ecosystem.config.js

# Check status
pm2 status

# Monitor logs
pm2 logs bws-scraper

# Restart manual
pm2 restart bws-scraper
```

### **Option 5: Docker Cron**

#### **Dockerfile dengan Cron**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install cron
RUN apk add --no-cache dcron

# Copy project files
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Setup cron job
RUN echo "*/10 * * * * cd /app/scraper && node index.js >> /var/log/scraper.log 2>&1" > /etc/crontabs/root

# Create log directory
RUN mkdir -p /var/log

# Start cron and app
CMD ["sh", "-c", "crond && npm start"]
```

## 📊 **Monitoring & Management**

### **Check Cron Job Status**

#### **Windows:**

```batch
# Query task status
schtasks /query /tn "BWS Scraper"

# Run manual test
schtasks /run /tn "BWS Scraper"
```

#### **Linux/Mac:**

```bash
# Check running processes
ps aux | grep scraper

# Check cron logs
grep CRON /var/log/syslog

# Test cron manually
run-parts /etc/cron.hourly  # Test hourly (adjust for 10min)
```

#### **PM2:**

```bash
# Status
pm2 status

# Logs
pm2 logs bws-scraper --lines 50

# Restart
pm2 restart bws-scraper
```

### **Log Monitoring**

#### **Windows:**

```
# Logs ada di Task Scheduler history
# Atau check di scraper directory
type scraper\scraper-cron.log
```

#### **Linux/Mac:**

```bash
# Real-time monitoring
tail -f scraper/scraper-cron.log

# Check last runs
grep "Starting BWS Scraper" scraper/scraper-cron.log | tail -5
```

### **Health Check**

#### **API Endpoint:**

```bash
# Check scraper status
curl http://localhost:3000/api/scraper

# Check specific data
curl http://localhost:3000/api/scraper/duga-air
```

#### **File Check:**

```bash
# Check data files
ls -la scraper/data/

# Check file age
find scraper/data -name "*.json" -mmin -10  # Files modified in last 10 minutes
```

## 🚨 **Troubleshooting**

### **Cron Job Tidak Berjalan**

1. **Check Cron Service:**

   ```bash
   # Linux
   sudo systemctl status cron
   sudo systemctl restart cron

   # Mac
   sudo launchctl list | grep cron
   ```

2. **Check Permissions:**

   ```bash
   # Pastikan script executable
   chmod +x scraper-cron.sh

   # Check file permissions
   ls -la scraper/
   ```

3. **Check Paths:**

   ```bash
   # Test manual execution
   cd scraper && node index.js
   ```

4. **Check Logs:**

   ```bash
   # Cron logs
   grep CRON /var/log/syslog

   # Application logs
   tail -f scraper/scraper-cron.log
   ```

### **Scraper Error dalam Cron**

1. **Environment Variables:**

   ```bash
   # Pastikan PATH dan NODE_ENV ter-set
   echo $PATH
   which node
   ```

2. **Working Directory:**

   ```bash
   # Pastikan cd ke directory yang benar
   pwd
   ls -la
   ```

3. **Dependencies:**
   ```bash
   # Pastikan dependencies terinstall
   cd scraper && npm list puppeteer
   ```

### **Performance Issues**

1. **Memory Usage:**

   ```bash
   # Monitor memory
   ps aux | grep scraper
   ```

2. **Multiple Instances:**

   ```bash
   # Check for duplicate processes
   ps aux | grep scraper | wc -l
   ```

3. **Timeout Issues:**
   ```bash
   # Increase timeout in cron
   # */10 * * * * timeout 600s /path/to/scraper.sh
   ```

## 🔧 **Advanced Configuration**

### **Custom Schedule**

```bash
# Setiap 15 menit
*/15 * * * *

# Setiap jam pada menit ke-30
30 * * * *

# Hari kerja saja (Senin-Jumat)
*/10 * * * 1-5

# Weekends only
*/10 * * * 6,0
```

### **Multiple Scrapers**

```bash
# Jalankan scraper berbeda untuk data berbeda
*/10 * * * * /path/to/scraper-duga-air.sh
*/12 * * * * /path/to/scraper-curah-hujan.sh
*/15 * * * * /path/to/scraper-klimatologi.sh
```

### **Conditional Execution**

```bash
# Jalankan hanya jika internet tersedia
*/10 * * * * ping -c 1 google.com && /path/to/scraper.sh

# Skip jika CPU usage tinggi
*/10 * * * * cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}'); [ "${cpu_usage%.*}" -lt 80 ] && /path/to/scraper.sh
```

## 📈 **Production Deployment**

### **Environment Variables**

```bash
# .env file
SCRAPER_INTERVAL=10
SCRAPER_TIMEOUT=300
NODE_ENV=production
SCRAPER_DATA_DIR=./data
```

### **Health Checks**

```bash
# Add to crontab - health check setiap jam
0 * * * * curl -f http://localhost:3000/api/scraper || echo "Scraper API down"
```

### **Backup Strategy**

```bash
# Backup data setiap hari jam 2 pagi
0 2 * * * tar -czf backup-$(date +\%Y\%m\%d).tar.gz scraper/data/
```

## 🎯 **Recommended Setup**

### **Development:**

```bash
# Gunakan built-in cron (Option 1)
cd scraper && npm run service
```

### **Production Linux/Mac:**

```bash
# Gunakan crontab (Option 3)
crontab -e
# Add: */10 * * * * cd /path/to/scraper && timeout 300s node index.js >> scraper-cron.log 2>&1
```

### **Production Windows:**

```bash
# Gunakan Task Scheduler (Option 2)
# Setup via taskschd.msc dengan scraper-task.bat
```

### **Docker Production:**

```bash
# Gunakan Docker cron (Option 5)
docker build -t bws-scraper .
docker run -d bws-scraper
```

---

## 🎉 **Quick Setup Commands**

### **Linux/Mac (Fast Setup):**

```bash
# Edit crontab
crontab -e

# Add this line (ubah path sesuai project Anda):
*/10 * * * * cd /home/user/projects/curah-hujan/scraper && timeout 300s node index.js >> scraper-cron.log 2>&1

# Verify
crontab -l
```

### **Windows (Fast Setup):**

```batch
# Buat scraper-task.bat
@echo off
cd /d "D:\CODINGAN\fullstack\curah-hujan\scraper"
node index.js >> scraper-cron.log 2>&1

# Setup via Task Scheduler GUI
```

**Cron job auto-scraping setiap 10 menit siap digunakan!** ⏰🔄
