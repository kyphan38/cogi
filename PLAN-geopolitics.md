# Plan: học địa chính trị bằng tương tác và hình ảnh ("Geo Lab")

Viết ngày 2026-10-04, sau buổi review phần địa chính trị với chủ app. Chưa bắt đầu.

Quy trình giống các plan trước: mỗi phase một branch, mỗi mục một commit. Cuối phase:
`tsc`, `eslint`, `vitest`, Playwright (`--workers=1`), build production, gọi Gemini
thật để xem chất lượng, chụp màn hình desktop + mobile, cập nhật Handbook trong cùng
thay đổi, hỏi trước khi merge và push.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Hiện trạng (review 2026-10-04)

| Nơi | Đang luyện | Đánh giá |
|---|---|---|
| Analytical (geo) | Đoạn phân tích 300-400 từ; 4 lỗi (framing bias, missing actor, assumed causation, analogy misuse) + 2 bẫy; đoán góc nhìn ẩn và tác nhân bị bỏ sót | Đúng kỹ năng cốt lõi |
| Systems (geo) | Cùng 6 node, hai góc nhìn A/B, cùng cú sốc lan khác nhau | Thiết kế tốt |
| Evaluative (geo) | Tiêu chí = lợi ích các bên; bước lập bản đồ các bên | Tốt |
| Strategy | Nút "Countries & trade" nhưng là game theory thường | Bỏ phí: game theory là xương sống của địa chính trị |
| Lộ trình "How countries trade" | Cố ý tránh từ khóa geo | Thực ra là kinh tế thương mại |

**5 lỗ hổng:**

1. **Bức tường cho người mới:** bài geo luôn ở mức Expert, không có Learn first, không
   tính vào gợi ý lên cấp (`level-suggestion.ts` bỏ qua dòng geo).
2. **Lăng kính dùng sai chỗ:** Realist / Liberal / Constructivist / Political economy /
   Geographical determinism đang là *topic* trong danh mục, trong khi chúng là *công cụ*
   để nhìn mọi topic.
