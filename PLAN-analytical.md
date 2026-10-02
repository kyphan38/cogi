# Plan: cải thiện Analytical + cấp độ học cho cả app

Viết ngày 2026-10-02, dựa trên buổi review cùng ngày: chủ app làm bài "A daily routine
plan for financial and career success", nêu 3 vấn đề, rồi quét toàn bộ code của feature.
Chủ app đồng ý hướng đề xuất.

Quy trình giống `PLAN-simplify.md`: mỗi phase một branch, mỗi mục một commit. Cuối
mỗi phase: chạy `tsc`, `eslint`, `vitest`, các spec Playwright liên quan, build
production trong một git worktree riêng (dùng `cp -cR` cho `node_modules`), chụp màn
hình desktop + mobile, rồi hỏi trước khi merge và push.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Vì sao

| Vấn đề người dùng gặp | Nguyên nhân thật (trong code) |
|---|---|
| Quá nhiều tag, không biết chọn cái nào | Bài thường không truyền `tagOptions`, nên hiện cả 10 tag (`TAG_ORDER`), trong đó có 4 tag chỉ dùng cho geopolitics. Tag không có giải thích. |
| Feedback không khớp tag ("false dilemma" không có trong danh sách) | Người dùng chọn **đúng** (false dilemma là một loại Logical Fallacy). Nhưng prompt bắt mỗi dòng phải có "stronger alternative", nên AI luôn "sửa", kể cả khi người dùng đúng. Không có kết luận đúng/sai. |
| Sợ, nản, làm xong không biết câu nào thật sự là vấn đề | Đáp án (4 lỗi + mức độ + 2 câu bẫy) đã có sẵn nhưng không được hiển thị. Không có cách đọc từng bước cho người mới. Bài dài, không có gợi ý. |

## Mục tiêu của dạng bài Analytical

Theo thứ tự quan trọng:

1. **Phát hiện**: nhận ra câu nào có lập luận yếu.
2. **Không bắt nhầm**: biết câu nào trông đáng ngờ nhưng thật ra hợp lý (2 câu bẫy).
3. **Gọi tên và giải thích**: nói được tại sao câu đó yếu.

Tên tag là phần ít quan trọng nhất. Tag nên là câu trả lời cho một câu hỏi cụ thể,
không phải nhãn để đoán.

**4 câu hỏi kiểm tra** (dùng cho tag, cho luồng Guided và cho feedback):

| Câu hỏi | Nếu "có" thì tag là |
|---|---|
| Câu này có **bằng chứng** không, hay chỉ là lời nói? | Weak Evidence |
| Câu này có **ngầm cho rằng** một điều chưa chứng minh là đúng không? | Hidden Assumption |
| Logic có **nhảy cóc** không? (chỉ 2 lựa chọn, kết luận quá xa...) | Logical Fallacy |
| Người viết có **chỉ nhìn một phía**, hoặc có lợi ích riêng không? | Bias |

---

## Nguyên tắc chung (áp dụng cho cả app)

### Feedback

- **Code chấm, AI giải thích.** Đúng/sai, tìm được/bỏ sót là do code tính từ đáp án.
  AI không tự so khớp vị trí ký tự.
- Mỗi nhận xét có 3 phần cố định: **Why** (1-2 câu), **Clue** (dấu hiệu nhận biết),
  **Next time, ask** (câu hỏi tự hỏi lần sau).
- Khi người dùng đúng: xác nhận, không bắt buộc "cách tốt hơn".
- Ưu tiên: bỏ sót > sai tag > đúng. Cuối bài có 1-2 bài học mang theo.
- Feedback dùng **language level** của người dùng.

### Cấp độ: có áp dụng cho cả app không?

**Có, nhưng theo cách sau:**

- **Khung chung cho cả app:** 3 cấp Guided / Standard / Expert. Cùng cách chọn, cùng
  quy tắc gợi ý, cùng cách lưu.
