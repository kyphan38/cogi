# Migrate Gemini → Claude (Anthropic API)

Tài liệu này mô tả **cách repo đang gọi Gemini**, chỗ cần thay khi chuyển sang **Claude (Messages API)**, và **các giới hạn độ dài** (ký tự / từ) - phần nào **chỉ để tiết kiệm prompt** (có thể nới khi dùng Claude) vs phần nào **ràng buộc schema / UX** (phải đổi đồng bộ nhiều file).

Repo **chưa** cài SDK Anthropic; khi implement thật bạn thêm dependency (ví dụ `@anthropic-ai/sdk`) và thay implementation trong lớp gọi model.

---

## 1. Điểm vào hiện tại (Gemini)

| Vai trò | File | Hàm |
|--------|------|-----|
| JSON (bài tập / rubric / perspective parse) | `src/lib/ai/gemini.ts` | `generateAnalyticalExerciseRaw` - `responseMimeType: "application/json"`, `temperature: 0.35` |
| Văn bản (markdown, debate, journal-ref, …) | `src/lib/ai/gemini.ts` | `generatePlainTextRaw` - không JSON mode, `temperature: 0.45` |
| Model / key | `.env.local` | `GEMINI_API_KEY`, tùy chọn `GEMINI_MODEL` (mặc định `gemini-2.5-flash` trong code) |

Mọi route dưới `src/app/api/ai/**/route.ts` đều import hai hàm trên và kiểm tra `process.env.GEMINI_API_KEY` trước khi gọi.

**Danh sách route cần đổi env + import (cùng một pattern):**

- `src/app/api/ai/route.ts` - sinh bài (analytical, sequential, systems, evaluative, generative, combo, …)
- `src/app/api/ai/combo/route.ts`
- `src/app/api/ai/perspective/route.ts`
- `src/app/api/ai/weekly-review/route.ts`
- `src/app/api/ai/disagree/route.ts`
- `src/app/api/ai/debate/route.ts`
- `src/app/api/ai/journal-ref/route.ts`
- `src/app/api/ai/generative-rubric/route.ts`
- `src/app/api/ai/recall-feedback/route.ts`

**Hướng refactor gọn:** tạo một module trung gian (ví dụ `src/lib/ai/provider.ts`) export `generateJsonRaw` / `generatePlainTextRaw` đọc `ANTHROPIC_API_KEY` + `CLAUDE_MODEL` (hoặc tên env bạn chọn), rồi thay `@/lib/ai/gemini` bằng provider đó trong các route. Giữ **chữ ký hàm** `(fullPrompt: string) => Promise<string>` để diff nhỏ.

---

## 2. Khác biệt kỹ thuật quan trọng (JSON)

Gemini dùng `responseMimeType: "application/json"` nên model bị ép trả chuỗi JSON.

Claude không có flag tương đương 1–1 trong UI đơn giản nhất; các cách thường gặp:

1. **Prompt + parse:** system/user yêu cầu *chỉ* một khối JSON, không markdown; server `JSON.parse` sau khi strip code fence nếu có (một số validator trong repo đã có logic strip fence - ví dụ systems).
2. **`tool_choice` / tool schema:** định nghĩa tool với `input_schema` khớp Zod mong đợi; lấy `tool_use` input làm object - ổn định hơn cho production nhưng code dài hơn.

Các chỗ parse JSON sau khi gọi `generateAnalyticalExerciseRaw` (hoặc tương đương) cần **giữ nguyên contract** với `src/lib/ai/validators/*` - chỉ đổi nguồn chuỗi raw, không đổi schema trừ khi bạn chủ động migrate cả prompt + Zod.

---

## 3. Env gợi ý khi dùng Claude

Ví dụ (đặt tên tùy team, miễn nhất quán):

- `ANTHROPIC_API_KEY` - API key từ console Anthropic.
- `CLAUDE_MODEL` - điền đúng **model id** trong Anthropic console (đổi theo thời điểm; không hard-code trong doc này).

Sau khi chuyển, cập nhật mọi chỗ báo lỗi `"Server is missing GEMINI_API_KEY"` thành kiểm tra key provider mới (hoặc hỗ trợ cả hai trong giai đoạn chuyển tiếp).

---

## 4. “Scale down text 20 / 30” - bạn đang nhớ tới đâu?

