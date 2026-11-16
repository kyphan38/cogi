# Đánh giá chất lượng các bài tập (cogi)

Ngày: 2026-11-15. Chỉ đọc và thử, không sửa code.

## Cách làm

- Đọc prompt tạo bài (`web/src/lib/ai/prompts/`), route tạo bài (`web/src/app/api/ai/route.ts`), route phản hồi (`web/src/app/api/ai/perspective/route.ts`), code chấm điểm (`web/src/lib/exercise/*-score.ts`) và cấu hình cấp độ (`*-levels.ts`).
- Gọi Gemini thật 9 lần, dùng đúng prompt builder và validator của app, ở mức ngôn ngữ mặc định "Intermediate": Analytical (Guided), Analytical từ văn bản thật, Life situations (Guided, Việt Nam), Life situations "My situation" (một tình huống khủng hoảng), Reframe (Standard, Việt Nam), Reframe "My situation" (cùng tình huống khủng hoảng), Strategy (Standard), Evaluative (Standard), Systems. Cả 9 lần đều qua validator, mỗi lần mất 10-15 giây.
- Không xem Geo Lab map quiz, vì một session khác đang sửa phần đó.

Mức ảnh hưởng: **[Cao]** = sai bài học, sai điểm, hoặc rủi ro an toàn. **[TB]** = làm bài dễ quá, khó quá, hoặc không công bằng. **[Thấp]** = nhỏ, sửa khi tiện.

## Nhận xét chung

Thiết kế chính rất tốt. Hầu hết các bài để **code chấm điểm**, còn AI chỉ **giải thích** kết quả mà code đã quyết định ("SCORE (already decided by code - final)"). Vì vậy điểm số ổn định và công bằng hơn nhiều so với để AI tự chấm. App cũng xáo thứ tự đáp án ở mọi nơi (`shuffledOrder`), nên AI hay đặt đáp án đúng ở vị trí 0 cũng không sao. Validator kiểm tra nhiều thứ và có retry một lần.

Các vấn đề lớn nằm ở 4 chỗ:

1. An toàn: "My situation" của Life situations không có kiểm tra khủng hoảng nào. Reframe có kiểm tra, nhưng chỉ bắt được tiếng Anh.
2. Analytical với văn bản thật: prompt bắt AI phải tìm đúng 4 lỗi, kể cả khi văn bản không có lỗi.
3. Chấm điểm Analytical và Systems không trừ điểm khi đánh dấu sai quá nhiều. Đánh dấu tất cả vẫn được điểm cao.
4. Mức ngôn ngữ mặc định (IELTS 6) mô tả quá mơ hồ, nên AI vẫn dùng từ khó.

---

## 1. Analytical (đọc và tìm lỗi lập luận)

### Điểm mạnh

- Code chấm điểm, AI chỉ giải thích: `web/src/lib/exercise/analytical-score.ts:70-115`, `web/src/lib/ai/prompts/analytical-perspective.ts:167-173`.
- Đoạn trích lỗi được gắn lại vào văn bản (`repairAnalyticalSegments`), và mỗi lỗi nằm trong một câu riêng (`analytical.ts:26-27`). Nhờ vậy chọn câu ở Guided và Standard rất ổn.
- Guided có câu hỏi "ý chính là gì" trước khi tìm lỗi, các lựa chọn được xáo thứ tự.
- Expert đôi khi có đoạn văn lập luận tốt (không có lỗi). Đây là bài học hay.
- Phản hồi có cấu trúc rõ: why, clue (trích 2-6 từ), câu hỏi lần sau (tối đa 15 từ). Mẫu thật cho thấy độ dài đúng (khoảng 190 từ ở Guided).

### Vấn đề

