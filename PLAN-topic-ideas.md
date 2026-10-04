# Plan: gợi ý chủ đề cụ thể bằng AI ("Topic ideas")

Viết ngày 2026-10-04, sau khi chủ app thử "A mode > Life situations" và thích việc AI đưa
ra một chủ đề cụ thể để dễ bắt đầu. Chưa bắt đầu.

Quy trình giống các plan trước: mỗi phase một branch, mỗi mục một commit. Cuối phase:
`tsc`, `eslint`, `vitest`, Playwright (`--workers=1`), build production, gọi Gemini thật,
chụp màn hình desktop + mobile (390px), cập nhật Handbook trong cùng thay đổi, hỏi trước khi
merge.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Hiện trạng (trang New exercise, `/reasoning`)

| Lối vào | Đang có | Vấn đề |
|---|---|---|
| A topic | Ô Domain tự gõ + Source (AI-generated / Use my own text / My scenario) + "Find best mode" xếp hạng 7 thẻ mode | Phải tự nghĩ chủ đề; 7 thẻ mode bên dưới rối |
| A mode | 7 thẻ mode; chọn một mode thì **tự gọi AI** ra 6 ý tưởng + các khu vực trong catalog | Tự gọi AI khi chưa bấm; không lọc được theo domain |

## Đã chốt với chủ app (2026-10-04)

1. Tình huống riêng không tạo danh sách 10 chủ đề. "Use my own text" và "My scenario" gộp
   thành **một ô "Specific scenario"**.
2. Domain chỉ **chọn từ danh sách có sẵn** (nhóm > domain, từ `EXERCISE_DOMAIN_CATALOG`), bỏ ô
   tự gõ. Mặc định: ngẫu nhiên (Any). Link từ Learning tracks / Geo Lab vẫn truyền chủ đề qua
   URL như cũ.
3. Calibration không do AI tạo: khi Mode = All, code **ngẫu nhiên thêm 0 hoặc 1** mục
   Calibration lấy từ chủ đề của ngân hàng câu hỏi.
4. Bộ lọc Mode ở A topic: **chọn một**, mặc định "All modes".
5. Bấm Generate: 10 chủ đề mới. **Chỉ loại các chủ đề đã làm** (không lưu "đã hiện"); lần bấm
   tiếp theo tránh 10 chủ đề đang hiện để hai danh sách liền nhau không trùng.
6. Bấm một chủ đề: mở **trang setup** của mode đó với chủ đề điền sẵn, người dùng chọn level
   rồi bấm Generate (không tự tạo bài).
7. Bỏ "Find best mode" và 7 thẻ mode bên dưới A topic.
8. Không tự gọi AI khi mở trang hay chọn mode: **luôn có nút Generate**.
9. Specific scenario với Analytical: văn bản **>= 120 từ** thì phân tích chính văn bản đó;
   ngắn hơn thì AI viết bài quanh tình huống (chốt 2026-10-04).

## Thiết kế màn hình

### A topic

```
[ Domain ▾ (Any) | Specific scenario ]   [ Mode ▾ (All modes) ]   [ Generate ]

1. A manager criticises your report in front of the team      Life situations · Work
2. Two food delivery apps cut prices at the same time         Strategic situations · Business & prices
3. ...                                                         (10 dòng)
```

- Mỗi dòng: chủ đề cụ thể (một câu ngắn) + **một** mode + domain. Bấm = mở setup của mode đó.
- Mode = All: danh sách đa dạng, code đảm bảo **mỗi mode tối đa 2 dòng** và ít nhất 4 mode khác
  nhau (nếu AI trả về lệch thì code lọc và gọi bù một lần).
- Chế độ "Specific scenario": một ô văn bản (tình huống hoặc bài viết) + nút "Suggest modes"
  -> 2-3 mode hợp nhất (dùng lại `/api/ai/recommend-mode`) -> bấm là vào bài với văn bản đó.

### A mode

```
[7 thẻ mode như hiện tại]  -> chọn một mode ->
[ Domain ▾ (Any) | Specific scenario ]   [ Generate ]
1. A manager criticises your report in front of the team      Work
...                                                            (10 dòng, không cần ghi mode)
```

- Calibration: không có Generate; hiện các chủ đề của ngân hàng câu hỏi để chọn.
- "Specific scenario" ở đây: vào thẳng bài của mode đã chọn với văn bản đó.

---

## Phase T1 - API gợi ý 10 chủ đề + quy tắc trong code

**Xong (2026-10-04)**, branch `topics/t1-topic-ideas`. Unit 709/709, `tsc` sạch, eslint 0 lỗi,
gọi Gemini thật cho 6 bộ lọc (All, Life situations, Reframe có loại trừ, Strategy + domain,
Geopolitics 2 lần): đủ 10 chủ đề cụ thể, đúng mode, không trùng; 9-17 giây. Chưa có giao diện
(T2, T3).

- Route mới `/api/ai/topic-ideas` (giữ route cũ `domain-suggestions` đến T4); lõi ở
  `lib/ai/topic-ideas-generate.ts`, quy tắc thuần ở `lib/topics/topic-ideas.ts`, client ở
  `lib/topics/client.ts` (gửi tối đa 100 chủ đề đã làm + 10 chủ đề đang hiện).
- **Khác plan:** giới hạn mỗi mode = max(2, 10 / số mode hợp bộ lọc), số mode tối thiểu =
  min(4, số mode hợp). Lý do: nhóm Geopolitics chỉ hợp 4 mode, giới hạn cứng 2/mode chỉ ra
  được 8 dòng.