3. **Chấm đoán góc nhìn yếu:** `computeMetaGuessScore` đếm từ trùng nhau ("Washington's
   view" so với "US-aligned think tank" được 0 điểm), dù đáp án luôn thuộc một danh sách
   cố định 10 góc nhìn.
4. **Rủi ro học nhầm dữ kiện:** prompt yêu cầu đoạn văn "đọc như phân tích thật"; AI có
   thể bịa số liệu, sự kiện, ngày tháng mà người dùng không phân biệt được.
5. **Không có bản đồ và dòng thời gian:** địa chính trị gắn với không gian và chuỗi sự
   kiện; app hiện chỉ có chữ và đồ thị node trừu tượng.

## Nguyên tắc cho cả plan

- **Dữ kiện thật không do AI nghĩ ra.** Vị trí, eo biển, phụ thuộc thương mại, mốc lịch
  sử nằm trong bộ dữ liệu cố định trong code, mỗi mục có nguồn, đối chiếu bằng web trước
  khi merge (như ngân hàng Calibration). AI chỉ viết tình huống giả định (gắn nhãn rõ)
  và giải thích.
- **Đoán trước, xem sau.** Mọi tương tác bản đồ / dòng thời gian đều bắt người dùng dự
  đoán trước khi hiện đáp án.
- **Đơn sắc như phần còn lại của app.** Màu chỉ để phân loại khi thật cần (như 4 loại lỗi
  geo); đọc skill `dataviz` trước mọi biểu đồ / bản đồ; mỗi hình có bảng số liệu và
  tooltip; chạy tốt ở 390px.
- **Toàn bộ giao diện và nội dung bằng tiếng Anh.**
- Mỗi lần một phase; dùng vài ngày rồi mới làm phase tiếp.

---

## Phase G1 - Sửa phần geo hiện có (không thêm màn hình mới)

**Xong phần code (2026-10-04)**, branch `claude/nice-tesla-0trqiz`. Unit 630/630, `tsc`
sạch, eslint 0 lỗi, E2E mới `geopolitics-levels.spec.ts`, chụp màn hình desktop + mobile.
Chưa gọi Gemini thật (container không có key).

- **Analytical geo:** đủ G1.1-G1.5: cấp độ riêng (`GEO_ANALYTICAL_LEVELS`), Learn first,
  bước 4 lăng kính, chọn góc nhìn và tác nhân từ danh sách, chấm bằng code
  (`lib/exercise/geo-guess.ts`), nhãn "Scenario: some details may be fictional", check
  questions geo ở Guided / Standard.
- **Systems geo:** mọi cấp; Guided chỉ một góc nhìn (đi thẳng tới feedback); Standard /
  Expert **đoán trước** phần B bị cú sốc đánh trực tiếp rồi mới xem bản đồ của B; dự đoán
  được gửi kèm ghi chú cho AI nhận xét.
- **Evaluative geo:** mọi cấp; Guided là bảng 2x2 với hai trục là lợi ích của hai bên khác
  nhau; Standard / Expert giữ bảng chấm điểm.
- Quy tắc an toàn dữ kiện (`lib/ai/prompts/geo-rules.ts`) trong cả 3 prompt geo.
- Gợi ý lên cấp tính cả bài geo; Handbook có entry "Geopolitics topics".
- 5 mục "lens" đã ra khỏi danh mục topic (bỏ hẳn "Geographical determinism").
- **Khác plan:**
  - Expert không chấm góc nhìn bằng AI: người dùng **viết trước rồi chọn** từ 4 phương án,
    code chấm phần chọn. Đơn giản và chắc hơn.
  - Learn first và bước lăng kính mới có ở **Analytical** geo. Systems / Evaluative geo
    để sau (hai luồng này dài, thêm bước cần làm riêng cho cẩn thận).
  - Văn bản dán vào (Use my own text) giữ cách cũ: không có Learn first / lựa chọn, vì AI
    không viết đoạn văn đó.

### G1.1 Cấp độ cho bài geo

Bỏ quy tắc "geo luôn Expert". Cấu hình trong `analytical-levels.ts` (thêm khối geo),
`systems-levels.ts`, `evaluative-levels.ts`:

| | Guided | Standard | Expert |
|---|---|---|---|
| Analytical geo | 150-200 từ; 2 lỗi (framing bias + missing actor) + 1 bẫy; đoán góc nhìn bằng 4 lựa chọn | 250-300 từ; 4 lỗi + 2 bẫy; 4 lựa chọn | Như hiện tại; tự viết góc nhìn |
| Systems geo | Chỉ góc nhìn A; chọn node từ danh sách | Có góc nhìn B; **đoán B trước** rồi mới xem | Như hiện tại + đoán B |
| Evaluative geo | Ma trận 2x2 với 2 lợi ích | Bảng chấm điểm, chọn tiêu chí từ danh sách | Như hiện tại |

- Gợi ý lên cấp tính cả bài geo (sửa `level-suggestion.ts`, bỏ các nhánh `isGeopolitics`).
- Handbook: bỏ câu "Geopolitics topics always run at Expert for now."

### G1.2 Learn first cho bài geo

Dùng lại khung `concepts` / `conceptChecks` và component `LearnFirst`. Prompt geo trả
thêm 3 khái niệm đúng bài (ví dụ: security dilemma, chokepoint, sanctions leakage,
balancing vs bandwagoning) + 1 câu hỏi kiểm tra. Validator kiểm tra số lượng. Khái niệm
vào "My terms".

### G1.3 Bước "4 lăng kính"

Sau phần làm bài, trước feedback: cùng sự kiện trong bài, mỗi lăng kính nói gì?

- Realist (quyền lực, an ninh), Liberal (luật lệ, thể chế, hợp tác), Constructivist (bản
  sắc, câu chuyện), Political economy (ai được lợi, dòng tiền).
- Guided / Standard: mỗi lăng kính 1 câu hỏi 3 lựa chọn (như 3 lăng kính của Life
  situations, dùng lại `ChoiceButtons`). Expert: tự viết 1 câu mỗi lăng kính.
- Đưa 5 mục "lens" ra khỏi `GEOPOLITICS_SUBDOMAINS` (nhóm `geo-lenses`), vì lăng kính
  giờ là bước chứ không phải topic. Giữ tương thích: domain cũ vẫn chạy như topic tự do.
- `[QUYẾT ĐỊNH]` Có giữ "Geographical determinism" làm lăng kính thứ 5 không. Đề xuất:
  không; phần địa lý đã có bản đồ ở G2.

### G1.4 Đoán góc nhìn bằng lựa chọn

- Prompt trả `perspectiveOptions`: 4 góc nhìn từ `GEOPOLITICS_PERSPECTIVE_POOL` (1 đúng
  + 3 nhiễu gần nghĩa), code xáo theo id bài.
- Guided / Standard: chọn 1 trong 4, code chấm đúng/sai. Expert: vẫn tự viết; chấm
  bằng AI theo thang "đúng / gần đúng / khác" (bỏ đếm từ trùng).
- Tác nhân bị bỏ sót: chọn từ danh sách ứng viên (đúng + nhiễu) ở Guided / Standard.

### G1.5 An toàn dữ kiện

- Thêm quy tắc vào cả 3 prompt geo: "Use only facts that are widely established. Mark
  anything hypothetical with 'Suppose' or fictional names. Never invent statistics,
  dates or quotes attributed to real people."
- Gắn nhãn trên đề: "Scenario: details may be fictional" (trừ khi người dùng dán văn
  bản thật).
- Feedback: nếu đoạn văn có số liệu, AI phải nói đó là minh họa.

### Việc cần làm G1

1. `feat(api)`: cấu hình cấp geo, prompt + validator (khái niệm, `perspectiveOptions`,
   ứng viên tác nhân, quy tắc dữ kiện), chấm đoán góc nhìn trong code + test.
2. `feat(exercise)`: giao diện Learn first + bước lăng kính + lựa chọn góc nhìn trong
   Analytical geo; đoán B trong Systems geo; cấp độ trong Evaluative geo; E2E.
3. `docs(handbook)`: cập nhật entry Analytical / Systems / Evaluative và mục geopolitics.

---

## Phase G2 - Bản đồ: eo biển chiến lược + quiz bản đồ

Nơi đặt: trang mới **Geo Lab** (`/geo`), link từ Practice và từ lộ trình địa chính trị.
`[QUYẾT ĐỊNH]` Đặt thành tab riêng trên thanh điều hướng hay chỉ là thẻ trong Practice
(đề xuất: thẻ trong Practice, như Simulators).

### Nền bản đồ

- Dữ liệu: Natural Earth 1:110m (public domain) qua gói `world-atlas`
  (`countries-110m.json`, khoảng 100 KB) + `topojson-client` + `d3-geo` để chiếu.
  `[QUYẾT ĐỊNH]` thêm 3 dependency nhỏ này.
- Component `GeoMap` (SVG): phép chiếu Equal Earth; nước tô xám nhạt, viền mảnh; điểm và
  tuyến vẽ đơn sắc; zoom vào vùng theo `bbox`; tooltip; hỗ trợ chạm trên mobile.
- Bản đồ chỉ vẽ ranh giới, không ghi tên nước tranh chấp; tên vùng biển dùng tên quốc
  tế phổ biến bằng tiếng Anh. `[QUYẾT ĐỊNH]` cách ghi tên các vùng biển có tranh chấp
  (đề xuất: tên quốc tế, kèm ghi chú "also called ..." khi cần).

### Bộ dữ liệu `lib/geo/chokepoints.ts` (cố định, có nguồn)

Khoảng 10 điểm: Hormuz, Malacca, Suez, Bab el-Mandeb, Panama, Bosporus, Gibraltar,
Đài Loan (eo), Dover, Mũi Hảo Vọng (tuyến thay thế). Mỗi điểm: tọa độ, vì sao quan
trọng (1-2 câu), hàng hóa chính, tuyến thay thế, các nước phụ thuộc nhiều nhất (danh
sách ngắn, có nguồn: EIA, UNCTAD, IMF PortWatch...). Đối chiếu bằng web trước khi merge.

### Tương tác 1: "Close the strait"

1. Chọn một eo trên bản đồ.
2. Đoán: những nước nào bị ảnh hưởng nặng (chạm vào bản đồ), hàng hóa nào, tàu sẽ đi
   đường nào thay thế.
3. Hiện đáp án: nước bị ảnh hưởng tô đậm, tuyến thay thế vẽ nét đứt, độ dài thêm (km,
   ngày đi biển) từ dữ liệu.
4. Code chấm (trùng danh sách nước, đúng tuyến thay thế); AI giải thích ngắn.

### Tương tác 2: Quiz bản đồ hằng ngày (2 phút)

- 5 câu "chạm vào đúng chỗ": eo biển, thủ đô, vùng biển, dãy núi, chuỗi đảo thứ nhất.
- Chấm theo khoảng cách (km) đến điểm đúng; gần trong ngưỡng là đúng.
- Lặp lại giãn cách: câu sai hỏi lại sau 1 ngày, 3 ngày, 7 ngày. Lưu trên dòng bài như
  các loại bài khác (không cần collection mới).
- Bộ dữ liệu `lib/geo/places.ts` khoảng 80 địa điểm, có nguồn tọa độ.

### Việc cần làm G2

1. `feat(geo)`: dependency, `GeoMap` + test chiếu, dữ liệu `chokepoints.ts` / `places.ts`
   + test (tọa độ hợp lệ, có nguồn, không trùng).
2. `feat(geo)`: trang Geo Lab, "Close the strait", quiz bản đồ, lưu kết quả, E2E, mobile.
3. `docs(handbook)`: entry "Geo Lab".

---

## Phase G3 - Strategy "Geopolitical games" + thẻ quốc gia

### Biến thể Strategy

Task type mới `geopolitics` trong Strategy (Standard, Expert). Dùng lại ma trận lợi ích,
`game.ts` (phản ứng tốt nhất, cân bằng Nash, chiến lược trội) và `PayoffMatrix`.

| Dạng trò chơi | Ví dụ ca thật |
|---|---|
| Chicken (răn đe, ai lùi trước) | Khủng hoảng tên lửa Cuba 1962 |
| Prisoner's dilemma (chạy đua vũ trang) | Chạy đua hạt nhân thời Chiến tranh Lạnh |
| Free rider (liên minh trừng phạt) | Trừng phạt khi có nước thứ ba mua hàng |
| Stag hunt (phối hợp, cần tin nhau) | Thỏa thuận cắt giảm sản lượng dầu |
| Cam kết với đồng minh | Đảm bảo an ninh và rủi ro bị kéo vào xung đột |

- Ca thật nằm trong bộ dữ liệu cố định (tóm tắt 3-4 câu, có nguồn); AI viết biến thể
  giả định quanh ca đó và gắn nhãn.
- Kết thúc mỗi bài: "What really happened" (từ dữ liệu, không do AI).

### Thẻ quốc gia `lib/geo/actors.ts`

Khoảng 15 tác nhân (Mỹ, Trung Quốc, Nga, EU, Nhật, Ấn Độ, ASEAN, Việt Nam, Hàn Quốc,
Úc, Saudi Arabia, Iran, Thổ Nhĩ Kỳ, Brazil, Indonesia). Mỗi thẻ: lợi ích cốt lõi, lằn
ranh đỏ đã tuyên bố công khai, đòn bẩy, điểm yếu, đối tác chính; mỗi ý có nguồn.

- Xem trong Geo Lab; dùng làm đầu vào cho Geopolitical games ("Use the cards").
- `[QUYẾT ĐỊNH]` Danh sách 15 tác nhân, và cách viết trung lập cho các nội dung nhạy
  cảm (đề xuất: chỉ ghi điều chính phủ đó tự tuyên bố, dẫn nguồn chính thức).

### Việc cần làm G3

1. `feat(exercise)`: dữ liệu ca thật + thẻ quốc gia + test; prompt + validator task type
   `geopolitics` trong Strategy; giao diện + "What really happened"; E2E.
2. `docs(handbook)`: cập nhật entry Strategic situations, thêm phần thẻ quốc gia.

---

## Phase G4 - Dòng thời gian có điểm quyết định

- Bộ ca cố định `lib/geo/cases.ts`, mỗi ca 5-8 mốc có ngày tháng và nguồn. Ví dụ:
  khủng hoảng tên lửa Cuba, khủng hoảng dầu 1973, Hiệp định Paris 1973, Biển Đông
  2009-2016 (phán quyết trọng tài), Việt Nam gia nhập WTO.
- Giao diện: thanh thời gian ngang (dọc trên mobile). Ở 2-3 mốc, app dừng lại hỏi "Bạn
  làm gì?" (3-4 lựa chọn, kèm độ tự tin), rồi mới hiện điều đã thật sự xảy ra và hệ
  quả.
- Thang leo thang: kéo các sự kiện vào đúng nấc (dùng lại `RankList`), tìm "lối thoát".
- Chấm: lựa chọn của người dùng so với điều đã xảy ra là "gần / khác", không phải đúng
  / sai (lịch sử không có đáp án duy nhất). Độ tự tin đưa vào biểu đồ calibration.
- `[QUYẾT ĐỊNH]` 5 ca đầu tiên.

---

## Để sau (chọn tùy mức độ dùng)

| Ý tưởng | Ghi chú |
|---|---|
| Mạng lưới đồng minh / đối thủ, bật/tắt lớp quân sự / kinh tế | Dùng React Flow sẵn có; dữ liệu cố định |
| Ma trận "ai muốn gì" (quan tâm × sức mạnh) | Dùng lại bảng 2x2 của Evaluative |
| Mũi tên phụ thuộc (dầu, chip, lúa gạo) | Cần số liệu có nguồn và năm |
| "Nhìn từ thủ đô khác" (xoay tâm bản đồ) | Dựa trên `GeoMap` ở G2 |
| Mô phỏng trừng phạt trong Simulators | Mô hình đơn giản, ghi rõ chỉ để minh họa |
| Chuyển lăng kính trên cùng bản đồ / câu chuyện | Mở rộng bước lăng kính của G1 |
| Nhật ký dự báo (forecast journal) trong Calibration | Dự báo sự kiện thật kèm ngày phân giải; người dùng tự đánh dấu kết quả; điểm vào biểu đồ calibration |

## Thứ tự đề xuất

1. **G1** - sửa bức tường cho người mới và rủi ro dữ kiện (ảnh hưởng 3 bài đang có).
2. **G2** - nền bản đồ + eo biển + quiz (tương tác hằng ngày, nền kiến thức).
3. **G3** - Geopolitical games + thẻ quốc gia.
4. **G4** - dòng thời gian.
5. Các mục "để sau".

## Không làm

- Không để AI tự sinh dữ kiện "thật" (số liệu, ngày tháng, trích dẫn) cho bản đồ, thẻ
  quốc gia hay dòng thời gian.
- Không dự đoán hay chấm điểm quan điểm chính trị của người dùng; chỉ chấm cách lập luận
  và độ khớp với dữ kiện.
- Không dùng bản đồ có tên hay ranh giới thể hiện lập trường về vùng tranh chấp.