- **Cấp riêng cho từng loại bài.** Không dùng một cấp chung cho cả app. Kỹ năng
  khác nhau: có thể Standard ở Analytical nhưng vẫn Guided ở Systems.
- **Nội dung mỗi cấp do từng loại bài tự định nghĩa.** Bỏ hỗ trợ nào ở cấp nào là
  khác nhau giữa Analytical, Systems và Evaluative.
- **Làm Analytical trước** (Phase 4). Dùng 1-2 tuần, rồi mới mở rộng (Phase 6). Lý do:
  app vừa được đơn giản hoá; làm cả 3 loại cùng lúc dễ làm app phức tạp lại.

**Khác với "Adaptive difficulty" cũ (đã gỡ ở `PLAN-simplify.md` P3.3 và Phase 5):**

| | Adaptive difficulty cũ | Cấp độ mới |
|---|---|---|
| Ai quyết định | App tự đổi (khi bật trong Settings) | Người dùng chọn, app chỉ gợi ý |
| Dựa trên | Confidence tự đánh giá | Kết quả do code chấm (tìm được mấy lỗi...) |
| Thay đổi gì | Ẩn trong prompt, người dùng không thấy | Hỗ trợ nhìn thấy được: gợi ý, số lỗi, cách chọn, độ dài bài |
| Vì sao bị gỡ | Dữ liệu confidence không còn được ghi | Dữ liệu kết quả được ghi ở mỗi bài (P1.6) |

**Quy tắc chung:**

- Lần đầu: Guided.
- Gợi ý lên cấp: 3 bài liên tiếp ở cấp hiện tại đạt mức "tốt".
- Gợi ý xuống cấp: 2 bài liên tiếp ở mức "yếu". Nhẹ nhàng, có thể bỏ qua.
- "Tốt" / "yếu" do từng loại bài định nghĩa. Analytical: tốt = tìm ≥3/4 lỗi và bắt
  nhầm ≤1 bẫy; yếu = tìm ≤1/4 lỗi.
- Người dùng bấm "Để sau" thì không gợi ý lại cho đến khi xong thêm 3 bài.

### Giữ những gì đã chốt

- Vòng lặp 3 bước giữ nguyên. Các bước nhỏ của Guided nằm trong bước "Làm bài" và
  dùng `partLabel` (giống geopolitics hiện tại).
- UI đơn sắc: không emoji, icon SVG nét đơn `currentColor`. Màu chỉ dùng cho trạng
  thái có ý nghĩa.

---

## Phase 1 - Nền móng (Analytical) - XONG

**Xong (2026-10-02)**, branch `analytical/phase-1`. Unit 475/475, E2E 91/91, `tsc`
sạch, eslint 0 lỗi (2 cảnh báo cũ), build production đạt. Gọi Gemini thật: 8/8 bài
tạo mới (6 thường, 2 sound reasoning) và 2/2 bài dán văn bản đều đạt kiểm tra mới
ngay lần đầu; mọi bài tạo mới có 3 đoạn.

Không đổi giao diện nhiều. Làm cho đáp án đáng tin trước khi hiển thị nó.

- **P1.1 Kiểm tra đầu ra AI cho bài thường.** Hiện tại chỉ bài geopolitics được kiểm
  tra (`lib/ai/validators/common.ts:59`, trả về `[]` khi không phải geo).
  Thêm `validateAnalyticalSemantics`:
  - Bài thường: đúng 4 lỗi, mức độ 1 obvious / 2 moderate / 1 subtle, loại chỉ thuộc
    4 loại chung, đúng 2 `validPoints`.
  - Bài sound reasoning: 0 lỗi, 2-3 `validPoints`, `isSoundReasoning: true`.
  - Mọi `textSegment` phải tìm thấy trong passage (`findSegmentRange`).
  - Dùng trong `app/api/ai/route.ts` cho cả `generated`, `custom_scenario` và
    `real_data` (hiện `real_data` thường trả `[]`). Retry suffix chung.
  - Unit test cho từng lỗi.
  - Đã làm thêm: bài dán văn bản giờ sửa và kiểm tra đoạn trích trên **chính văn
    bản người dùng** (trước đây kiểm tra trên bản AI chép lại, rồi hiển thị bản của
    người dùng). `isSoundReasoning` lấy từ request, không lấy từ AI.