**[Cao] 1. Văn bản thật: luôn bắt AI tìm đúng 4 lỗi và 2 câu bẫy.**
- Ở đâu: `web/src/lib/ai/prompts/analytical.ts:316-319` và `:358-360` (bản địa chính trị).
- Bằng chứng: tôi dán một đoạn văn tốt về thử nghiệm A/B (có chia ngẫu nhiên, 4.000 người mỗi nhóm, tự nói rõ giới hạn). AI vẫn "tìm" ra 4 lỗi. Một lỗi là câu "we cannot be sure which change mattered most", bị gắn nhãn "hidden assumption". Thật ra câu này đang thừa nhận giới hạn, tức là lập luận tốt.
- Tác hại: người dùng học sai. Nếu họ thấy văn bản tốt và không đánh dấu, app chấm là "bỏ sót".
- Cách sửa: cho phép 0-4 lỗi với văn bản thật. Thêm vào prompt: "Only list issues that are really there. If the text is sound, return fewer issues, or none, and set isSoundReasoning". Sửa validator khi `userText: true` để chấp nhận 0-4. Khi có 0 lỗi, chấm theo nhánh "sound reasoning".

**[Cao] 2. Đánh dấu sai không bị trừ điểm.**
- Ở đâu: `web/src/lib/exercise/analytical-levels.ts:57-66`. Mục `extraHighlightIds` trong `analytical-score.ts:108` không được dùng khi xếp loại.
- Tác hại: đánh dấu mọi câu là lỗi thì vẫn tìm đủ 4/4 lỗi, chỉ dính 2 bẫy, nên được "ok" và không bao giờ bị "poor". Nặng hơn: với đoạn văn không có lỗi (`total === 0`), người dùng đánh dấu cả chục câu thường (không phải bẫy) vẫn được "good". Mà mục đích của bài này chính là dạy "đừng thấy lỗi ở khắp nơi".
- Cách sửa: tính số câu "thừa" được gắn nhãn lỗi. Chỉ cho "good" khi có tối đa 1 câu thừa. Với đoạn văn không có lỗi, tính câu thừa như dính bẫy.

**[TB] 3. Lỗi quá lộ vì từ tuyệt đối, và độ khó ghi sai.**
- Ở đâu: `analytical.ts:108-115` và `:127-134`. Prompt chỉ nói "Do NOT make issues cartoonishly obvious" nhưng không có quy tắc cụ thể.
- Bằng chứng: cả 4 lỗi trong mẫu Guided đều có từ tuyệt đối: "proves... for everyone", "guaranteed 10 percent", "always... never", "complete... without any penalties". Lỗi "subtle" (khó thấy) thật ra rất dễ thấy. Người dùng chỉ cần săn từ "always" là đủ, không cần suy nghĩ.
- Cách sửa: thêm quy tắc: tối đa 1 lỗi được dùng từ tuyệt đối; lỗi "subtle" không có từ báo hiệu nào; ít nhất 1 câu bẫy có từ báo hiệu (một con số, "always") nhưng vẫn đúng. Có thể thêm kiểm tra trong validator: đếm từ tuyệt đối trong các `textSegment`.

**[Thấp] 4. Quy tắc "trích nguyên văn" chỉ có ở bản địa chính trị.**
- Ở đâu: `TEXT_SEGMENT_RULE` ở `analytical.ts:210` chỉ được dùng ở dòng 275 và 349.
- Cách sửa: thêm quy tắc này vào prompt thường và prompt văn bản thật. Việc này giảm số lần phải retry.

---

## 2. Systems (bản đồ nhân quả và cú sốc)

### Điểm mạnh

- Liên kết có dấu (+/-) rõ nghĩa. Có quy tắc đường lan của cú sốc (`systems.ts:37`). Có archetype (mẫu vòng lặp) để học cách nhìn dùng lại được.
- Khi chấm, các nút "không bị ảnh hưởng" ở cả hai phía không được tính, nên bản đồ trống không được điểm cao (`systems-score.ts:114-115`).
- Liên kết thêm mà AI thấy hợp lý được tính như liên kết đúng, nên một bản đồ khác nhưng vẫn đúng không bị phạt.
- Mẫu thật (giao thông TP.HCM) rất tốt: 6 nút rõ, vòng lặp hợp lý, nhãn gây nhiễu hợp lý.

