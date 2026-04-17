# Hướng dẫn sử dụng Thinking Training (cho người mới hoàn toàn)

Ứng dụng giúp bạn **luyện các kiểu tư duy** (phân tích, thứ tự, hệ thống, đánh giá, sáng tạo) qua bài tập ngắn, có **phản hồi từ AI**, **ghi nhật ký**, và **cam kết một hành động** ở cuối mỗi bài.

**Quan trọng:** dữ liệu (bài đã làm, nhật ký, cài đặt…) được lưu **trong trình duyệt** trên máy bạn (IndexedDB). Không đăng nhập tài khoản cloud trong app này. Đổi máy / xóa dữ liệu trình duyệt có thể mất dữ liệu — nên dùng **Settings → Download JSON backup** nếu bạn muốn giữ bản sao.

---

## 1. Bắt đầu nhanh

1. Mở app trong trình duyệt (Chrome, Safari, Firefox, …).
2. Phía trên cùng có **thanh điều hướng** cố định khi cuộn: **Home**, **Dashboard**, **History**, **Journal**, **Settings**, **Decisions**.
3. **Home** là điểm vào: chọn một **thẻ bài tập** (hoặc Combo) để bắt đầu.

---

## 2. Trang Home

- Bạn thấy các **ô thẻ** theo từng chế độ tư duy (Analytical được gợi ý “suggested today” — chỉ là gợi ý nhẹ, không bắt buộc).
- **Generative** là một hàng rộng; **Combo** là một hàng riêng (chuỗi nhiều bước trên cùng một tình huống).
- Cuối trang có **Open actions**: những việc bạn đã **cam kết làm** sau các bài trước; có thể tick “theo dõi tuần này”.

---

## 3. Cấu trúc chung mọi bài tập đơn (không phải Combo)

Hầu hết bài đi theo **cùng một khung** (thanh tiến trình phía trên cho biết bạn đang ở bước nào):

| Bước (tên gần đúng) | Bạn làm gì |
|---------------------|------------|
| **Setup** | Chọn **lĩnh vực (domain)** (hoặc gõ Custom), có thể bấm tạo bài (**Generate**). Với Analytical còn có chế độ **dán văn thật (real data)**. |
| **Bước chính của bài** | Tùy loại: bôi đoạn văn, kéo thả, vẽ sơ đồ, chấm điểm, … (chi tiết từng loại ở mục 4). |
| **Confidence** | Kéo thanh **mức tự tin** (0–100%) *trước khi* xem góc nhìn AI — để sau này app so sánh với độ chính xác đo được. |
| **AI perspective / reflection** | Đọc phản hồi của model (văn bản có cấu trúc). Không phải “điểm số thi” mà là so sánh cách nhìn. |
| **Journal** | Trả lời vài **câu hỏi ngắn** (có thể có một dòng gợi ý từ AI dựa trên bài gần đây). Chọn **cảm xúc** (emotion) nếu có. |
| **Action** | Viết **một hành động cụ thể** bạn sẽ làm ngoài đời (một câu cũng được). |
| **Done** | Bài được **lưu hoàn chỉnh**; có thể về Home hoặc làm bài khác. |

Nút **Back** / **Continue** giúp quay lại bước trước hoặc đi tiếp (nếu app yêu cầu đủ dữ liệu mới cho đi tiếp).

---

## 4. Từng loại bài — bạn tương tác thế nào?

### 4.1 Analytical (phân tích)

**Mục tiêu:** đọc một đoạn văn, tìm **vấn đề ẩn** (giả định sai, lập luận yếu, …) và phân biệt với chỗ **trông đáng ngờ nhưng hợp lý (decoy)**.

- **Generated:** AI tạo đoạn văn + danh sách “đúng/sai” ẩn trong đó.
- **Real data:** bạn **dán** văn bản của mình (email, ghi chú, …); giới hạn độ dài và ký tự — không dán HTML “nguy hiểm”.
- **Highlight & tag:** bôi chọn trong đoạn văn, gắn **thẻ** (loại vấn đề hoặc “valid point” nếu là decoy). Cần ít nhất một highlight trước khi tiếp tục (theo luồng app).
- Phần còn lại giống khung chung: confidence → AI → journal → action.