- **P1.2 Chỉ hiện 6 tag cho bài thường.** Thêm `ANALYTICAL_TAG_OPTIONS` (4 loại +
  Valid Point + Unclear) trong `lib/exercise/tag-labels.ts`, truyền vào `HighlightTag`
  ở `AnalyticalExerciseFlow.tsx:724`.
- **P1.3 Gửi `languageLevel` khi lấy feedback.** ~~Cả 3 flow gọi
  `/api/ai/perspective` mà không gửi `languageLevel`.~~ **Không cần sửa:** nhận định
  này sai. `aiFetch` (`lib/api/ai-fetch.ts`) tự thêm `languageLevel` vào mọi lời gọi
  `/api/ai/*`, và các route đều đọc nó. Feedback nghe học thuật là do prompt (P2.2).
- **P1.4 Giữ xuống dòng trong bài đọc.** Thêm `whitespace-pre-wrap` cho khung passage
  trong `HighlightTag.tsx` (History đã có). Kiểm tra chọn chữ qua nhiều đoạn vẫn
  đúng offset.
  Đã làm thêm: prompt yêu cầu bài tạo mới chia 2-4 đoạn ngắn (trước đây thường là
  một khối, nên chỉ thêm CSS thì không đủ).
- **P1.5 Chấm điểm bằng code.** File mới `lib/exercise/analytical-score.ts`:
  - Vào: passage, `embeddedIssues`, `validPoints`, `userHighlights`.
  - Ra: mỗi lỗi {tìm được?, highlight khớp, tag đúng?}; mỗi câu bẫy {bị bắt nhầm?};
    các highlight thừa; tổng kết {found/4, trapsHit/2, tagCorrect}.
  - Khớp khi highlight trùng ≥50% đoạn lỗi, hoặc highlight nằm trong cùng câu với
    đoạn lỗi.
  - Tag `valid_point` trên câu bẫy = đúng. Tag lỗi trên câu bẫy = bắt nhầm.
    `unclear` = trung tính (không tính tìm được, không phạt).
  - Unit test đủ các trường hợp.
- **P1.6 Lưu kết quả.** Thêm `result?: AnalyticalResult` (và sau này `level`) vào
  `AnalyticalExerciseRow`. Tính khi nộp bài. Bài cũ không có `result` thì tính lại
  khi mở (`analyticalResultOf`).
- Ghi chú cho Phase 3: một highlight rất dài (cả đoạn) có thể khớp nhiều lỗi cùng
  lúc. Chế độ bấm cả câu sẽ tự giải quyết; chế độ kéo chọn (Expert) có thể cần giới
  hạn.

## Phase 2 - Feedback mới (Analytical) - XONG

**Xong (2026-10-02)**, branch `analytical/phase-2`. Unit 492/492, E2E 92/92, `tsc` sạch, eslint 0
lỗi (2 cảnh báo cũ), build production đạt. Gọi Gemini thật với bài mẫu "daily
routine": AI giữ đúng kết luận của code, câu false dilemma được xác nhận đúng.

- Route `/api/ai/perspective` tự chấm bằng `scoreAnalytical`, gửi AI kết luận cuối
  cùng cho từng trường hợp; AI chỉ giải thích. Trả về thêm `result`.
- Đã làm thêm: siết luật `subtypeName` (chỉ cho lỗi, chỉ khi thật sự là loại con của
  tag đó, tối đa 2). Lần chạy đầu AI gắn tên loại con cho mọi lỗi, ví dụ
  "Confusing correlation with causation" hiện là loại con của Hidden Assumption.