### Vấn đề

**[Cao] 1. Vẽ thật nhiều liên kết vẫn được điểm tối đa.**
- Ở đâu: `web/src/lib/exercise/systems-score.ts:139-143` và `:156-164`. AI chỉ bắt buộc phải xét 2 liên kết thừa (`:182`).
- Tác hại: vẽ mọi cặp nút thì sẽ "tìm" ra mọi liên kết của model. Các liên kết thừa không hợp lý không bị tính vào mẫu số. Kết quả: phần liên kết được 100%.
- Cách sửa: `total = model + mọi liên kết thừa`, `sound = tìm đúng + liên kết thừa hợp lý`. Liên kết thừa chưa được AI xét thì tính là không hợp lý.

**[TB] 2. Vẽ ngược chiều hoặc sai dấu vẫn được tính là đúng.**
- Ở đâu: `systems-score.ts:96-106`. Hàm `soundLinks` (`:140-143`) dùng `connectionsFound`, không dùng `connectionsExact`.
- Tác hại: "A tăng thì B giảm" và "A tăng thì B tăng" có nghĩa ngược nhau, nhưng điểm như nhau.
- Cách sửa: đúng chiều và đúng dấu = 1 điểm; tìm được cặp nút nhưng sai dấu hoặc sai chiều = 0,5 điểm.

**[Thấp] 3. AI phải tự tính tọa độ x, y.**
- Ở đâu: `web/src/lib/ai/prompts/systems.ts:33`, `:88`, `:156`.
- Cách sửa: code tự đặt 6 nút trên một vòng tròn. Prompt ngắn hơn và ít lỗi validator hơn.

**[Thấp] 4. Chú thích cũ.** `web/src/lib/exercise/systems-levels.ts:13` còn ghi "four link types". Bây giờ chỉ có 2 loại (increases, decreases).

---

## 3. Evaluative (ma trận 2x2, bảng chấm, deal-breaker, rủi ro)

### Điểm mạnh

- Code so sánh với model. Ma trận cho nửa điểm khi đúng một trục (`evaluative-score.ts:186-197`).
- Bảng chấm và bài rủi ro không bao giờ xếp "poor", vì đây là bài cần phán đoán. Như vậy là công bằng.
- Prompt có "no tie at the top" (không hòa ở vị trí đầu). Deal-breaker có quy tắc rõ (`evaluative.ts:197-202`).
- Mẫu thật (chọn laptop): điểm số hợp lý, tiêu chí ẩn hay ("Software Compatibility").

### Vấn đề

**[TB] 1. Danh sách tiêu chí và câu chuyện để lộ đáp án.**
- Ở đâu: `web/src/lib/ai/prompts/evaluative.ts:62` và `:91`.
- Bằng chứng: các tiêu chí gây nhiễu là "RGB Lighting", "Brand Prestige", "Webcam Resolution", "Screen Color", loại ra rất dễ. Câu chuyện cũng gọi tên từng tiêu chí: "far from power outlets" (pin), "budget is tight" (giá), "carry it across campus" (gọn nhẹ).
- Cách sửa: tiêu chí gây nhiễu phải liên quan tới tình huống nhưng ít quan trọng hơn, hoặc trùng ý với tiêu chí thật (ví dụ "Screen size" cạnh "Portability"). Thêm quy tắc: "The scenario describes the situation, never a criterion label or a close synonym".

**[TB] 2. Bảng chấm: chỉ "good" khi lựa chọn đứng đầu trùng với AI.**
- Ở đâu: `web/src/lib/exercise/evaluative-score.ts:190-197`. Ô nào người dùng không chấm thì mặc định là 3 (`:126`, `:132`).
- Tác hại: người dùng có trọng số khác nhưng hợp lý sẽ không bao giờ được gợi ý lên cấp. Người bỏ qua không chấm vẫn có thứ hạng.
- Cách sửa: "good" khi lựa chọn đứng đầu của người dùng nằm trong top 2 của model, và thứ tự khớp với trọng số của chính họ. Bắt buộc chấm hết các ô trước khi nộp.

