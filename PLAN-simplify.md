# Plan: đơn giản hoá cogi

Viết ngày 2026-10-02, dựa trên review cùng ngày (code, dữ liệu thật, ảnh chụp app).
Chủ app đồng ý theo hướng đề xuất. Mỗi phase một branch, mỗi mục một commit. Cuối
mỗi phase: chạy `tsc`, `eslint`, `vitest`, các spec Playwright liên quan, build
production trong một git worktree riêng (dùng `cp -cR` cho `node_modules`, vì
Turbopack không chấp nhận symlink), chụp màn hình desktop + mobile, rồi hỏi trước
khi merge và push.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Vì sao

| Số liệu (Firestore thật, 2026-10-02) | Giá trị |
|---|---|
| Bài đã tạo | 9 (7 bài ngày 27/04, rồi 02/08, 08/08) |
| Bài làm xong | **1/9** |
| Loại bài đã dùng | Evaluative 4, Systems 3, Sequential 1, Analytical 1; Generative, Combo, Math: 0 |
| Collection | 14, chỉ 8 có dữ liệu, đa số 1 doc |

Mỗi bài có 7 bước (Setup, Highlight & tag, Confidence, AI perspective, Journal,
Action, Done). Dashboard có 9 khung, phần lớn trống. Menu có 7 mục.

## Chốt phạm vi

- **Giữ:** Evaluative, Systems, Analytical. History, Settings.
- **Ẩn khỏi UI (chưa xoá code):** Generative, Sequential, Combo, Geopolitics
  progression, Math, Decisions, Guide, Dashboard, Weekly review, Delayed recall,
  Journal, Action, Perspective disagreements, Calibration, Patterns.
- **Vòng lặp mới (3 bước):** Chọn chủ đề → Làm bài → Phản hồi AI. Confidence (không
  bắt buộc) nằm trong bước Làm bài. Một ô "Điều rút ra" (không bắt buộc) ở cuối,
  thay cho Journal + Action.
- **Menu:** Practice · History · Settings.
- Dữ liệu cũ giữ nguyên; bài thuộc loại bị ẩn vẫn xem được trong History.

---

## Phase 1 - Gọn menu, Home, các thẻ chọn bài (ít rủi ro, không đổi logic)

- **P1.1** `components/shell/AppTopNav.tsx`: chỉ còn Practice (`/`), History,
  Settings. Trên điện thoại menu nằm một dòng.
- **P1.2** Home (`components/dashboard/HomeContent.tsx`, `reasoning/page.tsx`):
  một nút chính **New exercise**, khối **Continue** (bài dở), và 5 bài gần đây
  (giống màn Welcome của noda). Bỏ hai nút Reasoning / Math.
- **P1.3** Thẻ chọn loại bài (`lib/exercise/exercise-mode-cards.ts`,
  `ExercisePickerCard`): chỉ còn 3 loại giữ lại. Route của loại bị ẩn (ví dụ
  `/exercise/generative`, `/exercise/combo`, `/math`) vẫn mở được bằng link trực
  tiếp, chỉ không còn đường vào từ UI.
- **P1.4** Lỗi AI hiển thị câu dễ hiểu ("Không tải được gợi ý, thử lại"), không hiện
  nguyên lỗi kỹ thuật ("Missing auth token"); chi tiết chỉ ghi vào console.
- Kiểm tra: ảnh chụp Home, menu desktop/mobile; spec Playwright về layout và
  navigation.

## Phase 2 - Vòng lặp 3 bước với một khung chung (thay đổi chính)

Hiện 6 file `*ExerciseFlow.tsx` dài 1.300-1.800 dòng, lặp lại các bước Confidence,
AI perspective, Journal, Action.

- **P2.1** Tạo `ExerciseFlowShell` dùng chung: thanh 3 bước, chọn chủ đề (dùng lại
  `DomainInput`), gọi AI tạo bài, bước Phản hồi AI (dùng lại `AIPerspective`), ô
  "Điều rút ra", lưu bài. Mỗi loại bài chỉ cung cấp phần "Làm bài" và cách đóng gói
  câu trả lời gửi AI.