- Đã làm trước một phần Phase 5: History dùng bảng đáp án cho bài analytical (nếu
  không, feedback v3 sẽ không xem lại được). Bỏ in tên tag thô.

- **P2.1 Bảng đáp án** (`components/exercises/AnalyticalAnswerKey.tsx`):
  - Dòng tổng kết: "Tìm được 3/4 lỗi · Bắt nhầm 0/2 bẫy".
  - So với confidence: "Bạn chắc 80%, kết quả 2/4".
  - 4 lỗi xếp theo mức độ: tìm được/bỏ sót, tag đúng, tag bạn chọn.
  - 2 câu bẫy, các highlight thừa.
  - Bài đọc có đánh dấu: câu lỗi, câu bẫy, câu bạn chọn.
- **P2.2 Prompt feedback mới** (`lib/ai/prompts/analytical-perspective.ts`):
  - Đầu vào là kết quả đã chấm ở P1.5, không phải offset thô.
  - Đầu ra (format mới, ví dụ `analytical_v3`): mỗi mục `{ ref, why, clue,
    nextTimeAsk, subtypeName? }` + `takeaways` (1-2 câu).
  - Luật: mỗi trường tối đa 2 câu; không "stronger alternative" khi đúng; chỉ dùng
    tên tag trong danh sách; tên loại con (false dilemma...) phải kèm "a type of
    Logical Fallacy"; ưu tiên bỏ sót; theo language level.
  - Bỏ `suitableFor` và `CLARITY_BLUEPRINT_RULE` cho analytical (giữ cho loại khác
    đến Phase 6).
  - Validator mới trong `lib/ai/validators/perspective-structured.ts`. Feedback cũ
    (`clarity_v2`) vẫn hiển thị được.
- **P2.3 Gộp thành một danh sách.** Nhận xét AI nằm ngay trong từng dòng của bảng
  đáp án, không phải hai thẻ riêng.
- **P2.4 Ô "Điều rút ra".** Gợi ý trong `PracticeFinishCard`: "Vì sao câu bạn bỏ sót
  là vấn đề? Viết 1 câu." Không thêm bước mới.

Ví dụ mục tiêu (câu người dùng đã gặp):

> **Correct: Logical Fallacy** · More specific name: False dilemma, a type of Logical Fallacy
> **Why:** The sentence says there are only two paths: run at dawn, or never have discipline. People build discipline in many other ways.
> **Clue:** "If you do not... you will never...". Words like *never, always, only* are warning signs.
> **Next time, ask:** "Is the writer hiding other options?"

## Phase 3 - Cách chọn (Analytical) - XONG

**Xong (2026-10-02)**, branch `analytical/phase-3`. Unit 498/498, E2E 94/94, `tsc`
sạch, eslint 0 lỗi (2 cảnh báo cũ), build production đạt.

- Bài thường dùng chế độ bấm câu; geopolitics giữ kéo chọn (coi như Expert) cho đến
  Phase 4.
- Bộ tách câu dùng chung với phần chấm điểm (`lib/text/sentences.ts`), nên câu bấm
  luôn khớp lỗi bên trong. "5 a.m. to win" và "3.5" không bị tách.
- Geopolitics giữ nguyên nút có chấm màu (ngoài phạm vi); câu hỏi kiểm tra chỉ hiện
  cho tag bài thường.
- Còn lại: trên điện thoại, bộ chọn tag chỉ vừa khoảng 4/6 lựa chọn, phải cuộn để thấy
  Valid Point / Unclear. Có thể chuyển thành bảng trượt từ dưới lên (bottom sheet) sau.

- **P3.1 Chế độ bấm cả câu.** `lib/text/sentences.ts` tách câu (xử lý số "3.5",
  chữ viết tắt, dấu ngoặc kép). Bấm một câu thì mở bộ chọn tag. Vẫn lưu theo
  `UserHighlight` (offset của câu). Chế độ kéo chọn giữ cho Expert.