**[TB] 3. Bài rủi ro: xác suất cộng không đủ 100% thì lựa chọn đó bị bỏ đi mà không báo.**
- Ở đâu: `evaluative-score.ts:152-169` và `web/src/lib/analytics/calibration-evaluative.ts:57-63` (trả về `null`).
- Cách sửa: không cho nộp khi tổng khác 100%, và hiện một dòng báo lỗi ngắn. Cần xem lại UI xem đã chặn chưa.

**[TB] 4. Phản hồi tiêu chí nói trước đáp án, và quá dài.**
- Ở đâu: `web/src/lib/ai/prompts/evaluative-criteria-feedback.ts:47` (gọi tên phần còn thiếu) và `:45` (150-250 từ, văn xuôi).
- Tác hại: người dùng chỉ cần chép lại phần AI vừa nêu. 250 từ là dài với IELTS 6.
- Cách sửa: chỉ gợi ý loại phần còn thiếu ("think about what happens after you buy it"), không gọi tên. Rút xuống 80-120 từ, chia gạch đầu dòng.

**[Thấp] 5. Có dấu gạch nối dài "–" (en dash).** `evaluative.ts:117`, `:126`, `:137`, `:146`. Quy tắc chỉ cấm em dash, nhưng nên đổi thành "-" cho đồng bộ.

---

## 4. Life situations (Judgment)

### Điểm mạnh

- Bối cảnh Việt Nam rất tự nhiên. Mẫu thật: "giữ thể diện" cho đồng nghiệp lớn tuổi khi trình bày slide sai số liệu. Các câu trả lời đều thực tế.
- Chấm theo từng cặp (pairwise), công bằng hơn khoảng cách thứ hạng (`judgment-score.ts:16-33`). Không bao giờ xếp "poor".
- Có quy tắc: đáp án của lăng kính là cách nhìn, không phải hành động, nên không lộ đáp án phần xếp hạng (`judgment.ts:58`).

### Vấn đề

**[Cao, an toàn] 1. "My situation" không có kiểm tra khủng hoảng.**
- Ở đâu: `web/src/app/api/ai/route.ts:292-312` và `web/src/lib/ai/prompts/judgment.ts:26-31`. Reframe có kiểm tra ở `route.ts:263`, Judgment thì không.
- Bằng chứng: tôi gửi một tình huống bằng tiếng Việt: thi trượt, bố mẹ không nói chuyện, "không muốn sống nữa". AI vẫn tạo bài tập. Câu chuyện viết "wishing you could simply vanish and not wake up tomorrow", rồi bắt người dùng xếp hạng 4 cách phản ứng. Trong đó có "Lock yourself in your room, refuse to eat".
- Cách sửa: dùng lại cách làm của Reframe. Gọi `hasCrisisLanguage` trước, thêm khối "SAFETY FIRST" và trường `safety` vào prompt và schema, rồi hiện cùng thông báo hỗ trợ. Nên đổi tên `REFRAME_SUPPORT_MESSAGE` thành tên dùng chung.

**[TB] 2. Lựa chọn sai của lăng kính quá dễ loại.**
- Ở đâu: `judgment.ts:50` ("common but less useful readings").
- Bằng chứng: một lựa chọn sai là "Finding an excuse to finish the meeting ahead of schedule". Không ai nghĩ như vậy cả.
- Cách sửa: mỗi lựa chọn sai phải là cách nhìn mà một người thật trong tình huống này có thể có, và dài gần bằng đáp án đúng.

