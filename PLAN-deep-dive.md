# Plan: feedback Analytical rõ hơn + nút "Go deeper"

Viết ngày 2026-10-03, sau buổi trao đổi với chủ app.

Quy trình giống các plan trước: một branch `feedback/deep-dive` (worktree riêng
`../cogi-deep-dive`), mỗi mục một commit. Cuối: `tsc`, `eslint`, `vitest`, Playwright,
build production, gọi Gemini thật để xem chất lượng, chụp màn hình desktop + mobile,
hỏi trước khi merge và push.

## Vấn đề

Feedback hiện tại (Why / Clue / Next time) đúng nhưng còn mỏng:

- `why` hay chỉ nhắc lại định nghĩa ("It presents only two choices..."), không đưa ví
  dụ cụ thể. Ví dụ cụ thể mới là phần giúp hiểu nhất.
- `clue` đôi khi khó hiểu ("which forces an unfair choice").
- Không có chỗ để đào sâu khi tò mò (giả định ẩn, nhiều phản ví dụ, tên gọi khác như
  Non sequitur, cách nói công bằng hơn).

## Nguyên tắc

- Mặc định vẫn ngắn (không bị ngợp). Đào sâu chỉ khi bấm.
- Chỉ gọi AI khi bấm, mỗi mục một lần; kết quả lưu vào bài nên xem lại trong History
  không tốn thêm lượt gọi.
- Code vẫn quyết định đúng/sai. Phần đào sâu không đổi điểm, không thêm "lỗi thứ hai".
- Giao diện đơn sắc, không emoji (giống phần còn lại của app).
- Bắt đầu với Analytical. Nếu dùng thấy tốt, mới mở rộng sang loại bài khác.

---

## Phase D1 - Feedback ngắn rõ hơn (chỉ sửa prompt)

File: `web/src/lib/ai/prompts/analytical-perspective.ts`.

1. `why` vẫn tối đa 2 câu ngắn, nhưng câu 2 phải là **một ví dụ đời thường cụ thể**:
   - Lỗi (issue): một trường hợp thật mà câu nói bỏ qua. Ví dụ: "A couple can trust
     each other and still keep separate accounts, e.g. one partner is paying off a
     student loan."
   - Câu đúng (decoy): một lý do cụ thể khiến nó đứng vững.
2. `clue`: trích 2-6 chữ, rồi gọi tên tín hiệu bằng từ đơn giản (ví dụ "an absolute
   word", "only one month of data", "a small online poll"). Không viết câu mơ hồ.
3. Test: cập nhật `analytical-perspective.test.ts`.

## Phase D2 - Nút "Go deeper" cho từng mục

Mỗi lỗi và mỗi câu đúng (trap) trong Answer key có nút "Go deeper". Bấm thì AI viết
phần phân tích sâu theo khung cố định:

| Phần | Lỗi (issue) | Câu đúng (trap) |
| --- | --- | --- |
| `core` | The core problem: điều câu nói ngầm cho là đúng | Why it looks weak |
| `examples` (2-4) | Real cases it ignores | Why it holds up |
| `alsoCalled` (0-2) | Also called: tên gọi khác (vd. Non sequitur) + ghi chú "same problem, another name" | (không có) |
| `fairer` | A fairer way to say it | What would make it a real problem |

Không dùng chữ "Hidden assumption" làm tiêu đề vì trùng tên một tag.

Thuật ngữ: lần đầu nhắc tên một kiểu lỗi, thêm tên tiếng Việt trong ngoặc, ví dụ
"False dilemma (song đề sai)". Phần còn lại viết tiếng Anh theo Language level.

Các bước:

1. **Kiểu dữ liệu + validator.** `AnalyticalDeepDive { ref, core, examples[], alsoCalled[{ name,
   note }], fairer }` trong `lib/types/perspective.ts`; `deepDives?: Record<ref,
   AnalyticalDeepDive>` trên `AnalyticalExerciseRow`. Validator zod: đúng ref, 2-4 ví
   dụ, `alsoCalled` không trùng tên tag/subtype, trap thì `alsoCalled` rỗng.
2. **Prompt** `lib/ai/prompts/analytical-deep-dive.ts`: một ref mỗi lần, có đoạn văn,
   câu được đánh dấu, tag, ghi chú của tác giả, `why` đã có (để không lặp lại).
3. **Route** `POST /api/ai/deep-dive`: đăng nhập, kiểm tra body bằng zod, gọi Gemini
   (một lần thử lại nếu sai), trả về `{ ok, deepDive }`.
4. **Giao diện.** `AnalyticalAnswerKey` nhận `deepDives` + `onRequestDeepDive(ref)`.
   Nút "Go deeper" -> "Thinking..." -> hiện khối phân tích; sau đó nút đổi thành
   "Hide". Dùng ở màn hình làm bài và trong History; cả hai lưu kết quả vào bài
   (`putExercise`). Lỗi mạng: hiện lỗi ngắn ngay dưới mục, cho bấm lại.
5. **Handbook**: thêm vào mục Analytical (what you get + tip).
6. **Test**: unit cho prompt, validator; E2E mock `/api/ai/deep-dive`, bấm nút, thấy
   khối phân tích, mở lại trong History không gọi AI lần nữa.

## Sau khi dùng thử

- Nếu gần như lần nào cũng bấm "Go deeper": bản mặc định đang quá ngắn, cân nhắc
  làm dài hơn.
- Nếu thấy hữu ích: mở rộng sang Systems / Evaluative / Strategy / Life situations
  (cùng khung, đổi tiêu đề các phần cho hợp).
