# Sổ thu chi — Frontend

Giao diện cho ứng dụng thống kê thu chi cá nhân: tổng quan, giao dịch, nợ, người, công
việc, danh mục.

**Vite · React 19 · TypeScript · Tailwind 4 · TanStack Query · Recharts**

Backend: [Be-money](https://github.com/nghiate142/Be-money) — phải chạy trước.

---

## Chạy lần đầu

```bash
npm install
cp .env.example .env
npm run dev
```

Mở http://localhost:5173 và đăng nhập bằng tài khoản đã đặt ở backend.

## Deploy bằng Docker

Repo này có sẵn [Dockerfile](Dockerfile) và [nginx.conf](nginx.conf), nhưng **không chạy
riêng lẻ** — nó được `docker-compose.yml` bên [Be-money](https://github.com/nghiate142/Be-money)
build kèm. Xem hướng dẫn deploy ở README của repo đó.

Image gồm 2 tầng: build bằng Node rồi phục vụ `dist/` bằng nginx. nginx cũng proxy
`/api/` sang container backend, nên trình duyệt gọi API cùng origin — không cần biết
domain lúc build và không dính CORS.

## Deploy thủ công (không Docker)

```bash
npm ci
npm run build
```

`dist/` là site tĩnh, trỏ nginx/Caddy vào đó.

Đặt `VITE_API_URL` **trước khi build** — Vite nhúng biến này vào bundle lúc build, sửa
sau khi build không có tác dụng:

```bash
VITE_API_URL=https://api.money.example.com npm run build
```

Nếu web server proxy `/api` sang backend thì để `VITE_API_URL=/api`, gọn hơn và không
dính CORS.

App dùng client-side routing, nên web server phải fallback mọi đường dẫn về
`index.html`. Với nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Nếu frontend và backend khác origin, backend phải đặt `WEB_ORIGIN` đúng bằng origin của
site này, nếu không trình duyệt sẽ chặn vì CORS.

## Cấu trúc

```
src/
  lib/api.ts          axios instance + kiểu dữ liệu dùng chung
  lib/useFilters.ts   bộ lọc lưu trong URL
  components/         Layout, FilterBar và bộ UI dùng lại
  features/           mỗi tab một thư mục
```

- **Token** để trong `localStorage`; gặp 401 thì tự xoá và quay về màn đăng nhập.
- **Bộ lọc nằm trong URL** — reload giữ nguyên, copy link là chia sẻ được.
- **Màu theo vai trò** (`in` / `out` / `brand` / `warn`) khai báo ở `src/index.css`;
  đổi tông cả app chỉ cần sửa mấy dòng đó.
- Số tiền dùng `tabular-nums` để các cột thẳng hàng.

## Kiểm tra trước khi commit

```bash
npx tsc --noEmit -p tsconfig.app.json
```