- **P3.2 Tô câu đã chọn ngay trong bài.** Hiện code giả định passage là một text node
  (`rangeRectFromOffsets`), nên phải sửa phần tính vị trí.
- **P3.3 Giải thích tag.** Bộ chọn hiện câu hỏi kiểm tra của mỗi tag (bảng 4 câu hỏi).
  Thêm `TAG_HELP` trong `tag-labels.ts`.
- **P3.4 Đổi tag.** Bấm câu đã đánh dấu: "Đổi tag" / "Bỏ".
- **P3.5 Tag đơn sắc.** Bỏ màu đỏ, cam, vàng, tím, xanh trong `TAG_LABELS`. Dùng chip
  trung tính, phân biệt bằng tên.

## Phase 4 - Cấp độ: khung chung + Analytical - XONG

**Xong (2026-10-03)**, branch `analytical/phase-4`. Unit 525/525, E2E 96/96, `tsc` sạch, eslint 0 lỗi (2 cảnh
báo cũ), build production đạt. Gọi Gemini thật cho bài Guided: 4/4 đạt ngay lần đầu,
145-181 từ, 8-10 câu.

- Bài cũ không có `level` được coi như Standard (chúng làm trước khi có cấp, bằng
  cách bấm câu). Geopolitics luôn là Expert.
- Câu hỏi ý chính: AI hay đặt đáp án đúng ở vị trí đầu (3/4 lần), nên giao diện xáo
  thứ tự theo id bài.
- Ở Guided, bài 8-10 câu thì gần như mọi câu đều được gợi ý (4 lỗi + 2 bẫy + 2 câu
  thường). Đúng thiết kế, nhưng nếu thấy dài có thể giảm câu thường xuống 1.
- Đã làm thêm: câu thường đánh "Looks fine" / "Not sure" không hiện trong mục
  "Your other highlights" và không gửi cho AI (tránh nhận xét thừa).
- Gợi ý lên/xuống cấp chỉ có unit test (cần 3 bài xong liên tiếp nên không có E2E).

- **P4.1 Khung chung** `lib/exercise/levels.ts`:
  - `PracticeLevel = "guided" | "standard" | "expert"`.
  - Lưu cấp theo loại bài trong settings: `practiceLevels: Record<"analytical" |
    "systems" | "evaluative", PracticeLevel>`, mặc định `guided`.
  - `suggestLevelChange(type, recentResults)` theo quy tắc chung ở trên. Mỗi loại bài
    cung cấp hàm `rate(result) → "good" | "ok" | "poor"`.
  - Lưu `level` vào mỗi bài. Unit test.
- **P4.2 Giao diện.**
  - Chọn cấp ở bước chọn chủ đề: 3 nút, mỗi nút một dòng mô tả.
  - Gợi ý lên/xuống cấp ở thẻ cuối bài: "Bạn sẵn sàng thử Standard chưa?" [Thử] [Để sau].
  - Không thêm mục mới vào Settings.
- **P4.3 Cấp độ của Analytical:**

  | | Guided | Standard | Expert |
  |---|---|---|---|
  | Độ dài bài | ~150-200 từ | ~250 từ | 250-350 từ |
  | Tìm ý chính trước | Có | Không | Không |
  | Câu được gợi ý sẵn | Có (~8 câu) | Không | Không |
  | Cách chọn | Bấm cả câu | Bấm cả câu | Kéo chọn |
  | Cho biết số lỗi | "4 lỗi, 2 bẫy" | "4 lỗi" | Không |
  | Bảng 4 câu hỏi | Luôn hiện | Mở khi cần | Ẩn |
  | Bài "không có lỗi" | Không | Không | Có (20%) |

  - Gửi `level` lên `/api/ai`. Prompt đổi độ dài theo cấp.
  - Sound reasoning chỉ ở Expert (`app/api/ai/route.ts:295-299`).
  - Câu gợi ý sẵn ở Guided do code chọn: câu chứa lỗi + câu bẫy + 2 câu thường ngẫu
    nhiên. Không cần AI.
