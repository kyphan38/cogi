# Plan: kiến thức xã hội (chính trị, kinh tế, đời sống) - "Briefs"

Viết ngày 2026-11-13, sau khi so danh sách chủ đề của chủ app với cogi. Chưa bắt đầu.

Quy trình giống các plan trước: mỗi phase một branch, mỗi mục một commit. Cuối phase:
`tsc`, `eslint`, `vitest`, Playwright (`--workers=1`), build production, gọi Gemini thật,
chụp màn hình desktop + mobile (390px), cập nhật Handbook trong cùng thay đổi, hỏi trước
khi merge.

`[QUYẾT ĐỊNH]` = hỏi chủ app trước khi làm.

---

## Hiện trạng: cogi đã cover tới đâu

cogi là app **luyện cách nghĩ**. Chủ đề chỉ là bối cảnh cho bài tập. Đoạn văn do AI viết
có nhãn "some details may be fictional". Dữ kiện thật chỉ có trong Geo Lab (eo biển, thẻ
quốc gia, 5 ca game, 5 dòng thời gian).

| Nhóm chủ đề | Mức cover | Đang có | Thiếu |
|---|---|---|---|
| 1.1 Chính trường Mỹ | Gần như không | "Political speeches & debates", "Law & governance" (chung chung) | Bầu cử, đại cử tri, swing states, lobby, súng, fentanyl, nợ công Mỹ |
| 1.2 Xung đột quân sự | Một phần | Domain NATO, Trung Đông, Indo-Pacific, hạt nhân, proxy; eo Bab el-Mandeb, Hormuz; thẻ Mỹ, Nga, Iran, TQ | Dòng thời gian Nga-Ukraine, Biển Đỏ / Houthi, eo Đài Loan; thẻ Ukraine, Israel, Triều Tiên |
| 1.3 Siêu cường, BRICS, VN | Một phần | Domain chip, de-dollarization, ASEAN; thẻ Việt Nam; dòng thời gian VN vào WTO | Kiến thức nền: kiểm soát chip, BRICS bằng số liệu, ngoại giao "cây tre", China+1 |
| 2.1 Khởi nghiệp, SME | Một phần | Entrepreneurship, pricing, hiring, scams | Dòng tiền, điểm hòa vốn, chi phí cố định / chìm, chia lợi nhuận, chọn cổ đông |
| 2.2 Vĩ mô trong nước | Một phần | Lãi suất, lạm phát, tỷ giá; lộ trình "Money and interest rates" | FED -> tỷ giá VND, NHNN, ngân sách và lương công, giá điện / xăng do nhà nước điều tiết |
| 2.3 Tài chính cá nhân | Tốt | Nhóm "Personal money", vàng ở VN, bất động sản; Simulators vay / tiết kiệm; Calibration | Đòn bẩy BĐS, chu kỳ sốt đất (có thể thêm) |
| 3.1 VN và phương Tây | Gần như không | Analytical luyện bắt lỗi lập luận | So sánh mức sống bằng số liệu thật |
| 3.2 Đại án, từ thiện, truyền thông | Một phần | Nhóm "News, media & claims", influencer | Cơ chế các đại án (VTP, Tân Hoàng Minh, FLC, Việt Á), sao kê từ thiện |
| 3.3 Hôn nhân, con cái, lập thân | Tốt | Life situations, Reframe, nhóm "Relationships & family", "Vietnamese family life" | Tiền trong hôn nhân (có thể thêm domain) |

**Lỗ hổng chính không nằm ở danh sách domain.** Thêm domain thì AI viết thêm bài luyện,
nhưng bài luyện không dạy dữ kiện thật. Chủ app muốn *hiểu sâu kiến thức*, mà cogi chưa có
chỗ nào để học kiến thức nền có nguồn (trừ Geo Lab).

## Quyết định: feature cũ hay mới?

**Phần lớn dùng lại feature cũ. Chỉ thêm một feature mới: "Briefs".**

| Việc | Dùng gì | Vì sao |
|---|---|---|
| Luyện nghĩ trên chủ đề mới | Cũ: catalog domain + 7 mode | Đã đủ, chỉ cần thêm domain |
| Học theo thứ tự | Cũ: Learning tracks | Đã có tiến độ, thẻ trên Home |
| Sự kiện theo thời gian | Cũ: Geo Lab > Timelines | Đúng khung "đoán trước, xem sau" |
| Hiểu các bên muốn gì | Cũ: thẻ quốc gia, game cases | Thêm dữ liệu là được |
| Tính dòng tiền, hòa vốn, đòn bẩy | Cũ: Simulators | Thêm một simulator |
| **Học kiến thức nền có nguồn** | **Mới: Briefs** | Không mode nào làm việc này; mode nào cũng là bài luyện |