### 4.1 Systems: nhãn 20 ký tự, mô tả node 50 ký tự (**không** phải giới hạn của Gemini)

Đây là **giới hạn schema** để graph/UI và validator khớp `ai_plan`:

- Zod: `src/lib/ai/validators/systems.ts` - `label: z.string().max(20)`, `description: z.string().max(50)`.
- Cùng file: hằng `SYSTEMS_NODE_LABEL_MAX = 20`, `SYSTEMS_NODE_DESCRIPTION_MAX = 50` trong `sanitizeSystemsNodesInPlace` (cắt bớt trước khi validate).
- Prompt systems nên nói rõ cùng con số: `src/lib/ai/prompts/systems.ts` (nếu prompt vẫn nói “≤20 / ≤50” thì giữ đồng bộ).

**Có “extend” khi dùng Claude không?** Có - **nhưng đó là thay đổi sản phẩm**, không phải “mở khóa” do đổi API: phải tăng max trong Zod, cập nhật sanitize, prompt, và có thể layout node trên canvas (chữ dài hơn).

### 4.2 Weekly review: clip theo hằng số (**độc lập** Gemini vs Claude)

File `src/lib/insights/build-weekly-review-payload.ts`:

- `MAX_EX_SUMMARY_CHARS = 400`
- `MAX_JOURNAL_PROMPT_CHARS = 200`
- `MAX_JOURNAL_BLOB_TOTAL = 1200`
- `MAX_DECISION_TEXT_CHARS = 500`
- `MAX_ACTION_CHARS = 320`
- `exerciseTitle` trong actions: `clip(..., 120)` (hard-code trong `buildWeeklyReviewSlices`)

Mục đích: giữ prompt weekly review nhỏ, ổn định chi phí/latency. **Claude có context window lớn không có nghĩa là bạn bắt buộc phải giữ các số này** - bạn **có thể tăng** các hằng trên (và số `120`) nếu chấp nhận prompt dài hơn và bill cao hơn. Không cần đổi validator AI; chỉ ảnh hưởng nội dung gửi lên `weekly-review` route.

### 4.3 Journal reference line: 280 ký tự

`src/app/api/ai/journal-ref/route.ts` - sau khi model trả lời, response được `raw.slice(0, 280)`. Đây là giới hạn **response UI one-liner**, có thể tăng nếu UI cho phép.

### 4.4 Journal-ref: tối đa 3 snippet gửi lên

Cùng route: `snippets.slice(0, 3)`. Đổi số `3` nếu muốn nhiều ngữ cảnh hơn (tradeoff: prompt dài hơn).

### 4.5 Main `/api/ai` route: giới hạn độ dài input

`src/app/api/ai/route.ts` - có kiểm tra độ dài sau sanitize (ví dụ ~2000 từ cho một nhánh text). Đó là **bảo vệ server / UX**, không gắn với Gemini; giữ hoặc chỉnh theo policy của bạn.

### 4.6 Recall feedback

`src/app/api/ai/recall-feedback/route.ts` - Zod `userRecall.max(2000)`. Có thể tăng nếu product cho phép.

### 4.7 Debate: số lượt user (không phải 20 ký tự)

`src/components/exercises/GenerativeExerciseFlow.tsx` - `MAX_DEBATE_USER_TURNS = 3`. Đây là **số vòng hội thoại**, không liên quan context Claude; đổi nếu muốn luồng dài hơn.

---

## 5. Checklist triển khai ngắn

1. Thêm SDK Anthropic, implement `generateJsonRaw` / `generatePlainTextRaw` (hoặc tái export tên cũ).
2. Map nhiệt độ: ~0.35 JSON / ~0.45 plain (Claude dùng `temperature` tương tự trong Messages API).
3. Thay mọi `GEMINI_API_KEY` check trong các route AI.
4. Chạy lại `npm run build`, smoke `/dev/ai-smoke` và `npm run gate:phase0` (cập nhật script/README nếu đổi env).
5. Nếu tăng clip weekly review hoặc systems label: regression test thủ công UI tương ứng.

---

## 6. Tài liệu liên quan

- [EXPERIENCE_TUNING.md](./EXPERIENCE_TUNING.md) - tinh chỉnh trải nghiệm / model từ góc sản phẩm.
- `web/README.md` - Phase 0 gate và lệnh dev.