---

### 4.2 Sequential (thứ tự)

**Mục tiêu:** sắp xếp lại **thứ tự các bước** trong một quy trình cho hợp lý (có bẫy “tưởng phải làm trước”).

- **Order steps:** kéo thả các bước theo thứ tự bạn chọn (giao diện danh sách có thể kéo).
- Sau đó: confidence → AI nhìn lại thứ tự của bạn → journal → action.

---

### 4.3 Systems (hệ thống)

**Mục tiêu:** nối **các nút (node)** bằng **quan hệ** (phụ thuộc, xung đột, …) trên canvas, rồi xử lý **sự kiện giả định (shock)** ảnh hưởng thế nào tới từng nút.

- **Connect:** vẽ / chọn cạnh, loại quan hệ; khi đủ điều kiện app cho phép sang bước shock.
- **Shock:** đọc mô tả shock; **bấm từng node** để xoay vòng mức ảnh hưởng: không bị ảnh hưởng → ảnh hưởng trực tiếp → gián tiếp (theo hướng dẫn trên màn hình).
- Sau shock: confidence → AI reflection → journal → action.

---

### 4.4 Evaluative (đánh giá)

**Mục tiêu:** so sánh các **lựa chọn** theo tiêu chí — AI có thể cho dạng **ma trận 2×2** hoặc **bảng chấm điểm** nhiều tiêu chí.

- **Evaluate:**  
  - **Matrix:** kéo/thả (hoặc đặt) từng lựa chọn vào **góc phần tư** đúng với cách bạn đánh giá.  
  - **Scoring:** điền điểm theo từng ô tiêu chí (app và model có “gợi ý” để so sánh sau).
- Sau đó: confidence → AI perspective → journal → action.

---

### 4.5 Generative (sáng tạo / viết)

**Mục tiêu:** **viết** câu trả lời cho vài prompt cố định; có thể có **gợi ý / nháp** tùy giai đoạn bạn đang ở trong lộ trình luyện tập (app tự quyết dạng scaffold dựa trên số bài generative đã hoàn thành trước đó).

- **Write:** điền nội dung vào các ô (có thể có nút xem hint tùy bài).
- **Confidence** trước khi sang phần tranh luận.
- **Debate:** hội thoại ngắn với AI để thử thách ý tưởng của bạn.
- **AI reflection** (và có thể có bước liên quan **rubric** — chấm điểm kiểu rubric) rồi journal → action.

---

### 4.6 Combo (gộp nhiều chế độ)

**Mục tiêu:** **một tình huống chung**, làm **2–3 “mảnh” bài** liên tiếp (mỗi mảnh là một kiểu tư duy khác nhau), rồi **một lần journal + action** ở cuối.

Khi **Setup**:

1. Chọn domain.
2. Chọn **Preset** (chuỗi cố định):
   - **Full analysis** — analytical → systems → evaluative (matrix).
   - **Decision sprint** — evaluative (matrix) → generative.
   - **Root cause** — sequential → systems → analytical.

Khi **Work:** làm lần lượt từng mảnh (màn hình sẽ nói rõ “Step X of Y” và lặp lại **cùng scenario**). Tương tác cụ thể trùng với từng loại bài tương ứng (highlight, canvas, matrix, …).

Cuối cùng: journal + action + lưu **một** bản ghi combo.

---

## 5. Dashboard