- Mở rộng `/api/ai/domain-suggestions` (hoặc route mới `/api/ai/topic-ideas`): đầu vào
  `{ mode: ThinkingType | "all", group?, domain?, exclude: string[] }`, trả về 10
  `{ title, mode, domain }`.
- Prompt: chủ đề cụ thể, đời thường, một câu ngắn (IELTS ~6), tiếng Anh; nằm trong domain đã
  chọn (hoặc đa dạng nếu Any); mode phải hợp với chủ đề (Reframe = tình huống cảm xúc cá nhân,
  Strategy = hai bên quyết định cùng lúc, Analytical = có một lập luận để đọc...). Bài geo theo
  `GEO_FACT_RULE`.
- Validator (code): đúng 10 dòng; mode thuộc 6 mode AI (không Calibration); mode hợp với nhóm
  domain theo bảng `bestFor` của catalog; không trùng nhau và không trùng `exclude` (so sánh
  sau khi chuẩn hóa chữ); đa dạng khi Mode = All (tối đa 2 / mode, >= 4 mode); English only.
- `exclude` = tiêu đề các bài đã làm (từ `practicedTopics` + `domain` của các bài đã xong, lấy
  tối đa 100 gần nhất) + 10 chủ đề đang hiện.
- Calibration: hàm thuần trong code chọn ngẫu nhiên 0/1 chủ đề từ `CALIBRATION_CATEGORIES` khi
  Mode = All.
- Unit test cho validator, đa dạng, loại trùng, mục Calibration; test route.

## Phase T2 - Màn hình A topic

**Xong (2026-10-04)**, branch `topics/t1-topic-ideas` (cùng branch với T1). Unit 712/712,
`tsc` sạch, eslint 0 lỗi, build production, E2E toàn bộ 171/171 (mới: `topic-ideas.spec.ts`),
chụp màn hình desktop + 390px.

- `components/dashboard/TopicIdeasPanel.tsx` (dùng lại ở T3 với `fixedMode`): Domain /
  Specific scenario; Area > Domain (select 2 cấp), Mode (All + 7 mode); Generate; 10 dòng có
  mode; Calibration hiện danh sách ngân hàng câu hỏi, không gọi AI.
- Specific scenario: một ô; "Suggest modes" -> 3 mode nhận được tình huống (bỏ Strategy,
  Calibration); bấm -> mở setup với văn bản đã điền (`lib/topics/scenario-handoff.ts`).
- Trang New exercise: bỏ ô Domain tự gõ, Source, "Find best mode" và 7 thẻ mode.
- **Lỗi tìm ra và đã sửa:**
  - Analytical / Systems / Evaluative chỉ đọc văn bản được chuyển sang khi tự tạo bài: giờ
    luôn đọc, chỉ tự tạo bài khi được yêu cầu, và mở sẵn chế độ "Type your own" để thấy ô
    văn bản.
  - Life situations / Reframe chưa nhận văn bản: giờ điền vào "My situation", tự chuyển lên
    Standard nếu cấp hiện tại không có ô này.
  - Ở chế độ dev, React chạy effect hai lần làm mất văn bản: giờ chỉ đọc một lần.

- Hàng bộ lọc: Domain (select 2 cấp, mặc định Any) / chuyển sang Specific scenario; Mode
  (select, mặc định All); nút Generate. Danh sách 10 dòng; trạng thái đang tải; lỗi có nút
  thử lại.
- Bấm dòng: `/exercise/<mode>?domain=<chủ đề>` (setup, chưa tạo bài).
- Specific scenario: một ô văn bản gộp; "Suggest modes" -> 2-3 mode; bấm mode -> vào bài với
  văn bản. `[QUYẾT ĐỊNH]` Quy tắc cho Analytical khi văn bản là một bài viết: đề xuất văn bản
  >= 120 từ thì phân tích chính văn bản đó (như "Use my own text" cũ), ngắn hơn thì AI viết bài
  quanh tình huống.
- Bỏ "Find best mode" và 7 thẻ mode bên dưới.
- E2E (mock AI) + kiểm tra 390px.

## Phase T3 - Màn hình A mode

- Giữ 7 thẻ mode; chọn mode -> hàng bộ lọc (Domain / Specific scenario) + Generate -> 10 chủ
  đề (không ghi mode). Bỏ việc tự gọi AI trong `ModeTopicPanel`.
- Domain select chỉ hiện các nhóm hợp với mode đó (`bestFor`).
- Calibration: danh sách chủ đề ngân hàng câu hỏi, không Generate.
- Specific scenario: vào thẳng bài của mode.
- E2E + 390px.

## Phase T4 - Dọn dẹp và tài liệu

- Xóa code không còn dùng (ô Domain tự gõ trên trang này, gợi ý domain gần đây, phần xếp hạng
  mode nếu không còn chỗ nào dùng).
- Handbook: cập nhật "How an exercise works" / "Start here" cho cách bắt đầu mới.
- Gọi Gemini thật cho vài bộ lọc (All, từng mode, một domain geo) và xem chất lượng, độ đa dạng.

## Không làm

- Không lưu lịch sử "đã hiện" (chỉ loại chủ đề đã làm).
- Không tự gọi AI khi mở trang hoặc chọn mode.
- Không cho AI tạo câu hỏi Calibration.