**[TB] 3. Prompt luôn gọi người học là "beginner", kể cả ở Expert.**
- Ở đâu: `judgment.ts:33`. Giống vậy ở `reframe.ts:42`, `strategy.ts:15`, `strategy.ts:52`.
- Cách sửa: truyền cấp độ vào ("a learner at the Expert level"), hoặc bỏ chữ "beginner" ở Standard và Expert.

---

## 5. Strategy (lý thuyết trò chơi)

### Điểm mạnh

- Validator rất mạnh: không hòa điểm, phải có điểm cân bằng Nash, và kiểm tra đúng dạng trò chơi kinh điển (`web/src/lib/ai/validators/strategy.ts:95-111`). Phần phân tích trò chơi do code làm.
- Trò chơi địa chính trị dùng tên tự đặt, câu chuyện bắt đầu bằng "Suppose", và code kiểm tra tên thật (`validators/strategy.ts:127-139`).
- Có điểm cho dự đoán đúng 1 trong 2 điểm cân bằng.

### Vấn đề

**[TB] 1. Standard quá dễ: câu chuyện kể sẵn kết quả, và trò chơi quá quen.**
- Ở đâu: `web/src/lib/ai/prompts/strategy.ts:17` và `:34`. Cấu hình `strategy-levels.ts` (Standard: "may be a classic shape or a variant").
- Bằng chứng: mẫu là Prisoner's Dilemma kinh điển (7/1/9/3). Câu chuyện viết sẵn "huge windfall... empty tables... razor-thin margins". "Xếp hạng từ câu chuyện" trở thành đọc hiểu, không còn là suy luận.
- Cách sửa: câu chuyện chỉ nêu mục tiêu và ràng buộc của hai bên, không kể kết quả. Câu chuyện của từng ô nêu sự việc, không dùng từ cảm xúc ("huge", "empty"). Code chọn ngẫu nhiên loại trò chơi rồi truyền vào prompt, để không lần nào cũng ra Prisoner's Dilemma.

**[TB] 2. Dự đoán hợp lý theo thứ hạng của chính mình không được tính.**
- Ở đâu: `web/src/lib/exercise/strategy-score.ts:109-119`. Có `predictionConsistent` nhưng không dùng khi xếp loại.
- Tác hại: câu chuyện có thể hiểu nhiều cách. Người dùng suy luận đúng từ thứ hạng của mình vẫn có thể bị "poor".
- Cách sửa: nếu `predictionConsistent` là true thì ít nhất được "ok".

**[Thấp] 3. Hòa điểm giữa các ô khác hàng vẫn được phép.**
- Ở đâu: validator chỉ cấm hòa trong cùng một hàng hoặc cột. `rankCells` (`web/src/lib/exercise/game.ts:92-96`) vẫn xếp các ô hòa theo một thứ tự tùy ý, và người dùng bị trừ điểm `rankCloseness`.
- Cách sửa: ở Standard và Expert, bắt 4 (hoặc 6) điểm của mỗi người chơi khác nhau. Hoặc coi các ô hòa là bằng nhau khi so thứ hạng.

**[Thấp] 4. Chủ đề "Countries & trade" không có quy tắc chống bịa sự thật.**
- Ở đâu: `strategy-levels.ts` (`STRATEGY_AREAS`). Quy tắc sự thật chỉ được thêm cho các chủ đề trong danh sách (`route.ts:210-213`).
- Cách sửa: với chủ đề này, thêm `REAL_WORLD_FACT_RULE`, hoặc bắt dùng tên tự đặt như trò chơi địa chính trị.

---

## 6. Reframe (bẫy suy nghĩ)

### Điểm mạnh

- Quy tắc "realistic không phải là positive" rất hay (`reframe.ts:72`). Có `alsoAccepted` khi một suy nghĩ hợp với nhiều bẫy.
- An toàn hai lớp: code kiểm tra từ khóa, rồi model gắn `safety: "concern"`. Mẫu thật: model bắt được tình huống khủng hoảng viết bằng tiếng Việt không dấu.
- Đánh dấu 2 suy nghĩ hợp lý trở lên là bẫy thì bị "poor". Cách này đúng với mục tiêu của bài (`reframe-score.ts:71-78`).
- Mẫu thật (lỡ đám giỗ ông ở Huế) rất tự nhiên và có ý nghĩa.

