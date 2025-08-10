# Deploy Discord Bot lên Vercel

## 📋 Tổng quan

Discord Bot được deploy lên Vercel dưới dạng API endpoints thay vì bot chạy liên tục. Điều này phù hợp với mô hình serverless của Vercel.

## 🚀 API Endpoints

### 1. **Health Check**
```
GET /api/health
```
Kiểm tra trạng thái của bot và database connection.

### 2. **Smart Sync**
```
POST /api/sync
Content-Type: application/json

{
  "forceFull": false
}
```
Chạy smart sync để đồng bộ dữ liệu từ Discord.

### 3. **Update Ranks**
```
POST /api/update-ranks
```
Cập nhật thread_rank cho tất cả threads.

## 🔧 Cấu hình Environment Variables

Trong Vercel Dashboard, thêm các environment variables:

### Database
- `MYSQL_HOST` - Host của MySQL database
- `MYSQL_PORT` - Port của MySQL (mặc định: 3306)
- `MYSQL_USER` - Username của MySQL
- `MYSQL_PASSWORD` - Password của MySQL
- `MYSQL_DATABASE` - Tên database

### Discord
- `DISCORD_TOKEN` - Bot token từ Discord Developer Portal
- `DISCORD_GUILD_ID` - ID của Discord server (optional)

## 📦 Deploy

### Bước 1: Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Login vào Vercel
```bash
vercel login
```

### Bước 3: Deploy
```bash
vercel --prod
```

## 🔄 Sử dụng API

### Chạy Smart Sync
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"forceFull": true}'
```

### Cập nhật Ranks
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/update-ranks
```

### Kiểm tra Health
```bash
curl https://your-vercel-domain.vercel.app/api/health
```

## ⚠️ Lưu ý quan trọng

1. **Timeout**: Vercel Functions có timeout tối đa 300s (5 phút)
2. **Cold Start**: Lần đầu gọi API có thể chậm do cold start
3. **Rate Limiting**: Discord API có rate limits
4. **Database Connection**: Đảm bảo database có thể truy cập từ Vercel

## 🔧 Cron Jobs (Tùy chọn)

Có thể sử dụng Vercel Cron Jobs để tự động chạy sync:

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

## 📊 Monitoring

- Sử dụng Vercel Analytics để theo dõi performance
- Kiểm tra logs trong Vercel Dashboard
- Monitor database connections và Discord API calls

## 🆘 Troubleshooting

### Lỗi thường gặp:

1. **Database Connection Failed**
   - Kiểm tra environment variables
   - Đảm bảo database có thể truy cập từ internet

2. **Discord Token Invalid**
   - Kiểm tra DISCORD_TOKEN
   - Đảm bảo bot có đủ permissions

3. **Timeout Error**
   - Giảm số lượng data sync
   - Sử dụng forceFull: false cho delta sync

4. **Memory Limit**
   - Tối ưu hóa queries
   - Giảm batch size
