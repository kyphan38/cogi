# Plan: hai loại bài tâm lý học - Reframe và Calibration

Viết ngày 2026-10-04, sau buổi trao đổi với chủ app. Chưa bắt đầu.

Quy trình giống `PLAN-learning.md`: mỗi phase một branch, mỗi mục một commit. Cuối
phase: `tsc`, `eslint`, `vitest`, Playwright, build production trong worktree riêng, gọi
Gemini thật để xem chất lượng, chụp màn hình desktop + mobile, hỏi trước khi merge và
push.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Vì sao chỉ hai bài này

Đã chấm từng mảng tâm lý học theo 4 câu: (a) bằng chứng vững không, (b) luyện được bằng
bài ngắn không, (c) có đáp án để chấm không, (d) app đã có chưa.

| Mảng | Kết luận |
|---|---|
| Nhận thức / ra quyết định | **Làm: Calibration** (bằng chứng mạnh, chấm khách quan bằng code) |
| Cảm xúc - CBT | **Làm: Reframe** (bằng chứng mạnh, có bẫy rõ ràng) |
| Quan hệ (cách giải thích hành vi, 4 kiểu giao tiếp phá hoại) | Để sau: bài "Conversation replay" |
| Xã hội & thuyết phục | Để sau: biến thể của Analytical (chỉ chiều phòng thủ) |
| Đàm phán | Để sau: task type trong Strategy |
| EQ riêng | Không làm. Đã nằm trong Life situations; chỉ thêm bước "gọi tên cảm xúc" vào Reframe |
| Tâm lý học tích cực | Không làm. Bằng chứng yếu, không có đáp án đúng/sai |
| Thuyết gắn bó | Không làm bài. Dễ thành dán nhãn / chẩn đoán. Tối đa là một thuật ngữ trong My terms |
| Thói quen ("Habit fix") | Không làm. Thói quen là việc phải làm, không phải bài nghĩ |

Nguyên tắc chung (giữ như `PLAN-learning.md`):

- Mỗi lần thêm **một** loại bài. Dùng vài ngày rồi mới thêm loại tiếp theo.
- Code chấm phần có đáp án; AI chỉ tạo đề và giải thích (Why / Clue / Next time).
- Có bước "Learn first", "My terms", 3 cấp Guided / Standard / Expert, gợi ý lên cấp
  qua `level-suggestion.ts`.
- Bài 10-15 phút. Giao diện và feedback toàn tiếng Anh, đơn sắc, không emoji.
- Luyện **quy trình** ("Next time, ask..."), không luyện thuộc tên khái niệm: biết tên
  thiên kiến không làm bớt thiên kiến.

Thứ tự đề xuất: **P1 Reframe -> P2 Calibration**. Reframe dùng lại gần như toàn bộ
engine tag + bẫy + answer key của Analytical nên rủi ro thấp; Calibration cần một ngân
hàng câu hỏi có nguồn, tốn công nội dung hơn. `[QUYẾT ĐỊNH]` đảo thứ tự nếu muốn.

---

## Phase P1 - Reframe (lỗi suy nghĩ theo CBT)

**Xong phần code (2026-10-04)**, branch `claude/nice-tesla-0trqiz`. Unit 593/593, E2E
141/141 (chạy `--workers=1`), `tsc` sạch, eslint 0 lỗi, chụp màn hình desktop + mobile.
**Chưa gọi Gemini thật** (container không có `GEMINI_API_KEY`): cần thử vài bài ở cả 3
cấp trước khi merge.

- Loại bài `reframe` ở `/exercise/reframe`, có trong Practice, History, Handbook.
- **Khác plan:**
  - Suy nghĩ thực tế là `trap: "realistic"` thay vì `null`, để schema gửi Gemini không
    cần `anyOf`/`null`.
  - Expert: độc thoại là các câu bấm được (không chọn tự do từng cụm từ như Analytical);
    câu không đánh dấu được tính là "Realistic".
  - Guided giữ lựa chọn đầu tiên cho mỗi suy nghĩ rồi mới hiện đáp án, nên điểm vẫn trung
    thực.
- **An toàn "My situation":** server kiểm tra từ ngữ khủng hoảng tiếng Anh (app chỉ dùng
  tiếng Anh; có test tránh báo nhầm "killing me") trước khi gọi AI; model cũng có thể trả
  `safety: "concern"`. Cả hai trường hợp hiện lời nhắn hỗ trợ, không tạo bài.