### Vấn đề

**[Cao, an toàn] 1. Kiểm tra khủng hoảng bằng code chỉ có tiếng Anh.**
- Ở đâu: `web/src/lib/exercise/reframe-safety.ts:6-16`.
- Tác hại: người dùng là người Việt. Câu như "muốn chết", "tự tử", "không muốn sống nữa" đi qua lớp code. Khi đó chỉ còn model, và model không chắc lần nào cũng bắt được.
- Cách sửa: bỏ dấu tiếng Việt trước khi so, rồi thêm mẫu tiếng Việt: "tu tu", "muon chet", "khong muon song", "tu lam hai", "chet di cho xong", "bien mat" đi cùng "khong muon song"... Nên viết test cho cả bản có dấu và không dấu.

**[TB] 2. Phần viết sau đó không được kiểm tra.**
- Ở đâu: `web/src/lib/ai/prompts/reframe-perspective.ts:47-52`. Chứng cứ ủng hộ, chứng cứ phản bác và suy nghĩ cân bằng được gửi thẳng cho AI phản hồi.
- Cách sửa: chạy `hasCrisisLanguage` trên các trường người dùng viết, trong route phản hồi. Nếu có dấu hiệu, hiện thông báo hỗ trợ thay cho phản hồi.

**[Thấp] 3. Handbook không khớp cấu hình.**
- Ở đâu: `web/src/lib/handbook/content.ts:332` ghi "sometimes most of them" là hợp lý. Nhưng `reframe-levels.ts` cho Expert chỉ 0-3 trên 6 suy nghĩ (tối đa một nửa, có khi không có cái nào).
- Cách sửa: "Some thoughts are fair, sometimes none." Lưu ý: file này đang được session khác sửa, nên làm sau.

---

## 7. Calibration (độ tự tin)

### Điểm mạnh

- Thiết kế tốt nhất trong app. Đáp án lấy từ ngân hàng câu hỏi có nguồn, không do AI viết (`web/src/lib/exercise/calibration-bank.ts:1-6`). Bài tỉ lệ gốc (base rate) do code tạo.
- Có Brier score. Sai số cho phép thông minh: một nửa giá trị thật, từ 1 đến 5 điểm (`calibration-levels.ts`). Phản hồi chỉ dùng số do code tính. Câu đã gặp được đánh dấu `seenBefore`.

### Vấn đề

**[TB] 1. Ngân hàng câu khoảng tin cậy hơi nhỏ.**
- Ở đâu: `calibration-bank.ts` có 57 câu khoảng và 68 câu hai lựa chọn. Expert dùng 7 câu khoảng mỗi bài, nên sau khoảng 8 bài sẽ gặp lại (`web/src/lib/exercise/calibration-math.ts:188-200`).
- Cách sửa: thêm câu (nhất là mục "Vietnam" và "Money & numbers"), giữ quy tắc có nguồn.

**[Thấp] 2. Xếp loại dựa trên ít câu.** Standard chỉ có 4 câu hai lựa chọn, nên Brier score dao động nhiều. Code đã ghi chú điều này. Có thể chỉ gợi ý đổi cấp khi đủ khoảng 15 câu trả lời.

---

## 8. Geo Lab (phần có AI)

- Ghi chú "Close the strait" (`web/src/lib/ai/prompts/geo-strait.ts`) là prompt tốt nhất về an toàn: chỉ dùng FIXED FACTS, validator kiểm tra con số, và câu dưới 20 từ. Nên lấy làm mẫu cho các prompt khác.
- Bản địa chính trị của Analytical, Systems, Evaluative và Strategy đều có `GEO_FACT_RULE` (`geo-rules.ts:5-9`). Tốt.
- Map quiz chưa được xem (session khác đang sửa).

