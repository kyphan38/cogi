# Tinh chỉnh trải nghiệm & chức năng (Thinking Training)

Tài liệu này mô tả **cần gạt nào thay đổi cảm giác và hành vi app** - hướng tới người chỉnh sản phẩm / nội dung, không phải checklist cấu hình kỹ thuật thuần túy. Phần cuối có **phụ lục** trỏ nhanh tới file trong repo nếu bạn cần sửa tay.

**Người dùng cuối (không chỉnh code):** xem [USER_GUIDE.md](./USER_GUIDE.md) - hướng dẫn từng màn hình và từng loại bài.

---

## 1. “Bài tập cảm giác thế nào?” - AI & nội dung sinh ra

**Bạn đang chỉnh:** độ khó cảm nhận, giọng văn, độ dài, mức “mồi nhử”, cách model giải thích sau bài - chứ không chỉ “đúng JSON”.

| Cần gạt | Ảnh hưởng trải nghiệm | Gợi ý khi chỉnh |
|--------|------------------------|-----------------|
| **Model** (`GEMINI_MODEL`) | Độ ổn định, tốc độ, khả năng tuân spec phức tạp (combo, evaluative). Model mạnh hơn thường ít lỗi parse nhưng đắt / chậm hơn. | Đổi khi bạn thấy quá nhiều lần “AI generated invalid exercise” hoặc nội dung quá nông. |
| **Nhiệt độ** (`temperature` trong `gemini.ts`) | Cao → đa dạng hơn nhưng dễ lệch schema; thấp → ổn định, hơi “máy móc”. | Generate: giữ vừa phải; narrative (perspective, journal ref): có thể hơi cao hơn một chút nếu muốn văn tự nhiên. |
| **Prompt** (`src/lib/ai/prompts/*.ts`) | Trực tiếp định nghĩa *tone*, độ chi tiết scenario, cách hỏi journal, cách debate. | Sửa câu chữ trước khi đụng validator; nếu đổi **cấu trúc** output thì phải đi cặp với Zod trong `validators/`. |

**Trải nghiệm người dùng:** người chơi không thấy “model id” - họ thấy bài có **hay / dở / quá khó / quá dễ**. Prompt + model là hai nút chính cho cảm giác đó.

---

## 2. Lĩnh vực (domains) - lựa chọn nhanh vs tự nhập

**Chức năng:** dropdown + “Custom” cho mọi loại bài; domain đi vào prompt như ngữ cảnh.

**Tinh chỉnh trải nghiệm:**

- Danh sách domain mặc định quyết định *80% người dùng không phải gõ* - nên phản ánh đối tượng thật (ví dụ học thuật, công việc, đời sống VN nếu đó là audience).
- Mô tả trên Home card (tiêu đề + một dòng) là **lời mời** - đổi được để giảm áp lực (“hôm nay chỉ 10 phút”) hoặc tăng rõ ràng (“cho người mới”).

**Lưu ý vận hành:** hiện danh sách domain **lặp** theo từng flow; khi mở rộng nên gom một nguồn để không lệch giữa Analytical và Sequential.

*(Phụ lục: các `*ExerciseFlow.tsx`, `ComboExerciseFlow.tsx` - constant `DOMAINS`.)*

---

## 3. Ngôn ngữ - UI vs lời model

**Hai lớp độc lập:**

1. **Giao diện (Next/React):** toàn chuỗi hard-coded tiếng Anh trừ khi bạn thêm i18n. Đổi sang tiếng Việt = thay (hoặc bọc) copy trên từng màn: Home, Dashboard, History, Settings, nav, exercise steps.
2. **Đầu ra AI:** do prompt tiếng Anh; muốn bài **tiếng Việt** thì thêm chỉ dẫn rõ trong prompt (“Generate passage in Vietnamese…”) và kiểm tra validator / UI có giả định tiếng Anh không.

**Trải nghiệm:** đồng bộ ngôn ngữ UI và bài tập tránh cảm giác “app Việt nhưng bài tiếng Anh” (hoặc ngược lại) nếu đó là mục tiêu sản phẩm.

---

## 4. Nguồn bài Analytical - AI vs “real data”

**Chức năng:** cùng một mechanic (highlight issues), nhưng **real data** dùng văn bản người dán → cảm giác cá nhân, ít “bài mẫu”.

**Tinh chỉnh trải nghiệm:**

- Copy giải thích mode (paste, giới hạn từ, cảnh báo HTML) ảnh hưởng **tin tưởng** và tỷ lệ bỏ cuộc.
- Badge “Real data” trên history giúp phân biệt khi so sánh calibration sau này.

---

## 5. Calibration & adaptive - “app hiểu tôi thế nào?”