- **Còn chờ chủ app:** số đường dây hỗ trợ ở Việt Nam (hiện chỉ ghi "liên hệ dịch vụ khẩn
  cấp / người tin cậy / chuyên gia"); tên "Reframe" giữ tạm.

**Luyện gì:** nhận ra suy nghĩ tự động bị méo (cognitive distortion), tách nó khỏi suy
nghĩ thực tế, và viết lại thành suy nghĩ cân bằng. Gốc: thought record của CBT (Beck,
Burns). Đây là bài luyện tư duy, **không phải trị liệu**: ghi rõ trong Setup và Handbook.

**Điểm học quan trọng nhất:** reframe không phải là "nghĩ tích cực". Câu "Mọi chuyện rồi
sẽ ổn thôi" cũng là một suy nghĩ không có bằng chứng. Mọi cấp đều có đáp án nhiễu kiểu
này.

### Luồng

1. **Learn first:** 3-5 lỗi suy nghĩ dùng trong bài (tên, một câu định nghĩa, ví dụ đời
   thường) + 1-2 câu hỏi kiểm tra. Dùng lại khung `concepts` / `conceptChecks` có sẵn.
2. **Đọc tình huống** (người thứ ba, ví dụ "Linh vừa bị sếp góp ý trước cả nhóm") và
   danh sách suy nghĩ của nhân vật.
3. **Gọi tên cảm xúc và chấm cường độ 0-100.** Chọn từ danh sách cảm xúc cụ thể (không
   chỉ "buồn", "bực"). Không chấm điểm phần này; nó là phần EQ đã quyết định giữ lại.
4. **Tag từng suy nghĩ:** lỗi nào, hoặc "Realistic" (bẫy).
5. **Viết lại** một suy nghĩ thành suy nghĩ cân bằng: bằng chứng ủng hộ, bằng chứng phản
   bác, câu mới.
6. **Chấm lại cảm xúc** sau khi viết lại (chỉ để người dùng tự thấy, không chấm điểm).
7. Feedback.

### Danh sách lỗi suy nghĩ (tag)

| Tag | Câu hỏi kiểm tra |
|---|---|
| All-or-nothing | Có chỉ hai cực, không có ở giữa? |
| Catastrophizing | Có nhảy tới kết quả tệ nhất? |
| Mind reading | Có đoán người khác nghĩ gì mà chưa hỏi? |
| Should statements | Có "phải", "lẽ ra" cứng nhắc? |
| Overgeneralizing | Một lần thành "luôn luôn", "không bao giờ"? |
| Fortune telling | Có khẳng định tương lai như chắc chắn? |
| Labeling | Một hành động thành nhãn cho cả con người ("mình là đồ vô dụng")? |
| Personalizing | Tự nhận hết lỗi cho chuyện có nhiều nguyên nhân? |
| Emotional reasoning | "Mình cảm thấy vậy nên chắc nó đúng"? |
| Discounting the positive | Gạt bỏ điều tốt ("chỉ là may thôi")? |
| **Realistic** (bẫy) | Có bằng chứng, đúng mức, không méo? |

Các lỗi chồng lên nhau (catastrophizing và fortune telling hay đi cùng). Vì vậy mỗi suy
nghĩ trong đề có `primaryTag` và `alsoAccepted[]`. Giống Analytical: **tìm ra suy nghĩ
méo quan trọng hơn gọi đúng tên**.

### Cấp độ (`reframe-levels.ts`)

| | Guided | Standard | Expert |
|---|---|---|---|
| Tình huống | Đời thường, ít áp lực | Công việc, gia đình, tiền bạc | Nhiều người, áp lực cao |
| Suy nghĩ | 4, mỗi màn hình một câu | 6 trên một màn hình | Một đoạn độc thoại nội tâm; tự chọn cụm từ (như Analytical Expert) |
| Tag được dùng | 4 (All-or-nothing, Catastrophizing, Mind reading, Should) | 8 | Cả 10 |
| Bẫy "Realistic" | 1, có báo trước | 1-2, báo số suy nghĩ méo | 0-3, không báo; có khi gần như toàn suy nghĩ thực tế |
| Viết lại | Chọn 1 trong 3 câu (1 cân bằng, 1 "nghĩ tích cực" vô căn cứ, 1 lỗi khác) | Tự viết cho 1 suy nghĩ; AI nhận xét | Tự viết bằng chứng ủng hộ / phản bác + câu mới |
| "My situation" | Không | Có | Có |
| Thời gian | khoảng 10 phút | khoảng 15 phút | 15-20 phút |

### Chấm bằng code (`reframe-score.ts`)

- `found`: số suy nghĩ méo được đánh dấu là méo (bất kỳ tag lỗi nào).
- `tagMatched`: số suy nghĩ có tag thuộc `primaryTag` hoặc `alsoAccepted`.
- `trapsHit`: số suy nghĩ "Realistic" bị gắn tag lỗi.
- Guided: câu viết lại chọn đúng câu cân bằng hay không.
- Rating (cho gợi ý lên cấp), theo `rateAnalytical`: good khi tìm ra ít nhất 75% và
  trúng bẫy nhiều nhất 1; poor khi tìm ra nhiều nhất 25%. **Khác Analytical:** trúng từ
  2 bẫy trở lên cũng là poor, vì gắn lỗi cho suy nghĩ thực tế chính là thói quen bài này
  muốn sửa. Bài không có suy nghĩ méo chỉ chấm theo bẫy (giống Analytical).
- Câu viết lại (Standard, Expert): **không chấm điểm**. AI nhận xét theo 3 tiêu chí cố
  định: có dựa trên bằng chứng không, có công bằng với cả điều xấu thật không, có phải
  chỉ là nghĩ tích cực không.

### "My situation" và an toàn `[QUYẾT ĐỊNH]`

Người dùng có thể viết chuyện rất nặng. Trước khi tạo bài từ chuyện thật:

- Bước tạo đề trả thêm trường `safety: "ok" | "concern"`. Khi là `concern` (nhắc tới tự
  hại, bạo lực, khủng hoảng), app **không tạo bài**, hiện một thông báo ngắn, bình tĩnh:
  bài này không thay cho người thật, hãy nói chuyện với người tin cậy hoặc chuyên gia,
  kèm số đường dây hỗ trợ.
- Chủ app chọn và **tự kiểm tra** số đường dây hỗ trợ ở Việt Nam trước khi đưa vào app
  (không để AI tự sinh số).
- Ghi rõ ở Setup: nội dung được lưu trong History trên Firestore của bạn; đừng ghi tên
  thật.

### Việc cần làm (theo cách L2 Strategy đã thêm loại bài)

1. `feat(api)`: kiểu dữ liệu trong `lib/types/exercise.ts` (thêm `"reframe"` vào
   `ThinkingType`), `levels.ts` (`LevelledExerciseType`), `reframe-levels.ts`, prompt
   tạo đề `lib/ai/prompts/reframe.ts`, validator `lib/ai/validators/reframe.ts` (đúng số
   suy nghĩ, số bẫy, tag hợp lệ cho cấp, trường `safety`), `response-schemas.ts`, route
   `api/ai/route.ts`, `reframe-score.ts` + test, prompt feedback
   `reframe-perspective.ts` + route perspective, `level-suggestion.ts`,
   `practiced-topic.ts`.
2. `feat(exercise)`: `ReframeExerciseFlow.tsx`, `ReframeAnswerKey.tsx` (dùng lại khung
   answer key của Analytical), trang `exercise/[type]`, History, mode card, E2E
   `reframe-exercise.spec.ts` + helper đăng nhập, kiểm tra tràn màn hình mobile.
3. `docs(handbook)`: entry `reframe` trong `lib/handbook/content.ts` (`content.test.ts`
   sẽ báo lỗi nếu thiếu). Text cấp độ phải khớp `reframe-levels.ts`.

### Câu hỏi còn mở

- `[QUYẾT ĐỊNH]` Tên trong app: "Reframe" hay "Thinking traps"?
- `[QUYẾT ĐỊNH]` Có thêm bối cảnh Việt Nam như Life situations không (đề xuất: có, dùng
  chung lựa chọn `JudgmentContext`).

---

## Phase P2 - Calibration (độ tự tin khớp với sự thật)

**Xong phần code (2026-10-04)**, branch `claude/nice-tesla-0trqiz`. Unit 610/610, E2E
147/147 (chạy `--workers=1`), `tsc` sạch, eslint 0 lỗi, chụp màn hình desktop + mobile. Chưa gọi
Gemini thật cho phần feedback (container không có key); phần đề và đáp án không dùng AI.

- Loại bài `calibration` ở `/exercise/calibration`, có trong Practice, History, Handbook.
- **Ngân hàng câu hỏi: 125 câu** (68 câu hai lựa chọn, 57 câu khoảng) trong
  `lib/exercise/calibration-bank.ts`, mỗi câu có nguồn. Ít hơn mục tiêu 200: ưu tiên câu
  chắc chắn đúng. Đủ cho mọi cấp ở mọi nhóm; khi hết câu chưa gặp thì lặp lại câu cũ nhất.
- **Đã đối chiếu bằng web (2026-10-04):** 24 câu toán tính lại bằng code; khoảng 60 câu
  dữ kiện tra cứu. Đã sửa: Mekong (4,350-4,900 km), kim tự tháp (146.6 m), Fansipan
  (3,147 m), dân số Đức (83.6 triệu), lời câu Liên Hợp Quốc. Đã thay hoặc bỏ câu có hai
  đáp án tùy cách đo: Úc so với 48 bang Mỹ (đất liền hay cả mặt nước), diện tích Sahara
  (8.6 hay 9.2 triệu km²), bờ biển Việt Nam (3,260 hay 3,444 km). Quy tắc: câu khoảng chỉ
  dùng số mà các nguồn thống nhất.
- **Khác plan:**
  - Không gọi AI để tạo đề. Bài base rate dùng 6 khung câu chuyện cố định trong code
    (`calibration-math.ts`); code chọn số và tính đáp án. Learn first cũng cố định. Nhờ vậy
    đề tạo tức thì và không thể sai đáp án vì AI.
  - Câu khoảng không dùng năm (năm làm phép "rộng bao nhiêu lần" vô nghĩa); câu về năm
    nằm ở dạng hai lựa chọn.
  - Thay interval score bằng quy tắc dễ hiểu: khoảng "rất rộng" khi đầu cao lớn hơn 10 lần
    đầu thấp; trúng hết nhưng quá nửa số khoảng rất rộng thì chỉ là "ok".
  - "Sai hết base rate" chỉ tính là poor khi có từ 2 bài base rate (Guided chỉ có 1).
- Biểu đồ "How sure vs how right" trên History hiện khi có từ 30 câu trả lời: chấm theo
  mức tự tin so với đường chéo "perfect", kèm tooltip và bảng số liệu. Chưa gộp
  `confidenceBefore` của các loại bài khác (để sau, như đã đề xuất).

**Luyện gì:** biết mình chắc đến đâu. Người hay quá tự tin: khi nói "chắc 80%", họ thường
chỉ đúng khoảng 50%. Thêm bài toán base rate (bỏ quên tỉ lệ nền) vì đây là lỗi xác suất
phổ biến nhất. Gốc: Tetlock (*Superforecasting*), Kahneman & Tversky.

### Nguyên tắc quan trọng nhất: đáp án không do AI tự nghĩ ra

AI hay bịa số liệu. Nếu đáp án sai thì cả bài vô nghĩa. Vì vậy:

- **Câu ước lượng và câu hai lựa chọn** lấy từ **ngân hàng câu hỏi tĩnh trong code**
  (`lib/exercise/calibration-bank.ts`): mỗi câu có đáp án, đơn vị, nguồn, năm. Ưu tiên sự
  kiện ít thay đổi (năm lịch sử, địa lý, khoa học). Chỉ dùng số liệu thay đổi (dân số,
  GDP) khi ghi rõ năm.
- **Bài toán base rate:** code sinh con số (tỉ lệ nền, độ nhạy, tỉ lệ dương tính giả),
  code tính đáp án bằng Bayes. AI chỉ viết câu chuyện quanh các con số đó; validator kiểm
  tra câu chuyện dùng đúng các con số.
- AI chỉ làm: Learn first, câu chuyện base rate, giải thích trong feedback.

### Luồng

1. **Learn first:** "80% chắc nghĩa là gì", khoảng tin cậy, tỉ lệ nền + 1-2 câu kiểm tra.
2. **Trả lời từng câu** kèm độ tự tin:
   - Hai lựa chọn: chọn A hoặc B, rồi chọn mức chắc 50 / 60 / 70 / 80 / 90 / 100%.
   - Khoảng: nhập giá trị thấp và cao sao cho chắc 80% (Expert: 90%) đáp án nằm giữa.
   - Base rate: nhập xác suất (%).
3. **Feedback:** đáp án và nguồn từng câu; biểu đồ "chắc bao nhiêu / đúng bao nhiêu";
   câu "Next time, ask" (ví dụ: "Mình sẽ ngạc nhiên nếu đáp án nằm ngoài khoảng này
   không?").

### Cấp độ (`calibration-levels.ts`)

| | Guided | Standard | Expert |
|---|---|---|---|
| Câu hai lựa chọn | 8 | 4 | 0 |
| Câu khoảng | 0 | 4, mục tiêu 80% | 7, mục tiêu 90% |
| Base rate | 1, có bảng tần số "trong 1.000 người" | 2, bảng tần số ẩn sau nút | 3, không gợi ý, có bài nhiều bước |
| Gợi ý | Mẹo "nghĩ một con số chắc chắn quá thấp, một con số chắc chắn quá cao" | Mẹo ẩn sau nút | Không |
| Thời gian | khoảng 10 phút | khoảng 12 phút | khoảng 15 phút |

Người dùng chọn nhóm chủ đề của ngân hàng (History, Geography, Science, Economy, Vietnam,
Everyday). Code không lặp lại câu đã gặp, bằng cách đọc id câu hỏi từ các bài đã làm
(không cần collection Firestore mới, không phải đổi rules).

### Chấm bằng code (`calibration-score.ts`)

- Câu hai lựa chọn: **Brier score** và bảng theo mức chắc (đã nói 70% thì đúng mấy câu).
- Câu khoảng: **tỉ lệ trúng** so với mục tiêu. Để không "gian lận" bằng khoảng thật rộng,
  tính thêm **interval score** (Gneiting & Raftery: khoảng rộng bị trừ điểm, trượt bị phạt
  theo độ xa).
- Base rate: đúng khi sai lệch không quá 5 điểm phần trăm so với đáp án của code.
- Rating cho gợi ý lên cấp:
  - good: base rate đúng hết; tỉ lệ trúng gần mục tiêu (Standard 65-95%, Expert
    75-100%); Brier dưới 0,2 (Guided).
  - poor: tỉ lệ trúng dưới một nửa mục tiêu, hoặc sai hết base rate.
  - Khoảng quá rộng (trúng 100% nhưng interval score kém) chỉ là "ok", không phải "good".
- **Giới hạn trung thực:** một bài chỉ có 4-8 câu nên kết quả một bài dao động nhiều. Ghi
  rõ trong feedback; con số đáng tin là biểu đồ gộp nhiều bài (mục dưới).

### Biểu đồ calibration gộp

- Trang History thêm mục "How sure vs how right": gộp mọi câu của mọi bài Calibration;
  cần từ 30 câu trở lên mới hiện.
- `[QUYẾT ĐỊNH]` Gộp thêm `confidenceBefore` mà mọi loại bài đã ghi (so với kết quả code
  chấm)? Rẻ vì dữ liệu đã có, nhưng ý nghĩa khác (tự tin về cả bài, không phải từng câu).
  Đề xuất: làm sau, thành một đường riêng.
- Đọc skill `dataviz` trước khi vẽ biểu đồ.

### Ngân hàng câu hỏi `[QUYẾT ĐỊNH]`

- Cần khoảng 200 câu (khoảng 30 câu mỗi nhóm), có nguồn, để không lặp trong vài tháng.
- Đề xuất: agent soạn bản nháp kèm nguồn; chủ app kiểm tra ngẫu nhiên khoảng 20% trước
  khi merge.
- Test: id không trùng, có nguồn, đáp án là số hữu hạn, đủ câu cho mỗi nhóm ở mỗi cấp.

### Việc cần làm

1. `feat(exercise)`: `calibration-bank.ts` + test, `calibration-levels.ts`, phần sinh
   số và tính Bayes cho base rate (`calibration-math.ts`) + test, `calibration-score.ts`
   + test.
2. `feat(api)`: kiểu dữ liệu, prompt + validator cho câu chuyện base rate và Learn first,
   prompt feedback, route, `level-suggestion.ts`, `practiced-topic.ts`.
3. `feat(exercise)`: `CalibrationExerciseFlow.tsx`, answer key, trang, History, mode
   card, E2E.
4. `feat(history)`: biểu đồ "How sure vs how right".
5. `docs(handbook)`: entry `calibration`, khớp `calibration-levels.ts`.

---

## Không làm trong plan này

- Không có điểm "EQ", "IQ" hay bất kỳ chỉ số tâm lý nào.
- Không chẩn đoán, không dán nhãn kiểu tính cách / kiểu gắn bó.
- Không dùng nghiên cứu đã thất bại khi kiểm chứng lại (ego depletion, power posing,
  social priming, tỉ lệ tích cực 3:1, Stanford Prison Experiment).
- Conversation replay, Influence, đàm phán: chỉ xem xét sau khi P1 và P2 đã được dùng
  thật vài tuần.
