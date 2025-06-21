# WriteSense Frontend - Quản lý tài liệu bằng giọng nói

Ứng dụng frontend cho WriteSense Agent - hệ thống quản lý tài liệu thông minh với khả năng nhận diện giọng nói và AI assistant.

## 🚀 Tính năng chính

### 📝 Quản lý tài liệu
- Tạo, chỉnh sửa, xóa tài liệu
- Tìm kiếm nhanh theo tiêu đề và nội dung
- Xem lịch sử chỉnh sửa

### 🎤 Điều khiển giọng nói
- Nhận diện giọng nói tiếng Việt
- Các lệnh giọng nói được hỗ trợ:
  - "Tạo tài liệu mới"
  - "Tìm kiếm [từ khóa]"
  - "Chỉnh sửa tài liệu"
  - "Đọc tài liệu"
  - "Xóa tài liệu"

### 🔊 Phản hồi giọng nói
- Text-to-Speech tiếng Việt
- Tự động đọc phản hồi từ AI Agent
- Điều khiển phát/tạm dừng

### 🤖 Tích hợp AI Agent
- Kết nối với WriteSense Agent (LangGraph)
- Streaming response từ AI
- Xử lý lệnh phức tạp thông qua agent

## 🛠️ Công nghệ sử dụng

- **Framework**: Next.js 15 với App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Speech APIs**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **State Management**: React Hooks

## 📋 Yêu cầu hệ thống

### Backend
- WriteSense Agent đang chạy tại `http://localhost:8123`
- API endpoints có sẵn theo OpenAPI schema

### Browser
- Hỗ trợ Web Speech API:
  - Chrome/Chromium (khuyến nghị)
  - Edge
  - Safari (có hạn chế)
- Microphone access

### Node.js
- Node.js 18+ 
- npm hoặc yarn

## 🚀 Cài đặt và chạy

### 1. Clone và cài đặt dependencies
```bash
cd write-sense-front-end
npm install
```

### 2. Cấu hình environment (tùy chọn)
```bash
# Tạo .env.local nếu cần custom API URL
echo "NEXT_PUBLIC_AGENT_API_URL=http://localhost:8123" > .env.local
```

### 3. Chạy development server
```bash
npm run dev
```

### 4. Mở ứng dụng
Truy cập: http://localhost:3000

## 📱 Cách sử dụng

### 🎤 Chế độ tương tác liên tục (MVP)

Ứng dụng hoạt động trong chế độ tương tác liên tục để tạo trải nghiệm mượt mà:

1. **Tự động bắt đầu**: Khi mở trang web, ứng dụng tự động tạo tài liệu mới và bắt đầu nghe
2. **Nói tự nhiên**: Bạn có thể nói bất kỳ lúc nào - lệnh hoặc nội dung
3. **Phát hiện im lặng**: Sau 5 giây im lặng, ứng dụng xử lý lệnh
4. **Hành động tự động**: Agent thực hiện hành động (viết, chỉnh sửa, xóa) và phản hồi bằng giọng nói
5. **Tiếp tục nghe**: Sau khi xử lý xong, ứng dụng tự động tiếp tục nghe

### Luồng làm việc điển hình
```
1. Mở trang web → Tự động tạo "Tài liệu mới" và bắt đầu nghe
2. Nói: "Viết báo cáo hôm nay" → Agent thêm nội dung vào tài liệu
3. Dừng 5 giây → Agent phản hồi: "Đã thêm nội dung..."
4. Nói: "Thêm phần kết luận" → Agent tiếp tục thêm
5. Quá trình lặp lại liên tục...
```

### Khởi động
1. Đảm bảo WriteSense Agent đang chạy
2. Mở ứng dụng frontend: http://localhost:3001
3. **QUAN TRỌNG**: Khi trình duyệt hỏi quyền microphone, nhấn **"Cho phép"**
4. Nếu từ chối quyền, nhấn nút "Làm mới trang" và thử lại
5. Bắt đầu nói ngay - không cần nhấn nút!

