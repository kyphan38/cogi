# PLAN-calm-layout: cogi theo phong cách hodi/legi

Nguồn luật: `../DESIGN.md`, phần "Layout: calm and text-first" và "Show on hover"
(viết ngày 2026-10-13). Màu đã xám từ 2026-10-05, plan này chỉ đổi **bố cục**.

## Bất biến

- Giữ 4 chấm màu `--semantic-*` của Geopolitics.
- Giữ khung cho công cụ: `EvaluativeMatrixBoard`, `PayoffMatrix`, `SystemsFlowCanvas`,
  bản đồ Geo, các ô chọn level (là vùng bấm).
- Không đổi chữ, luồng bài tập hay dữ liệu. Chỉ đổi khung, nút, khoảng cách.
- Mỗi phase: xem ở 1280px và 390px, sáng và tối, chạy `test:unit`, rồi commit.
- Handbook: chỉ cập nhật khi chữ trong UI đổi (ví dụ chỗ của Sign out).

## Phase

| Phase | Nội dung | Trạng thái |
|---|---|---|
| C1 | Nav bằng chữ (`practice · history · handbook · settings`), Sign out vào Settings; `--radius` nhỏ lại; bỏ `shadow-*`; chip `rounded-full` thành `rounded-md`; route fade nhẹ hơn | xong 2026-10-13 |
| C2 | Home, History, Settings (Settings đã làm cùng C1): bỏ card bọc ngoài, dùng tiêu đề nhỏ + khoảng trắng + hàng có đường kẻ mảnh | xong 2026-10-13 |
| C3 | Khung bài tập (`ExerciseShell`, `ExerciseStepCard`): bước 1-2-3 thành chữ, bỏ card trong card. Thêm: `Card` mặc định `plain` (không khung, `variant="boxed"` cho ô chọn chủ đề); nút `secondary` thành chữ; chọn "Suggested topics / Type your own" bằng chữ (`WordChoice`) | xong 2026-10-13 |
| C4 | Answer key, AI feedback, Deep dive, Finish card: khung ngoài đã mất nhờ `Card plain`; đoạn văn để đọc có vạch trái mảnh; hộp thông tin (`Stat`, trap card, Options, check questions...) chỉ còn đường kẻ trên; `Alert` thành vạch trái; giữ hộp cho ô bấm chọn | xong 2026-10-13 |
| C5 | Geo Lab, Tracks, Simulators, Terms, Handbook, trang New exercise (`/reasoning`): đã hết khung nhờ `Card plain`; còn khoảng cách giữa các phần, nút tô nền ở Geo thành chữ, nút chọn kiểu "segmented" | |
| C6 | "Show on hover" cho thao tác ít dùng (ví dụ xoá ở History) + cách dùng trên điện thoại; kiểm tra cuối, e2e | |

## Để sau

- Thanh nav mờ khi đang gõ (như hodi `TopBar`).
