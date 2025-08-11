# Discord Bot Scheduled Worker

Worker tự động chạy sync data mỗi giờ để đồng bộ dữ liệu từ Discord vào database.

## 🚀 Tính năng

- **Tự động sync**: Chạy mỗi giờ một lần
- **Delta sync**: Chỉ sync dữ liệu mới (không force full sync)
- **Update ranks**: Tự động cập nhật thread_rank sau mỗi lần sync
- **Logging**: Ghi log chi tiết quá trình sync
- **Error handling**: Xử lý lỗi và tiếp tục chạy

## ⚙️ Cấu hình

### Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# Bật scheduled worker
ENABLE_SCHEDULED_SYNC=true

# Chế độ chạy (watch = chạy liên tục, once = chạy một lần)
RUN_MODE=watch

# Bật historical sync ban đầu
ENABLE_HISTORICAL_SYNC=true

# Database configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=forum

# Discord configuration
DISCORD_TOKEN=your_discord_token
DISCORD_GUILD_ID=your_guild_id
```

## 🏃‍♂️ Cách sử dụng

### 1. Chạy bot với worker

```bash
# Build project
npm run build

# Chạy bot với worker
npm start
```

### 2. Test worker

```bash
# Test worker một lần
npm run test-worker
```

### 3. Chạy development mode

```bash
# Chạy với nodemon (tự động restart khi có thay đổi)
npm run dev
```

## 📋 Lịch trình

- **Initial sync**: Chạy sau 5 phút khi bot khởi động
- **Recurring sync**: Chạy mỗi giờ một lần
- **Sync type**: Delta sync (chỉ sync dữ liệu mới)
- **Rank update**: Tự động cập nhật thread_rank sau mỗi lần sync

## 📊 Log Output

Worker sẽ ghi log chi tiết:

```
🕐 Starting scheduled worker - sync every 60 minutes
✅ Scheduled worker started successfully
🔄 Running initial scheduled sync...
🚀 Starting scheduled sync...
🔄 Updating thread_ranks after sync...
📝 Processing channel: General (general)
Found 150 threads in channel
🔄 Updating thread_ranks based on created_at order (newest first):
  1. "Thread title" - Thread Rank: 5 → 1 (Created: 2024-01-15 10:30:00)
  2. "Another thread" - Thread Rank: 3 → 2 (Created: 2024-01-15 09:15:00)
✅ Updated thread_ranks for 150 threads in channel General
🎉 All thread_ranks updated successfully!
📊 Final statistics:
  Total threads: 1500
  Threads without rank: 0
  Threads with rank: 1500
  Rank range: 1 - 150
✅ Scheduled sync completed successfully!
```

## 🔧 Tùy chỉnh

### Thay đổi interval

Để thay đổi thời gian chạy, sửa trong file `src/lib/worker.ts`:

```typescript
// Thay đổi từ 1 giờ thành 30 phút
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
```

### Thay đổi sync type

Để chạy full sync thay vì delta sync, sửa trong file `src/lib/worker.ts`:

```typescript
// Thay đổi từ delta sync thành full sync
await smartSync(client, { forceFull: true });
```

## 🚨 Troubleshooting

### Worker không chạy

1. Kiểm tra `ENABLE_SCHEDULED_SYNC=true` trong `.env`
2. Kiểm tra `RUN_MODE=watch` trong `.env`
3. Kiểm tra logs để xem lỗi

### Sync thất bại

1. Kiểm tra kết nối database
2. Kiểm tra Discord token
3. Kiểm tra quyền bot trong Discord server

### Rank update thất bại

1. Kiểm tra cấu trúc bảng `threads` trong database
2. Kiểm tra quyền UPDATE trên database
3. Kiểm tra logs để xem lỗi cụ thể

## 📝 Monitoring

Worker tự động ghi log vào console và file log. Có thể monitor:

- Thời gian chạy sync
- Số lượng threads được xử lý
- Lỗi nếu có
- Thống kê rank update

## 🔄 Restart Worker

Để restart worker:

1. Dừng bot: `Ctrl+C`
2. Chạy lại: `npm start`

Worker sẽ tự động khởi động lại với lịch trình mới.