Không tạo mode bài tập thứ 8. Briefs là trang đọc + kiểm tra ngắn, rồi dẫn sang mode có sẵn.

## Nguyên tắc

- **Dữ kiện có nguồn, có năm.** Như Geo Lab: không để AI tự bịa số liệu, ngày, trích dẫn.
- **Nhiều góc nhìn, không chọn phe.** Mỗi Brief trình bày 2-3 cách nhìn ở dạng mạnh nhất
  của nó. App chấm cách lập luận và độ khớp dữ kiện, không chấm quan điểm (giữ đúng mục
  "Không làm" của PLAN-geopolitics).
- **Đoán trước, xem sau.** Mỗi Brief mở đầu bằng 1-2 câu đoán (ví dụ "BRICS chiếm bao nhiêu %
  GDP thế giới?") kèm độ tự tin, rồi mới hiện số liệu.
- Tiếng Anh, đơn sắc, câu ngắn (IELTS ~6), mỗi lần một phase.

### Về nhóm 3.1

Danh sách gốc viết theo một phía ("vạch trần", "phản bác"). Nếu app dạy theo hướng đó thì
app làm đúng điều nó dạy người dùng tránh (framing bias). Đề xuất: giữ chủ đề, đổi cách làm.

- "Thiên đường phương Tây" và "Việt Nam luôn tốt hơn" đều là **luận điểm để kiểm tra bằng
  số liệu**: chi phí y tế, thuế, giá nhà, an toàn, thu nhập sau chi phí, theo nguồn trung
  lập (OECD, World Bank, Numbeo có ghi rõ giới hạn).
- Bài Analytical dùng cả hai chiều: một đoạn khen phương Tây quá mức, một đoạn chê quá mức.

`[QUYẾT ĐỊNH]` Đồng ý cách làm này cho 3.1 không.

---

## Phase S1 - Thêm domain và lộ trình (chỉ dữ liệu, không màn hình mới)

**Xong phần code (2026-11-13)**, branch `society/s1-domains-tracks`. Unit 797/797, `tsc` sạch,
eslint 0 lỗi, E2E `tracks.spec.ts` + `mobile-overflow.spec.ts` 58/58. Chưa gọi Gemini thật.

- Nhóm mới "US politics & society" (12 domain); thêm domain vào Business, Probability & risk,
  News & media, Vietnam today (thêm cả `analytical` vào `bestFor`), Professional judgment.
- 4 lộ trình mới: "Read the news like a detective", "Open a small business", "Vietnam's
  economy from above" (link simulator nhập khẩu / tỷ giá), "How US politics works".
- **Thêm so với plan:** quy tắc "không bịa dữ kiện" (`REAL_WORLD_FACT_RULE`) cho chủ đề về
  thể chế và sự kiện thật (nhóm US politics, vài domain VN, các bước của lộ trình có
  `realWorld`). Trước đây chỉ bài geo có quy tắc này. Gắn ở một chỗ: `adaptationAppendix`
  trong `/api/ai`.
- Handbook: entry "Learning tracks".

1. Catalog: thêm nhóm **"US politics & society"** (bầu cử và đại cử tri, lobby và tiền trong
   chính trị, súng, nhập cư, fentanyl, nợ công Mỹ, phân hóa giàu nghèo). Thêm domain vào các
   nhóm có sẵn:
   - Business: "Cash flow vs revenue", "Break-even before opening a shop", "Profit sharing &
     partners", "When to cut a losing business".
   - Vietnam today: "FED rates and the VND", "State Bank of Vietnam policy", "State budget &
     public salaries", "Regulated prices (electricity, fuel)", "Big fraud cases: how they
     worked", "Charity transparency", "Money in Vietnamese marriages".
   - Media: "Who benefits from this news?".
2. Lộ trình mới trong `tracks.ts` (5 bước mỗi lộ trình, dùng mode có sẵn):
   - "Read the news like a detective" (truyền thông dắt mũi, ai hưởng lợi, sao kê từ thiện).
   - "Open a small business" (dòng tiền, hòa vốn, nhân sự, cổ đông).
   - "Vietnam's economy from above" (FED -> tỷ giá, NHNN, ngân sách, giá điều tiết).
   - "How US politics works" (bầu cử, lobby, phân cực).
3. Kiểm tra từ khóa geo: các domain US / VN mới không được tự chuyển sang dạng bài geo
   (`isGeopoliticsAnalyticalDomain`), trừ khi cố ý.
4. Handbook: "Learning tracks", "Choosing what to practise".

## Phase S2 - Briefs (feature mới)

Trang `/briefs`, thẻ trên Practice và link từ Learning tracks.
`[QUYẾT ĐỊNH]` Tab riêng hay thẻ trong Practice (đề xuất: thẻ, như Geo Lab).

**Một Brief gồm:**

1. **Predict:** 1-2 câu đoán số liệu / sự kiện + độ tự tin.
2. **Background:** 5-8 câu, chuyện gì, từ khi nào.
3. **Key facts:** 5-8 dữ kiện, mỗi dòng có nguồn và năm.
4. **Who wants what:** các bên và điều họ tự tuyên bố (dùng lại cách viết của thẻ quốc gia).
5. **Ways to see it:** 2-3 cách nhìn, mỗi cách 2-3 câu, ở dạng mạnh nhất. Với chủ đề geo,
   dùng 4 lăng kính có sẵn (Realist, Liberal, Constructivist, Political economy).
6. **Open questions:** điều còn tranh cãi hoặc chưa biết.
7. **Check:** 3 câu trắc nghiệm (dùng lại `ChoiceButtons`), thuật ngữ vào "My terms".
8. **Practise it:** 2-3 link sang mode có sẵn, domain điền sẵn.

**Dữ liệu:** `lib/briefs/*.ts`, cố định trong code, đối chiếu web trước khi merge, test kiểm
tra mỗi dữ kiện có nguồn và năm, mỗi Brief có ngày "last checked".
`[QUYẾT ĐỊNH]` Viết tay (chắc, chậm) hay để AI soạn nháp có tìm web rồi người duyệt (nhanh,
cần duyệt kỹ). Đề xuất: AI soạn nháp trong lúc code, người duyệt, rồi lưu cố định. Không
gọi AI lúc người dùng mở trang.

**Lưu:** dòng `type: "brief"` trong `exercises` (như Geo Lab), hiện trong History, tính
streak. Lộ trình có thêm loại bước `brief`.

**8 Brief đầu tiên** `[QUYẾT ĐỊNH]`:

1. US elections: electoral college and swing states
2. Lobbying and money in US politics
3. Russia-Ukraine war and Europe's energy
4. The Red Sea, the Houthis and world shipping
5. US-China chip controls (Nvidia, ASML, TSMC)
6. BRICS and de-dollarization: what the numbers say
7. Vietnam's "bamboo diplomacy" and China+1
8. How the Van Thinh Phat case worked (chỉ dùng dữ kiện từ bản án / cáo trạng đã công bố)

## Phase S3 - Mở rộng Geo Lab (feature cũ)

- Dòng thời gian mới: Nga-Ukraine 2014-2022, khủng hoảng eo Đài Loan 1995-1996, Biển Đỏ
  2023-2024.
- Thẻ quốc gia mới: Ukraine, Israel, Triều Tiên.
- Game case mới: chia gánh nặng quốc phòng trong NATO (free rider).

## Phase S4 - Simulator "Small shop" (feature cũ)

Trong Simulators: nhập tiền mặt bằng, lương, giá bán, chi phí mỗi đơn, số đơn mỗi ngày ->
thấy điểm hòa vốn, số tháng hết vốn, khác nhau giữa doanh thu và dòng tiền. Ghi rõ chỉ để
minh họa. Có thể thêm sau: "Buy to rent with a loan" (đòn bẩy BĐS, lãi suất thả nổi).

## Để sau

- Nhật ký dự báo (đã có trong PLAN-geopolitics): dự báo sự kiện thật, tự chấm khi đến hạn.
- Brief mới mỗi tháng theo tin nóng.

## Thứ tự đề xuất

1. **S1** - rẻ, dùng được ngay trong ngày.
2. **S2** - phần chính: học kiến thức thật.
3. **S3**, **S4** - tùy mức độ dùng.

## Không làm

- Không chấm hay đoán quan điểm chính trị của người dùng.
- Không để AI tự sinh dữ kiện "thật" lúc người dùng dùng app.
- Không thêm mode bài tập thứ 8.
