# Plan: tính năng học mới (lý thuyết trò chơi, tình huống đời sống, chủ đề kinh tế)

Viết ngày 2026-10-03, sau buổi trao đổi với chủ app. Chưa bắt đầu.

Quy trình giống `PLAN-analytical.md`: mỗi phase một branch, mỗi mục một commit (đúng
`.cursor/rules/git-commits.mdc`). Cuối phase: `tsc`, `eslint`, `vitest`, Playwright,
build production trong worktree riêng, gọi Gemini thật để xem chất lượng, chụp màn hình
desktop + mobile, hỏi trước khi merge và push.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Nguyên tắc cho người mới (áp dụng cho mọi tính năng trong file này)

Chủ app tự nhận mình còn mới. Mục tiêu số 1: **không bị ngợp lúc bắt đầu**.

1. **Đi từ dễ đến khó.** Mọi loại bài mới dùng khung cấp độ sẵn có
   (`lib/exercise/levels.ts`): mặc định Guided, người dùng tự chọn, app chỉ gợi ý lên
   cấp khi làm tốt 3 bài liên tiếp.
2. **Guided là bản nhỏ nhất của bài.** Ít yếu tố nhất (2 người chơi, 2 lựa chọn, 3 cách
   phản ứng...), mỗi màn hình một câu hỏi, luôn có gợi ý.
3. **Học trước, làm sau.** Bước "Learn first" (bên dưới) ở đầu mọi loại bài mới.
4. **Mỗi lần chỉ thêm một loại bài mới.** Dùng vài ngày rồi mới thêm loại tiếp theo.
5. **Bài ngắn.** Mục tiêu 10-15 phút một bài; ghi thời gian ước tính ở màn hình Setup.
6. **Feedback giống Phase 2/6a:** code chấm phần có đáp án, AI chỉ giải thích (Why /
   Clue / Next time), không bắt "cách tốt hơn", tình huống chủ quan nói "gần / khác".

## Bước "Learn first" (dùng chung)

Bạn không cần tự nhớ: app dẫn từng bước.

1. Khi tạo bài, AI tạo luôn **3-5 thuật ngữ cho đúng bài đó**: tên, định nghĩa một câu
   (theo language level), một ví dụ đời thường.
2. **1-2 câu hỏi kiểm tra** trắc nghiệm (thứ tự đáp án xáo theo id bài, như câu hỏi ý
   chính ở Analytical).
3. Làm bài. Màn hình làm bài có nút mở lại thuật ngữ.
4. Feedback AI **dùng lại đúng các thuật ngữ đó**.
5. **"My terms":** trang liệt kê thuật ngữ đã gặp, gom từ các bài đã làm (lưu trên dòng
   bài tập, không cần collection Firestore mới, nên không phải đổi rules). Sau này có thể
   đưa sang flashcard của noda để ôn lặp lại.

Dữ liệu: thêm `concepts[{ term, plain, example }]` và `conceptChecks[{ question,
options[3], answerIndex, explanation }]` vào bài; validator kiểm tra số lượng và đáp án.

---

## Phase L1 - Tình huống đời sống (3 lăng kính) - XONG