- **Ba ô số đầu:** tóm tắt nhanh — số bài đã hoàn thành, **gap calibration** (tự tin − độ chính xác đo được), và **độ chính xác trung bình**. Ô giữa đổi màu nhẹ theo xu hướng (lệch tự tin quá mức / khá khớp / …) — đọc dòng chữ nhỏ dưới số để hiểu.
- **Adaptive difficulty:** nếu tắt trong Settings, bạn chỉ thấy **một dòng** nhắc bật trong Settings; nếu bật, sẽ có thêm chi tiết tier và “điểm mù” (blind spots) để bài generate gợi ý phù hợp hơn.
- **Calibration gap (biểu đồ):** xu hướng gap theo thời gian (cần đủ số điểm mới có đường nét rõ).
- **Weekly insight:** khi đủ điều kiện (số bài đã hoàn thành theo quy tắc trên màn hình), bấm tạo **bản tóm tắt tuần** (markdown) từ các bài gần đây.
- **Delayed recall:** thẻ nhắc **48 giờ** sau một bài (có thể tắt trong Settings). Trả lời hoặc bỏ qua tùy bạn.
- Cột phụ có thể có thêm widget tóm tắt (tùy phiên bản app).

---

## 6. Exercise history (lịch sử)

- **Calibration:** ba số trung bình toàn cục + **giải thích ngắn** từng số; biểu đồ gap theo thời gian.
- **Activity:** lưới **heatmap** theo **bộ lọc hiện tại** (màu theo loại bài); có **chú giải màu** và ghi chú nếu một ngày có nhiều bài.
- **Streak:** số ngày liên tiếp có ít nhất một bài hoàn thành (tính trên **mọi** bài, không phụ thuộc bộ lọc) — để khuyến khích nhịp luyện đều.
- **Danh sách bài:** bấm một dòng để mở **Review** (đọc lại nội dung đã lưu, read-only).
- **Filters:** lọc theo loại, domain, khoảng ngày; **Apply filters** để tải lại danh sách.

---

## 7. Settings (cài đặt)

- **Personal context:** đoạn giới thiệu về bạn (vai trò, mục tiêu, …) — được **đưa vào prompt** khi sinh bài và một số chỗ AI khác. Nên viết ngắn, đúng sự thật bạn muốn model hiểu.
- **Delayed recall:** bật/tắt thẻ nhắc 48h.
- **Adaptive difficulty:** bật/tắt gợi ý độ khó + hàng chờ điểm yếu khi generate.
- **Backup:** tải JSON toàn bộ dữ liệu; nhập lại (merge hoặc replace — replace xóa sạch local, cần xác nhận).

---

## 8. Decisions (quyết định thật)

Trang riêng để **ghi lại quyết định ngoài đời** (text, domain, ngày), có thể **liên kết** tới một bài tập đã làm, và tùy chọn **nhắc nhở** sau một tuần. Không bắt buộc dùng để hoàn thành bài tập; hữu ích nếu bạn muốn nối “suy nghĩ trong app” với “việc đã chọn làm”.

---

## 9. Journal (trong menu)

- Trong luồng **mỗi bài tập**, journal là bước **bắt buộc** (câu hỏi ngắn sau bài).
- Mục menu **Journal** hiện có thể chỉ là **trang placeholder** tùy phiên bản — nếu trên màn hình bạn chỉ thấy dòng chữ tối giản, hãy coi **nhật ký sau bài** là phần journal chính.

---

## 10. Lỗi thường gặp

| Hiện tượng | Gợi ý |
|-------------|--------|
| Bấm Generate báo thiếu API | Cần người triển khai cấu hình **khóa Gemini** trên server (`.env.local`). Người dùng cuối không tự sửa trong app. |
| Bài AI không hợp lệ (422) | Thử Generate lại; đôi khi model trả JSON sai schema — không phải lỗi của bạn. |
| Mất dữ liệu | Không đồng bộ cloud — kiểm tra chưa xóa site data; dùng backup JSON. |
| Adaptive không thấy gì | Phải **bật** trong Settings và làm thêm vài bài để có dữ liệu. |

---

## 11. Tài liệu liên quan (chỉnh sản phẩm / trải nghiệm sâu hơn)

- [`EXPERIENCE_TUNING.md`](./EXPERIENCE_TUNING.md) — các “cần gạt” tinh chỉnh cảm giác app (prompt, model, domain, v.v.) ở góc nhìn sản phẩm.

---

*Nếu bạn in hoặc gửi cho người mới: nhớ nhắc họ cài backup định kỳ và rằng app phụ thuộc trình duyệt hiện tại.*