---

## 9. Vấn đề chung cho mọi bài

**[Cao] 1. Mức ngôn ngữ mặc định quá mơ hồ cho IELTS 6.**
- Ở đâu: `web/src/lib/adaptive/language-level.ts:41-42` ("moderate sentence length... occasional common idioms are fine").
- Bằng chứng từ mẫu thật: "unfilial", "solemn", "razor-thin margins", "windfall", "utterly", "retreating early".
- Cách sửa: viết cụ thể như prompt geo-strait: "Keep every sentence under 20 words. No idioms. Use common words; if a rarer word is needed, explain it in brackets". Thêm vài ví dụ từ nên tránh.

**[TB] 2. Quy tắc chống bịa sự thật chỉ áp dụng cho chủ đề có sẵn trong danh sách.**
- Ở đâu: `web/src/app/api/ai/route.ts:210-213` và `web/src/lib/exercise/real-world-topics.ts`.
- Tác hại: chủ đề người dùng tự gõ (ví dụ "Vietnam real estate 2025") hoặc "custom scenario" về sự kiện thật thì không có quy tắc này.
- Cách sửa: thêm một bản ngắn của quy tắc vào mọi prompt tạo bài. Chỉ tốn vài dòng.

**3. Quy tắc trong AGENTS.md.**
- Không tìm thấy em dash trong `web/src` (đã grep). Prompt và comment đều bằng tiếng Anh. Đạt.
- Chỉ có en dash "–" ở vài chỗ (xem Evaluative mục 5, và `web/src/lib/ai/validators/evaluative.ts:132`).
- Tôi chưa xem kỹ chữ trên UI của từng màn hình. Bài review này chỉ tập trung vào AI và chấm điểm.

---

## Top các việc nên sửa (xếp theo mức ảnh hưởng)

1. **Life situations "My situation": thêm kiểm tra khủng hoảng.** Dùng lại cách làm của Reframe. Việc nhỏ, rủi ro cao nhất. (`route.ts:292-312`, `judgment.ts:26-31`)
2. **Reframe: kiểm tra khủng hoảng bằng tiếng Việt** (bỏ dấu rồi so), và kiểm tra cả phần người dùng viết lúc nhận phản hồi. (`reframe-safety.ts:6-16`, route phản hồi)
3. **Analytical văn bản thật: không bắt đủ 4 lỗi nữa.** Cho phép 0-4 lỗi. (`analytical.ts:316-319`, `:358-360`, validator)
4. **Trừ điểm khi đánh dấu thừa** ở Analytical và Systems, nhất là đoạn văn không có lỗi. (`analytical-levels.ts:57-66`, `systems-score.ts:139-164`)
5. **Viết lại hướng dẫn mức ngôn ngữ "Intermediate"** cho đúng IELTS 6: câu dưới 20 từ, không thành ngữ. (`language-level.ts:41-42`)
6. **Analytical: lỗi không được lộ vì từ tuyệt đối**, và độ khó phải khớp nhãn. (`analytical.ts:108-134`)
7. **Evaluative: tiêu chí gây nhiễu phải hợp lý, câu chuyện không gọi tên tiêu chí.** (`evaluative.ts:62`, `:91`)
8. **Strategy Standard: câu chuyện không kể sẵn kết quả, code chọn loại trò chơi.** (`strategy.ts:17`, `:34`)
9. **Systems: sai dấu hoặc ngược chiều chỉ được nửa điểm.** (`systems-score.ts:96-106`, `:140-143`)
10. **Quy tắc chống bịa sự thật cho mọi prompt tạo bài.** (`route.ts:210-213`)

Câu hỏi cho bạn: bạn muốn sửa việc nào trước? Tôi đề nghị làm 1 và 2 cùng nhau (an toàn), rồi tới 3 và 4 (chấm điểm sai).