**Xong (2026-10-03)**, branch `learning/l1-life-situations`. Unit 540/540, E2E 118/118,
`tsc` sạch, eslint 0 lỗi, build production đạt. Chủ app chọn thứ tự L1 -> L3 -> L2 -> L4.
Gọi Gemini thật: 4/4 bài tạo mới đạt ngay lần đầu (bối cảnh Việt Nam tự nhiên; "Tình huống
của tôi" giữ đúng sự việc); nhận xét giữ kết luận của code, giải thích qua 3 lăng kính.

- Loại bài `judgment` ("Life situations") ở `/exercise/judgment`; trang "My terms" ở
  `/terms` (link từ History).
- AI hay đặt cách tốt nhất ở `r1` (3/3 bài Guided), nên giao diện xáo thứ tự cách phản
  ứng và các lựa chọn theo id bài.
- Guided: câu hỏi lăng kính hiện đáp án và giải thích ngay (học ngay tại chỗ), nên phần
  "Lenses matched" ở cấp này dễ đạt; Standard không hiện đáp án trước.
- Một lần Gemini trả lỗi 504 (phía máy chủ Gemini); bấm Generate lại là được.

Dạng bài phán đoán tình huống (Situational Judgment Test). Không gọi là "luyện IQ/EQ/
AQ" (đó là chỉ số, không phải kỹ năng); dùng chúng làm 3 lăng kính:

| Lăng kính | Câu hỏi | Gốc |
|---|---|---|
| Nghĩ rõ | Vấn đề thật là gì? Có những lựa chọn nào? Hậu quả? Có số cần tính? | IQ (suy luận) |
| Hiểu người | Mình cảm thấy gì? Người kia cảm thấy gì, cần gì? Nói sao để họ nghe? | EQ |
| Đứng vững | Phần nào mình kiểm soát? Trách nhiệm của mình? Ảnh hưởng rộng và lâu tới đâu? | AQ (khung CORE) |

**Luồng:** Learn first (3 lăng kính + 1-2 khái niệm, ví dụ "gọi tên cảm xúc") → đọc
tình huống → câu hỏi theo lăng kính → xếp hạng các cách phản ứng → 1-2 câu "vì sao" →
feedback.

**Chấm bằng code:** khoảng cách giữa thứ hạng của bạn và của chuyên gia, có trùng cách
tốt nhất không, câu trả lời lăng kính so với đáp án. Tình huống xã hội không có đáp án
tuyệt đối, nên dùng "gần / khác" như Evaluative.

| | Guided | Standard | Expert |
|---|---|---|---|
| Tình huống | Đời thường, ít áp lực | Công việc, tiền bạc | Áp lực cao, nhiều bên |
| Cách phản ứng | 3, xếp hạng | 4, xếp hạng | Tự viết cách phản ứng, AI nhận xét |
| Câu hỏi lăng kính | Trắc nghiệm, luôn hiện | Trắc nghiệm, mở khi cần | Tự viết |
| "Tình huống của tôi" | Không | Có | Có |

- **Bối cảnh:** chọn "Việt Nam" hoặc "chung" (cách phản ứng tốt với sếp, gia đình khác
  nhau giữa các văn hóa).
- **"Tình huống của tôi":** tự viết chuyện thật đã xảy ra, app tạo bài 3 lăng kính (giống
  "My scenario"). Lưu ý: nội dung riêng tư, được lưu trên Firestore của bạn.
- Đánh giá cho gợi ý lên cấp: tốt khi cách tốt nhất trùng chuyên gia và thứ hạng gần;
  không bao giờ "yếu" (chủ quan).

## Phase L2 - Tình huống chiến lược (lý thuyết trò chơi) - XONG

**Xong (2026-10-03)**, branch `learning/l2-strategic-situations`. Unit 556/556, E2E
127/127, `tsc` sạch, eslint 0 lỗi, build production đạt. Gọi Gemini thật: 5/5 bài tạo
mới hợp lệ ngay lần đầu ở cả 3 cấp; nhận xét dùng đúng số điểm, tìm ra cả 2 điểm cân
bằng của trò "săn hươu", và ghi nhận khi dự đoán đi đúng từ bảng xếp hạng của người dùng.

- Loại bài `strategy` ("Strategic situations") ở `/exercise/strategy`. Phần toán
  (`lib/exercise/game.ts`) tính phản ứng tốt nhất, cân bằng Nash, chiến lược trội, ô tốt
  hơn cho cả hai; feedback dùng các kết quả này làm sự thật.
- **Khác plan:** Expert chưa có cây trò chơi (lượt đi nối tiếp). Thay vào đó Expert là
  ma trận 3x2 không có số, thêm câu hỏi chiến lược trội và "tốt hơn cho cả hai". Cây trò
  chơi để sau nếu cần.
- Nhãn loại trò chơi do AI gán (ví dụ "coordination") có lúc sai so với toán, nên app
  không hiển thị nhãn đó.
- Hình minh họa: "phương pháp gạch chân" của sách giáo khoa trong bảng kết quả.

**Luồng:** Learn first (ví dụ: player, payoff, dominant strategy, Nash equilibrium) →
đọc tình huống thật (cuộc chiến giá, đàm phán lương, thuế quan) → xác định người chơi và
lựa chọn → điền ma trận lợi ích → đoán kết quả → 1 câu "vì sao" → feedback dùng lại
thuật ngữ.

**Chấm bằng code:** điểm cân bằng Nash và chiến lược trội tính bằng toán từ lợi ích của
model; so thứ tự lợi ích của bạn (không cần đúng con số, chỉ cần đúng thứ tự cho mỗi người
chơi) và kết quả bạn đoán.

**Hình minh họa:** ma trận 2x2 có mũi tên "phản ứng tốt nhất" của mỗi người chơi; cây trò
chơi ở Expert.

| | Guided | Standard | Expert |
|---|---|---|---|
| Kích thước | 2 người x 2 lựa chọn | 2 x 2 hoặc 2 x 3 | Có lượt đi nối tiếp (cây trò chơi) |
| Ma trận | Cho sẵn lợi ích; bạn tìm phản ứng tốt nhất và điểm cân bằng | Bạn tự xếp thứ tự lợi ích từ câu chuyện | Tự dựng từ tin tức thật |
| Dạng trò chơi | Kinh điển (song đề tù nhân, phối hợp, gà con) | Biến thể đời thực | Bất kỳ |

## Phase L3 - Lộ trình chủ đề kinh tế, tài chính, địa chính trị - XONG

**Xong (2026-10-03)**, branch `learning/l3-topic-tracks`. Unit 548/548, E2E 122/122,
`tsc` sạch, eslint 0 lỗi, build production đạt. Gọi Gemini thật: cả 15 bước tạo bài
đạt ngay lần đầu ở cấp Guided.

- 3 lộ trình x 5 bước: "Money and interest rates", "Prices and inflation", "How
  countries trade and compete" (`lib/exercise/tracks.ts`). Home có thẻ "Learning
  track"; trang `/tracks` liệt kê mọi bước.
- Không cần dữ liệu mới: một bước xong khi có bài đã hoàn thành cùng loại và cùng chủ
  đề. Bấm Start mở bài với chủ đề điền sẵn; người dùng vẫn tự chọn cấp và bấm Generate
  (tránh tạo bài trước khi cấp đã tải xong).
- Mỗi bước chạy ở cấp hiện tại của người dùng cho loại bài đó (người mới: Guided), thay
  vì ép Guided, để không kéo người đã lên cấp xuống.
- Lộ trình địa chính trị viết chủ đề không chứa từ khóa geopolitics, để không bị ép lên
  Expert; có test chặn.
- Phát hiện lỗi ngoài phạm vi: từ khóa `"bri"` so khớp chuỗi con ("bring", "bridge"...)
  nên nhiều chủ đề thường bị coi là geopolitics. Đã tạo việc riêng để sửa.

Gần như không thêm code: danh sách chủ đề có thứ tự, mỗi mục chỉ ra loại bài + chủ đề +
cấp. Ví dụ lộ trình "Tiền và lãi suất":

1. Analytical (Guided): bài về "lãi suất tăng thì ai thiệt?"
2. Systems (Guided): bản đồ ngân hàng trung ương - lãi suất - vay mua nhà - lạm phát
3. Evaluative (Guided): gửi tiết kiệm hay trả nợ trước?

Màn hình Practice hiện "mục tiếp theo" của lộ trình đang theo; đánh dấu xong khi làm bài.
Lộ trình đầu tiên toàn cấp Guided.

## Phase L4 - Systems: dự đoán chuỗi tác động + mô phỏng nhỏ

- Trước khi xem cú sốc lan ra sao, bạn đoán chuỗi A -> B -> C; code so với chuỗi của
  model.
- Mô phỏng nhỏ cho vài chủ đề kinh tế: kéo thanh lãi suất, thấy tiền trả góp, lạm phát,
  tỷ giá đổi theo (công thức đơn giản, ghi rõ là minh họa, không phải dự báo).

---

## Thứ tự đề xuất

1. **L1 Tình huống đời sống** - gần nhu cầu nhất, dùng lại nhiều phần Evaluative.
2. **L3 Lộ trình chủ đề** - rẻ, học được ngay với 3 loại bài sẵn có.
3. **L2 Tình huống chiến lược** - loại bài mới thứ hai, sau khi đã quen L1.
4. **L4 Systems mở rộng.**

Không làm: tính năng "luyện IQ" (bằng chứng chuyển giao yếu) và "luyện AQ" riêng (thuộc
sức khỏe tinh thần); phần dùng được của chúng đã nằm trong 3 lăng kính của L1.

## Ngoài app: cách cải thiện thật

- **IQ:** phần gốc khá ổn định ở người lớn; tăng "thông minh hiệu quả" bằng kiến thức
  nền, mô hình tư duy, thói quen nghĩ có cấu trúc, ngủ đủ.
- **EQ:** gọi tên cảm xúc chính xác, dừng lại trước khi phản ứng, hỏi lại người thật xem
  mình hiểu đúng không.
- **AQ:** sau mỗi lần vấp, ghi lại: phần nào kiểm soát được, lần sau làm gì khác.