- **P2.2** Lưu khi xong: chỉ ghi doc `exercises` (thêm field `confidence?`,
  `takeaway?`). Không ghi `journalEntries`, `actions`, `confidenceRecords`,
  `delayedRecallQueue`, `weaknesses` nữa. Giữ `practicedTopics` (dùng cho gợi ý chủ
  đề). `[QUYẾT ĐỊNH]` có giữ Confidence không, hay bỏ hẳn.
- **P2.3** Chuyển từng loại sang khung mới, theo thứ tự dùng nhiều nhất:
  Evaluative → Systems → Analytical. Mỗi loại một commit, kèm cập nhật test.
  `[QUYẾT ĐỊNH]` Analytical có 2 biến thể (Steelman, dán văn thật): giữ cả hai hay
  chỉ một.
- **P2.4** 8 bài dở theo kiểu 7 bước: `[QUYẾT ĐỊNH]` mở tiếp bằng khung mới (bỏ qua
  các bước đã bỏ), hay chỉ hiện trong History là "bài cũ".
- **P2.5** Lưu tiến độ trong lúc làm, để mở lại đúng chỗ (bài học từ noda F1: không
  ghi đè khi chuyển bài, lưu ngay những thay đổi đang chờ trước khi rời trang).
- Kiểm tra: test cho shell (unit + Playwright 3 loại), đo số dòng trước/sau, thử
  làm hết một bài mỗi loại trong browser.

## Phase 3 - Home thay Dashboard; History gọn

- **P3.1** Bỏ trang Dashboard khỏi luồng chính. Số liệu còn ý nghĩa (số bài đã xong,
  chuỗi ngày học) chuyển lên Home dưới dạng một dòng nhỏ.
- **P3.2** History (`exercise/history/page.tsx`, 1.123 dòng): danh sách bài + xem
  lại phản hồi AI và "Điều rút ra". Bỏ các phần chỉ phục vụ tính năng đã ẩn.
- **P3.3** Settings: bỏ mục Geopolitics progression, Adaptive difficulty và các tuỳ
  chọn của tính năng đã ẩn. Giữ Personal context, Keyboard, Backup.

## Phase 4 - Lớp AI

- **P4.1** Đổi `@google/generative-ai` (ngừng hỗ trợ từ 31/08/2025) sang
  `@google/genai`, như noda A3.
- **P4.2** Dùng `responseSchema` cho 3 loại bài giữ lại, kèm một hàm normalize
  (như noda), thay cho validate tay.
- **P4.3** Một hàm dùng chung "gọi AI → validate → retry 1 lần" thay cho 6 khối lặp
  trong `api/ai/route.ts`.
- Kiểm tra: gọi Gemini thật 1 lần cho mỗi loại; test timeout.

## Phase 5 - Dọn code và dữ liệu

- **P5.1** `[QUYẾT ĐỊNH]` Xoá hẳn code của các tính năng đã ẩn (flow, route API,
  prompt, validator, trang), hay giữ thêm một thời gian. Đề xuất: dùng bản gọn vài
  tuần rồi mới xoá.
- **P5.2** Truy vấn có `where` / `orderBy` / `limit` thay cho tải cả collection; xoá
  một bài bằng truy vấn theo `exerciseId`.
- **P5.3** Xoá code chết: `lib/ai/provider.ts` (stub), `lib/ai/claude.ts` (không
  được import).
- **P5.4** Sửa 33 lỗi type trong file test và 3 lỗi lint, để `tsc` sạch.
- **P5.5** Gỡ collection không dùng khỏi `firestore.rules` (cần deploy rules; hỏi
  trước).

---

## Thứ tự

1. Phase 1 (nhanh, thấy ngay khác biệt)
2. Phase 2 (lớn nhất, nhiều quyết định)
3. Phase 3
4. Phase 4
5. Phase 5