- **P4.4 Luồng Guided** (trong bước "Làm bài"):
  1. Tìm ý chính: chọn 1 trong 3 câu. Thêm trường `mainClaimQuiz` vào schema
     (chỉ yêu cầu khi Guided).
  2. Đi qua ~8 câu gợi ý: Có vấn đề / Ổn / Không chắc.
  3. Câu "Có vấn đề": chọn câu hỏi kiểm tra bị trả lời "có" (= tag).
  4. Sang feedback.
- **P4.5 Sửa bài sound reasoning.** Bỏ badge "Sound reasoning" ở đầu bài. Cho nộp bài
  với 0 highlight, kèm hỏi lại: "Bạn cho rằng bài này không có lỗi?". Chấm điểm xử
  lý trường hợp 0 lỗi.
- **P4.6 Test:** unit cho levels và tách câu; Playwright cho 3 cấp.

## Phase 5 - History (Analytical)

- ~~Hiện tên tag đẹp (không phải `logical_fallacy`), bảng đáp án.~~ Đã làm ở Phase 2.
- ~~Bài cũ: tính `result` khi mở; feedback cũ vẫn hiện như trước.~~ Đã làm ở Phase 2.
- ~~Còn lại: hiện cấp đã làm (sau Phase 4).~~ Đã làm ở Phase 4. **Phase 5 xong.**

## Phase 6 - Mở rộng cấp độ sang Systems và Evaluative `[QUYẾT ĐỊNH]`

Làm sau khi dùng Analytical có cấp độ khoảng 1-2 tuần. Mỗi loại cần: hàm chấm bằng
code, hàm `rate`, bảng cấp độ, và áp dụng nguyên tắc feedback mới (Why / Clue /
Next time).

**Systems** (đáp án: `intendedConnections`, `shockEvent`):

| | Guided | Standard | Expert |
|---|---|---|---|
| Loại bài | auto | auto | auto, resilience, geopolitics |
| Gợi ý thành phần | Có (`componentCandidates`, đã có) | Có | Tự đề xuất |
| Cho biết số kết nối | Có | Không | Không |
| Giải thích loại kết nối | Luôn hiện | Mở khi cần | Ẩn |

Chấm: số kết nối khớp `intendedConnections`; số node đánh giá đúng direct/indirect.

**Evaluative** (cấp chủ yếu chọn biến thể):

| | Guided | Standard | Expert |
|---|---|---|---|
| Biến thể | matrix | scoring | dealbreaker, uncertainty |
| Gợi ý tiêu chí | Có (`criteriaCandidates`, đã có) | Có | Không |

Chấm: matrix có đáp án (`intendedQuadrant`). Scoring và uncertainty là đánh giá chủ
quan, nên chỉ đo **khoảng cách** so với gợi ý của AI. Không gọi là đúng/sai. Gợi ý
lên cấp với hai biến thể này nên dè dặt hơn.

## Ngoài phạm vi

- Geopolitics Analytical: giữ như hiện tại (không có Guided), coi như Expert.
  `[QUYẾT ĐỊNH]` nếu muốn thêm cấp sau.
- Chấm phần đoán góc nhìn geopolitics (`lib/analytics/geopolitics-meta-guess.ts`)
  chỉ đếm từ trùng, khá thô. Để sau.

## Thứ tự và giá trị

| Phase | Người dùng thấy gì |
|---|---|
| 1 | Ít tag hơn, bài dễ đọc hơn, feedback đúng mức tiếng Anh |
| 2 | Biết rõ mình đúng/sai, câu nào thật sự là vấn đề, học được cho lần sau |
| 3 | Bấm câu thay vì kéo chọn, thấy câu đã chọn, hiểu từng tag |
| 4 | Bắt đầu ở Guided, có hướng dẫn từng bước, lên cấp khi sẵn sàng |
| 5 | Xem lại bài cũ có đáp án |
| 6 | Cùng cách học cho Systems và Evaluative |
