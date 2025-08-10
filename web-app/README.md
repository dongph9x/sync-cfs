# Discord Forum Web App

Ứng dụng web hiển thị forum Discord với giao diện đẹp và chức năng TreeView cho việc sắp xếp threads.

## 🚀 Deploy lên Vercel

### Bước 1: Chuẩn bị

1. **Fork hoặc Clone repository này**
2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

### Bước 2: Cấu hình Environment Variables

Trong Vercel Dashboard, thêm các environment variables sau:

```
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-mysql-database
```

### Bước 3: Deploy

1. **Kết nối repository với Vercel:**
   - Vào [vercel.com](https://vercel.com)
   - Import project từ GitHub/GitLab
   - Chọn repository này

2. **Cấu hình build:**
   - **Framework Preset:** Astro
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

3. **Deploy:**
   - Click "Deploy"
   - Vercel sẽ tự động build và deploy

### Bước 4: Cấu hình Domain (Tùy chọn)

1. Trong Vercel Dashboard, vào project settings
2. Thêm custom domain nếu muốn
3. Cập nhật `site` trong `astro.config.mjs` với domain mới

## 🛠️ Tính năng

- ✅ **TreeView với Drag & Drop:** Sắp xếp threads bằng kéo thả
- ✅ **Search & Filter:** Tìm kiếm và lọc threads
- ✅ **Responsive Design:** Giao diện đẹp trên mọi thiết bị
- ✅ **Vietnamese UI:** Giao diện tiếng Việt
- ✅ **Real-time Updates:** Cập nhật rank thời gian thực

## 📁 Cấu trúc Project

```
web-app/
├── src/
│   ├── components/
│   │   ├── TreeView.tsx          # Component TreeView chính
│   │   ├── SearchBox.astro       # Component search
│   │   └── ...
│   ├── pages/
│   │   ├── confessions.astro     # Trang confessions
│   │   ├── forum/               # Trang forum
│   │   └── ...
│   └── lib/
│       └── db.ts                # Database functions
├── api/
│   └── update-ranks.js          # Vercel API route
├── astro.config.mjs             # Astro config
├── vercel.json                  # Vercel config
└── package.json
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 API Endpoints

- `POST /api/update-ranks` - Cập nhật rank của threads

## 📝 Lưu ý

- Đảm bảo MySQL database đã được cấu hình đúng
- Cần có quyền truy cập database từ Vercel
- API routes chỉ hoạt động trên Vercel (không hoạt động với static build local)

## 🐛 Troubleshooting

### Lỗi Build
- Kiểm tra environment variables
- Đảm bảo database có thể truy cập từ Vercel
- Kiểm tra logs trong Vercel Dashboard

### Lỗi Database
- Kiểm tra connection string
- Đảm bảo database user có quyền UPDATE
- Kiểm tra firewall settings

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Vercel build logs
2. Database connection
3. Environment variables
4. API endpoint logs