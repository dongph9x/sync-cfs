# 🚀 Hướng dẫn Deploy toàn bộ hệ thống lên Vercel

## 📋 Tổng quan

Hệ thống bao gồm 2 phần chính:
1. **Web App** (`web-app/`) - Astro website với React components
2. **Discord Bot** (`discord-bot/`) - API endpoints cho sync data

## 🎯 Chiến lược Deploy

### Web App
- **Framework**: Astro với `output: 'server'`
- **Adapter**: `@astrojs/vercel`
- **Type**: Full-stack web application

### Discord Bot  
- **Framework**: Node.js API Functions
- **Type**: Serverless API endpoints
- **Purpose**: Sync data từ Discord về database

## 📦 Deploy Web App

### Bước 1: Chuẩn bị
```bash
cd web-app
npm install
npm run build  # Test build locally
```

### Bước 2: Deploy
```bash
vercel --prod
```

### Bước 3: Cấu hình Environment Variables
Trong Vercel Dashboard → Settings → Environment Variables:

```
MYSQL_HOST=your-database-host
MYSQL_USER=your-database-user  
MYSQL_PASSWORD=your-database-password
MYSQL_DATABASE=your-database-name
```

## 🤖 Deploy Discord Bot

### Bước 1: Chuẩn bị
```bash
cd discord-bot
npm install
npm run build  # Build TypeScript
npm run test-api  # Test API locally (optional)
```

### Bước 2: Deploy
```bash
vercel --prod
```

### Bước 3: Cấu hình Environment Variables
```
# Database
MYSQL_HOST=your-database-host
MYSQL_USER=your-database-user
MYSQL_PASSWORD=your-database-password
MYSQL_DATABASE=your-database-name

# Discord
DISCORD_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-server-id
```

## 🔗 API Endpoints

### Discord Bot APIs
```
GET  /api/health          # Health check
POST /api/sync           # Smart sync từ Discord
POST /api/update-ranks   # Cập nhật thread ranks
```

### Web App APIs
```
POST /api/update-ranks   # Update ranks từ frontend
```

## 🔄 Workflow hoạt động

### 1. Manual Sync
```bash
# Sync từ Discord
curl -X POST https://discord-bot-domain.vercel.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"forceFull": true}'

# Update ranks
curl -X POST https://discord-bot-domain.vercel.app/api/update-ranks
```

### 2. Automated Sync (Cron Jobs)
Thêm vào `vercel.json` của discord-bot:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 3. Frontend Integration
Web app có thể gọi API để update ranks:

```javascript
// Trong TreeView component
await fetch('/api/update-ranks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rankUpdates })
});
```

## 📊 Monitoring

### Web App
- Vercel Analytics
- Build logs
- Function logs

### Discord Bot  
- API response times
- Error rates
- Database connection status

## 🔧 Troubleshooting

### Web App Issues
1. **Build Failed**
   - Kiểm tra TypeScript errors
   - Đảm bảo tất cả dependencies installed

2. **API Routes Not Working**
   - Kiểm tra `output: 'server'` trong `astro.config.mjs`
   - Đảm bảo `@astrojs/vercel` adapter installed

### Discord Bot Issues
1. **Database Connection Failed**
   - Kiểm tra environment variables
   - Đảm bảo database accessible từ internet

2. **Discord API Errors**
   - Kiểm tra bot token
   - Đảm bảo bot có đủ permissions

3. **Timeout Errors**
   - Giảm data sync size
   - Sử dụng delta sync thay vì full sync

## 🎯 Best Practices

### Performance
- Sử dụng delta sync thay vì full sync khi có thể
- Implement pagination cho large datasets
- Cache frequently accessed data

### Security
- Sử dụng environment variables cho sensitive data
- Implement rate limiting
- Validate input data

### Reliability
- Implement retry logic
- Monitor error rates
- Set up alerts cho critical failures

## 📈 Scaling

### Web App
- Astro tự động optimize cho performance
- Vercel edge functions cho global distribution
- CDN cho static assets

### Discord Bot
- Serverless functions scale automatically
- Database connection pooling
- Rate limiting để tránh Discord API limits

## 🔄 Maintenance

### Regular Tasks
1. Monitor logs cho errors
2. Check database performance
3. Update dependencies
4. Review Discord API usage

### Updates
1. Test locally trước khi deploy
2. Deploy to staging environment
3. Monitor production sau khi deploy
4. Rollback nếu có issues

## 📞 Support

- Vercel Documentation: https://vercel.com/docs
- Astro Documentation: https://docs.astro.build
- Discord.js Documentation: https://discord.js.org
