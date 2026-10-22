# Backend Cloudflare cho ViLa Chess

Backend này phục vụ tài khoản cộng đồng và ghép trận xếp hạng ngẫu nhiên qua **Cloudflare Worker + Durable Object SQLite**. Ứng dụng đã đóng gói sẵn địa chỉ `https://bitter-sun-751a.nene09821z.workers.dev`; người chơi không nhập URL Worker, API key hay mã phòng.

## Cấu hình đã chốt

- Worker name: `bitter-sun-751a`.
- URL app sử dụng: `https://bitter-sun-751a.nene09821z.workers.dev`.
- Health check: `/api/health` và `/api/social/health`.
- API cộng đồng: `/api/social/*`.
- Kho lưu trữ: Durable Object `ChessState`, mỗi tài khoản/trận/bản ghi lịch sử được lưu thành dòng SQLite riêng.
- Server xác thực phiên đăng nhập, nước đi, lượt đi, đồng hồ, kết quả và Elo. Worker không lưu nguyên cả cơ sở dữ liệu vào một tệp trên hệ thống tệp cục bộ.

## Triển khai một lần qua giao diện Cloudflare (không cần Termux)

Điều kiện: source có thư mục `cloudflare/` đã được đẩy lên repository GitHub/GitLab. Chỉ triển khai vào Worker `bitter-sun-751a` nếu chắc chắn script cũ của Worker không cần giữ lại; deploy sẽ thay mã Worker đang chạy.

1. Cloudflare Dashboard → **Workers & Pages** → chọn Worker `bitter-sun-751a`.
2. Vào **Settings → Builds → Connect**, rồi kết nối repository chứa source. Cloudflare xác nhận Workers Builds có thể kết nối Worker hiện có với repository và triển khai khi có commit mới: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
3. Chọn đúng repository/branch; đặt **Root directory** là `cloudflare`. Tên Worker ở `cloudflare/wrangler.toml` phải khớp `bitter-sun-751a`.
4. Đặt **Deploy command** thành `npm run deploy`. Nếu form yêu cầu **Build command**, đặt `npm install`; nếu Cloudflare đã tự cài dependencies thì có thể để trống build command.
5. Lưu cấu hình và push/commit source để chạy build. Chỉ coi deploy thành công khi tab Deployments báo thành công.

Nếu chưa có source trên GitHub, cần tải ZIP source app rồi đưa toàn bộ nội dung project lên repository, giữ thư mục `cloudflare/` ngay dưới root. Không upload mật khẩu, token phiên, Cloudflare API token hoặc secret quản trị vào Git.

### Tùy chọn CLI (không dùng khi làm trên điện thoại)

Ở máy tính đã cài Node.js:

```sh
cd cloudflare
npm install
npx wrangler login
npm run deploy
```

Không cần giữ máy tính hoặc điện thoại bật sau khi Worker đã triển khai thành công.

## Kiểm tra bắt buộc sau khi deploy

1. Mở `https://bitter-sun-751a.nene09821z.workers.dev/api/health`; phải trả JSON có `ok: true`.
2. Mở `https://bitter-sun-751a.nene09821z.workers.dev/api/social/health`; phải trả `status: "online"` và `service: "Cờ Vua ViLa social"`.
3. Kiểm thử trên hai thiết bị và hai mạng riêng: tạo hai tài khoản thử, chọn cùng mốc thời gian, nhấn tìm đối thủ gần nhau; cả hai phải vào cùng trận, màu khác nhau.
4. Kiểm tra nước sai lượt/sai luật bị từ chối, nước hợp lệ cập nhật ở cả hai máy, hủy hàng chờ, đầu hàng, hết giờ, cập nhật Elo một lần và dữ liệu vẫn còn sau khi mở lại app.

## Giới hạn được ghi rõ

- Backend này chưa được triển khai vào tài khoản Cloudflare từ môi trường tạo ZIP, và chưa xác nhận ghép trận giữa hai thiết bị thật. Worker cũ ở trạng thái Active không đồng nghĩa đã chạy mã này.
- Khôi phục mật khẩu qua email trả `503` đến khi chủ dự án cấu hình và kiểm thử một nhà cung cấp email thật; không giả lập gửi email.
- Một Durable Object cộng đồng toàn cục tuần tự hóa hàng chờ, phù hợp thử nghiệm/ra mắt nhỏ; không phải cam kết tải lớn vô hạn.
- Nếu đổi Worker name hoặc subdomain, phải sửa `DEFAULT_BACKEND_URL` trong `src/settings-schema.js`, cập nhật test/docs và build lại app.