**Không phải config số cho vui** - đây là **cách app phản hồi độ tự tin vs độ đúng**.

| Thành phần | Người dùng thấy gì | Khi nên chỉnh |
|-------------|---------------------|----------------|
| **Dashboard - 3 ô metric** | “Tôi hoàn thành bao nhiêu bài”, “gap calibration”, “accuracy trung bình” - có ngữ cảnh ngắn bên dưới. | Nếu người dùng hiểu nhầm “gap” → đổi microcopy, không nhất thiết đổi công thức ngay. |
| **Adaptive (Settings)** | Tắt: chỉ một dòng dẫn tới Settings. Bật: tier theo loại + “blind spots” inject vào prompt generate. | Ngưỡng tier / rolling window ảnh hưởng *bao lâu* label đổi - chỉnh khi bạn muốn phản hồi nhanh/chậm hơn. |
| **Weakness queue** | Miss/hit, resolve sau N lần đúng - ảnh hưởng “bài sau có lặp chủ đề yếu không”. | Bucket cho từng thinking type: đổi nếu bạn muốn “nhắc ít hơn” hoặc “chỉ nhắc khi thật tệ”. |

**Trải nghiệm:** adaptive tắt mặc định là **chủ động giảm áp lực** (“app không tự phán xét”) cho đến khi bạn bật cờ sau khi validate giá trị.

---

## 6. History - đọc lại quá khứ & streak

**Chức năng:** heatmap theo filter hiện tại; streak tính trên **mọi** completion (không filter) để khuyến khích nhịp đều.

**Tinh chỉnh trải nghiệm:**

- Màu theo loại bài + legend - giảm tải nhận thức so với một dòng text dài.
- Tag gap (dương / âm / trung tính) truyền tải **over/underconfident** nhanh hơn số thô.
- Nếu streak “cảm giác không công bằng” với người hay lọc history - có thể đổi định nghĩa (ví dụ streak theo filter) nhưng cần cân nhắc thông điệp sản phẩm.

---

## 7. Theme Paper / editorial - không chỉ màu

**Bạn đang chỉnh:** độ “đọc được lâu”, hierarchy (nav cố định, card vs nền), chữ nghiêng cho empty state - tất cả ảnh hưởng **cảm giác công cụ suy nghĩ** vs “dashboard SaaS”.

- Token màu / font: đổi khi đổi đối tượng (ví dụ teen vs chuyên gia) hoặc chế độ đọc tối.
- Nav: giảm mất phương hướng khi cuộn dài (History, Dashboard).

---

## 8. Settings & ngữ cảnh cá nhân

**Personal context** được inject vào prompt - đây là **cần gạt “cá nhân hóa không code”**: đổi là đổi giọng toàn bộ luồng AI liên quan.

**Delayed recall / adaptive:** là **tần suất & cường độ** nhắc nhở - bật tắt ảnh hưởng trực tiếp độ “ồn” của app.

---

## 9. Backup & dữ liệu - trải nghiệm “mất / giữ”

Export JSON là **cam kết sở hữu dữ liệu**. Khi thêm bảng Dexie mới, luồng backup/import cần khớp - nếu không, người dùng có cảm giác “mất một phần lịch sử” sau khi đổi máy.

*(Phụ lục: `src/lib/db/backup.ts`, schema version trong `schema.ts`.)*

---

## Phụ lục - trỏ nhanh tới code (khi cần sửa tay)

| Chủ đề | Vị trí chính |
|--------|----------------|
| Model, JSON vs plain, nhiệt độ | `src/lib/ai/gemini.ts`, biến môi trường `GEMINI_*` |
| Prompt theo loại bài | `src/lib/ai/prompts/` |
| API route / body | `src/app/api/ai/**` |
| Domain list | `src/components/exercises/*ExerciseFlow.tsx`, `ComboExerciseFlow.tsx` |
| Settings & cờ | `src/lib/db/settings.ts` (`AppSettingsRow`), `src/app/(main)/settings/page.tsx` |
| Adaptive / tier / weakness | `src/lib/adaptive/`, `src/lib/db/weaknesses.ts` |
| Theme & typography | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/card.tsx`, `src/components/shell/AppTopNav.tsx` |
| History / heatmap / copy | `src/app/exercise/history/page.tsx` |
| Home layout & copy | `src/components/dashboard/HomeContent.tsx` |
| Dashboard metric copy | `src/components/dashboard/DashboardContent.tsx` |
| Backup | `src/lib/db/backup.ts` |

---

*Nếu sau này bạn thêm i18n hoặc gom domain một nguồn, nên cập nhật phụ lục một dòng để tài liệu không lệch thực tế repo.*