### ⚠️ Xử lý lỗi quyền microphone
- **Lỗi "not-allowed"**: Bạn đã từ chối quyền microphone
- **Giải pháp**: Nhấn nút "Làm mới trang" hoặc F5, sau đó nhấn "Cho phép" khi được hỏi
- **Chrome**: Có thể nhấn vào biểu tượng 🔒 bên trái URL để thay đổi quyền

### Ví dụ lệnh giọng nói
```
"Tạo tài liệu mới về kế hoạch marketing"
"Tìm kiếm tài liệu có từ khóa báo cáo"
"Chỉnh sửa tài liệu hiện tại"
"Đọc nội dung tài liệu này"
"Xóa tài liệu đã chọn"
```

### Quản lý tài liệu thủ công
- Sử dụng sidebar để duyệt danh sách tài liệu
- Click vào tài liệu để xem/chỉnh sửa
- Sử dụng ô tìm kiếm để lọc tài liệu

## 🔧 Cấu trúc project

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── VoiceController.tsx
│   ├── DocumentManager.tsx
│   └── DocumentEditor.tsx
├── hooks/                 # Custom hooks
│   ├── useSpeechRecognition.ts
│   └── useTextToSpeech.ts
├── services/              # API services
│   └── agentApi.ts
└── types/                 # TypeScript types
    └── index.ts
```

## 🔌 API Integration

### Agent API Endpoints
- `POST /assistants/search` - Lấy danh sách assistants
- `POST /threads` - Tạo thread conversation
- `POST /threads/{id}/runs/stream` - Streaming run
- `GET /threads/{id}/state` - Lấy trạng thái thread

### Request Format
```typescript
{
  assistant_id: string,
  input: {
    message: string,
    context: {
      current_document?: string,
      documents: Array<{id: string, title: string}>,
      action: 'voice_command'
    }
  },
  stream_mode: 'values'
}
```

## 🎯 Lệnh giọng nói được hỗ trợ

| Lệnh | Mô tả | Ví dụ |
|------|-------|--------|
| Tạo tài liệu | Tạo tài liệu mới | "Tạo tài liệu mới", "Tạo tài liệu về..." |
| Tìm kiếm | Tìm kiếm tài liệu | "Tìm kiếm báo cáo", "Tìm tài liệu về marketing" |
| Chỉnh sửa | Mở chế độ chỉnh sửa | "Chỉnh sửa tài liệu", "Sửa tài liệu hiện tại" |
| Đọc | Xem và đọc tài liệu | "Đọc tài liệu này", "Xem nội dung" |
| Xóa | Xóa tài liệu | "Xóa tài liệu", "Xóa file này" |

## 🔊 Cấu hình âm thanh

### Speech Recognition
- Ngôn ngữ: Tiếng Việt (vi-VN)
- Chế độ: Continuous listening
- Interim results: Enabled

### Text-to-Speech
- Ngôn ngữ: Tiếng Việt (vi-VN)
- Tốc độ: 1.0 (có thể điều chỉnh)
- Âm lượng: 1.0 (có thể điều chỉnh)

## 🐛 Troubleshooting

### Lỗi kết nối Agent
```
Error: Failed to connect to agent at http://localhost:8123
```
**Giải pháp**: Đảm bảo WriteSense Agent đang chạy và accessible

### Lỗi microphone
```
Error: Trình duyệt không hỗ trợ Web Speech API
```
**Giải pháp**: 
- Sử dụng Chrome/Chromium
- Cấp quyền microphone
- Sử dụng HTTPS (production)

### Lỗi CORS
```
Error: CORS policy blocks request
```
**Giải pháp**: Cấu hình CORS trong WriteSense Agent hoặc sử dụng proxy

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker (tùy chọn)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 License

MIT License - xem file LICENSE để biết chi tiết.

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/write-sense-front-end/issues)
- Documentation: [Wiki](https://github.com/your-repo/write-sense-front-end/wiki)
- Email: support@writesense.com
