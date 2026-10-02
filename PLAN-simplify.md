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

## Phase 1 - Gọn menu, Home, các thẻ chọn bài (ít rủi ro, không đổi logic) - XONG

**Xong (2026-10-02)**, branch `simplify/phase-1`. E2E 169/169, unit 963/963, build đạt.

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

## Phase 2 - Vòng lặp 3 bước với một khung chung (thay đổi chính) - XONG

**Xong (2026-10-02)**, branch `simplify/phase-2`. Evaluative 1791→1524, Systems
1591→1273, Analytical 1378→1039 dòng. E2E 167 đạt (3 bỏ qua: Steelman), unit 967/967.

Hiện 6 file `*ExerciseFlow.tsx` dài 1.300-1.800 dòng, lặp lại các bước Confidence,
AI perspective, Journal, Action.

- **P2.1** Tạo `ExerciseFlowShell` dùng chung: thanh 3 bước, chọn chủ đề (dùng lại
  `DomainInput`), gọi AI tạo bài, bước Phản hồi AI (dùng lại `AIPerspective`), ô
  "Điều rút ra", lưu bài. Mỗi loại bài chỉ cung cấp phần "Làm bài" và cách đóng gói
  câu trả lời gửi AI.
- **P2.2** Lưu khi xong: chỉ ghi doc `exercises` (thêm field `confidence?`,
  `takeaway?`). Không ghi `journalEntries`, `actions`, `confidenceRecords`,
  `delayedRecallQueue`, `weaknesses` nữa. Giữ `practicedTopics` (dùng cho gợi ý chủ
  đề). Đã chọn (2026-10-02): giữ Confidence, gộp thành một thanh kéo trong bước Làm bài
  (API phản hồi AI cần `confidenceBefore`).
- **P2.3** Chuyển từng loại sang khung mới, theo thứ tự dùng nhiều nhất:
  Evaluative → Systems → Analytical. Mỗi loại một commit, kèm cập nhật test.
  Đã chọn: Analytical chỉ giữ Highlight & tag (ẩn Steelman); giữ 3 nguồn đề.
- **P2.4** 8 bài dở theo kiểu 7 bước. Đã chọn: mở tiếp bằng khung mới; bài đang ở
  Journal/Action nhảy tới bước Phản hồi AI.
- **P2.5** Lưu tiến độ trong lúc làm, để mở lại đúng chỗ (bài học từ noda F1: không
  ghi đè khi chuyển bài, lưu ngay những thay đổi đang chờ trước khi rời trang).
- Kiểm tra: test cho shell (unit + Playwright 3 loại), đo số dòng trước/sau, thử
  làm hết một bài mỗi loại trong browser.

## Phase 3 - Home thay Dashboard; History gọn - XONG

**Xong (2026-10-02)**, branch `simplify/phase-3`. History 1123→881, Settings 383→221
dòng. E2E 162 đạt (3 bỏ qua: Steelman), unit 972/972, build đạt.

- **P3.1** Bỏ trang Dashboard khỏi luồng chính. Số liệu còn ý nghĩa (số bài đã xong,
  chuỗi ngày học) chuyển lên Home dưới dạng một dòng nhỏ. Đăng nhập xong vào `/`
  thay vì `/dashboard`. Hàm tính chuỗi ngày tách ra `lib/exercise/streak.ts`.
- **P3.2** History (`exercise/history/page.tsx`, 1.123 dòng): danh sách bài + xem
  lại phản hồi AI và "Điều rút ra". Bỏ các phần chỉ phục vụ tính năng đã ẩn.
  Đã bỏ: Calibration, Perspective disagreements, Journal, nút "Realtime filters".
  Giữ: Activity, Filters (đủ 6 loại cho bài cũ), xem lại từng loại, xoá bài.
- **P3.3** Settings: bỏ mục Geopolitics progression, Adaptive difficulty và các tuỳ
  chọn của tính năng đã ẩn. Giữ Personal context, Keyboard, Backup.
  Đã bỏ thêm Delayed recall và nút tải Journal (Markdown). Giữ Language level (vẫn
  dùng khi AI tạo bài). Adaptive difficulty tắt luôn khi tạo bài (cờ trong
  `lib/adaptive/adaptive-hints.ts`), vì dữ liệu Confidence nó cần không còn được ghi.

## Phase 4 - Lớp AI - XONG

**Xong (2026-10-02)**, branch `simplify/phase-4`. `api/ai/route.ts` 793→617 dòng.
E2E 161 đạt + 1 lỗi chập chờn (Combo, chạy lại 3 lần đều đạt), 3 bỏ qua (Steelman); unit
990/990; build đạt. Gọi Gemini thật: 9/9 trường hợp đạt (Evaluative auto/dealbreaker/
uncertainty/geo, Systems auto/resilience/geo, Analytical thường/sound/geo).

- **P4.1** Đổi `@google/generative-ai` (ngừng hỗ trợ từ 31/08/2025) sang
  `@google/genai`, như noda A3.
- **P4.2** Dùng `responseSchema` cho 3 loại bài giữ lại, kèm một hàm normalize
  (như noda), thay cho validate tay.
  Đã làm: `lib/ai/response-schemas.ts` tạo `responseJsonSchema` từ chính schema zod
  (một nguồn, không lệch nhau). Zod parse + kiểm tra ngữ nghĩa vẫn chạy. Analytical
  thường không có trường geo (nếu có, model tự điền rồi bị coi là bài geo). Gemini
  không giữ `maxLength`, nên `componentCandidates` được cắt như nhãn node.
- **P4.3** Một hàm dùng chung "gọi AI → validate → retry 1 lần" thay cho 6 khối lặp
  trong `api/ai/route.ts`. Đã làm: `lib/ai/generate-validated.ts`. Loại bài ẩn
  (Generative, Sequential, Steelman) dùng chung hàm nhưng không gửi schema.
- Ghi chú cho Phase 5: `@google-cloud/vertexai` có trong `package.json` nhưng không
  được import (kéo theo một bản `@google/genai` cũ).
- Kiểm tra: gọi Gemini thật 1 lần cho mỗi loại; test timeout.

## Phase 5 - Dọn code và dữ liệu - XONG (chờ deploy rules)

**Xong (2026-10-02)**, branch `simplify/phase-5`. Xoá ~25.700 dòng (245 file). Còn 15 route.
E2E 91/91 (không còn test bỏ qua), unit 448/448, `tsc` sạch kể cả test, eslint 0 lỗi
(2 cảnh báo ref cố ý trong luồng đăng nhập), build đạt.

- **P5.1** `[QUYẾT ĐỊNH]` Xoá hẳn code của các tính năng đã ẩn (flow, route API,
  prompt, validator, trang), hay giữ thêm một thời gian. Đề xuất: dùng bản gọn vài
  tuần rồi mới xoá. Đã chọn: xoá hẳn. Xoá luôn ô Discuss dưới phản hồi AI (lúc đó
  vẫn còn hiện). Bài cũ thuộc loại đã xoá vẫn nằm trong History (tên, phản hồi AI) và
  không hiện ở Continue.
- **P5.2** Truy vấn có `where` / `orderBy` / `limit` thay cho tải cả collection; xoá
  một bài bằng truy vấn theo `exerciseId`. Đã làm: `RowQuery` trong `db/firestore.ts`
  (chạy trên Firestore và trên kho E2E), chỉ lọc + sắp xếp cùng một trường nên không
  cần composite index. Xoá bài giờ chỉ xoá một doc.
- **P5.3** Xoá code chết: `lib/ai/provider.ts` (stub), `lib/ai/claude.ts` (không
  được import). Đã làm, cùng các gói `@google-cloud/vertexai`, `@dnd-kit/sortable`,
  `@dnd-kit/utilities`.
- **P5.4** Sửa 33 lỗi type trong file test và 3 lỗi lint, để `tsc` sạch.
- **P5.5** Gỡ collection không dùng khỏi `firestore.rules` (cần deploy rules; hỏi
  trước). Đã chọn: deploy luôn, không backup. Rules còn 4 collection: exercises,
  settings, practicedTopics, cachedTopicLists. Phải deploy code mới trước rules: code
  đang chạy vẫn đọc các collection cũ khi xoá bài.

---

## Thứ tự

1. ~~Phase 1 (nhanh, thấy ngay khác biệt)~~ - xong
2. ~~Phase 2 (lớn nhất, nhiều quyết định)~~ - xong
3. ~~Phase 3~~ - xong
4. ~~Phase 4~~ - xong
5. ~~Phase 5~~ - xong
