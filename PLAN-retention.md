# PLAN-retention - cogi: chấm đúng và nhớ lâu

Viết ngày 2026-11-15. Owner đã duyệt 3 mục: (1) sửa nốt lỗi trong
REVIEW-exercises.md, (2) ôn thuật ngữ theo lịch trong app, (3) xuất thuật
ngữ sang Anki. Chưa bắt đầu.

Mục tiêu: học **nhớ lâu và dùng được**, không phải đẹp hơn. Chấm đúng trước,
rồi ôn lại đúng lúc.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/cogi (app code is in web/). Read
ws/app/AGENTS.md, cogi/AGENTS.md and cogi/PLAN-retention.md first.
Implement only phase <R1> from PLAN-retention.md, exactly as written.
Follow "Quy tắc cho mọi phase". Run every command in "Kiểm tra mỗi phase"
and fix all failures you caused. Then write one line in "Tiến độ", commit
only the files you changed on main (no Co-Authored-By) and stop. Do not
push unless I ask. Tell me in Vietnamese, in short simple sentences, what
changed and how to try it. Do not start the next phase.
```

Đổi `<R1>` thành phase muốn làm. Mỗi lần chỉ một phase. Thứ tự đề nghị:
R1, R2, R3 (R3 không phụ thuộc R2, có thể làm trước nếu muốn).

## Quy tắc cho mọi phase

- `AGENTS.md`: không em dash, code và comment bằng tiếng Anh, chữ trên UI
  càng ít càng tốt, không `Co-Authored-By`, chỉ commit, không push.
- Đổi tính năng nào thì sửa Handbook (`web/src/lib/handbook/content.ts`)
  trong **cùng commit**.
- Không thêm collection Firestore mới (phải đổi `firestore.rules` và deploy
  rules). Lưu trên dòng `exercises`, giống Geo Lab đang làm (dòng `type: "geo"`).
- Không thêm thư viện mới.
- Mỗi mục một commit, theo `.cursor/rules/git-commits.mdc`.
- `[QUYẾT ĐỊNH]` = hỏi owner trước khi làm phần đó.

## Kiểm tra mỗi phase

```bash
cd ws/app/cogi/web
npx tsc --noEmit
npx eslint .
npx vitest run
npx playwright test
```

Ghi số test Playwright trước và sau vào "Tiến độ". Chụp màn hình desktop và
mobile (375px) cho phần UI mới.

---

## R1 - Sửa nốt lỗi trong REVIEW-exercises.md

Tình trạng (kiểm tra ngày 2026-11-15): 10/10 việc trong mục "Top các việc
nên sửa" **đã xong** (commit `771d5e13`, `97e38876`, `b6e209a7`, `d7d4b2b9`,
`c25d9a16`, `d69d204d`, và quy tắc chống bịa sự thật `factRuleFor` trong
`route.ts`). Phase này chỉ làm phần còn lại, đều là mức [TB] hoặc [Thấp].

Trước khi sửa: mở từng mục bên dưới, xem code hiện tại. Mục nào đã đúng thì
bỏ qua và ghi "đã xong" vào Tiến độ.

1. **Gọi người học là "beginner" ở mọi cấp.** (REVIEW mục 4.3)
   - Ở đâu: `judgment.ts`, `reframe.ts`, `strategy.ts` (2 chỗ) trong
     `web/src/lib/ai/prompts/`. Các prompt phản hồi (`*-perspective.ts`)
     cũng có chữ này.
   - Sửa: truyền cấp độ vào, ví dụ "a learner at the Standard level". Giữ
     "beginner" chỉ ở Guided. Thêm test cho prompt builder.
2. **Chú thích cũ ở Systems.** `web/src/lib/exercise/systems-levels.ts:13`
   còn ghi "four link types". Bây giờ chỉ có 2 loại.
3. **`TEXT_SEGMENT_RULE` chỉ có ở bản địa chính trị.** (REVIEW mục 1.4)
   Thêm vào prompt Analytical thường và prompt văn bản thật.
4. **Calibration: chỉ gợi ý đổi cấp khi đủ dữ liệu.** (REVIEW mục 7.2)
   Chỉ gợi ý lên/xuống cấp khi đã có khoảng 15 câu trả lời trở lên.
5. **En dash "–" trong chữ của app.** (REVIEW mục 9.3) Thay bằng " - " ở
   `validators/evaluative.ts` và các chỗ grep thấy trong `web/src`.
6. **Không làm trong phase này:** thêm câu cho ngân hàng Calibration
   (REVIEW mục 7.1). Việc này cần nguồn thật cho từng câu, nên tách riêng.

Xong: các mục trên đã sửa hoặc đã ghi "đã xong", test qua.

---

## R2 - Ôn thuật ngữ theo lịch (trong app)

### Vì sao

"My terms" (`/terms`) hiện chỉ là một danh sách để đọc. Đọc lại không giúp
nhớ nhiều. Cách nhớ lâu nhất là **tự nhớ lại** (retrieval practice) và
**ôn cách quãng** (spaced repetition). Geo Lab đã có lịch 1-3-7 ngày và đã
chạy tốt, nên dùng lại.

### Cách hoạt động (người dùng thấy)

1. Mỗi thuật ngữ mới từ "Learn first" tự vào lịch ôn: lần đầu sau 1 ngày.
2. Trang Today có thêm một dòng "Review terms" khi có thuật ngữ đến hạn,
   giống dòng "Daily map quiz". Không có thuật ngữ đến hạn thì không hiện.
3. Một lần ôn: tối đa 5 thuật ngữ, khoảng 1-2 phút.
4. Mỗi câu: hiện **định nghĩa và ví dụ** (thuật ngữ trong ví dụ bị che bằng
   `____`). Người dùng chọn đúng thuật ngữ trong 4 lựa chọn. 3 lựa chọn sai
   lấy từ chính các thuật ngữ khác của người dùng.
   - Có ít hơn 4 thuật ngữ: hiện thuật ngữ, người dùng tự nhớ nghĩa, bấm
     "Show", rồi tự chấm "I knew it" / "Not yet".
5. Sau mỗi câu: hiện đáp án, định nghĩa, và link tới bài đã gặp thuật ngữ.
6. Đúng thì lên bậc (1 → 3 → 7 ngày). Sai thì về lại 1 ngày. Đúng đủ các bậc
   thì xong, không hỏi nữa.
7. Trang `/terms`: mỗi thẻ có nhãn nhỏ "Due" / "Learning" / "Known".

### Cách làm (code)

1. **Dùng chung lịch ôn.** Chuyển `REVIEW_INTERVALS`, `addDays`, `localDay`,
   `reviewSchedule` từ `web/src/lib/geo/quiz.ts` sang
   `web/src/lib/review/schedule.ts`. Hàm nhận `itemId` thay cho `placeId`
   (Geo truyền `placeId` vào). `geo/quiz.ts` import lại từ đây. Test cũ của
   Geo phải qua mà không sửa logic.
   - Khác với Geo: Geo chỉ ôn chỗ **sai**. Thuật ngữ thì **mọi** thuật ngữ đều
     vào lịch từ ngày gặp đầu tiên. Thêm một tham số hoặc một hàm nhỏ cho
     việc này, có test.
2. **Lưu kết quả.** Mỗi lần ôn là một dòng `exercises` mới, `type: "terms"`,
   giữ danh sách `{ itemId, correct, day }`, giống dòng quiz của Geo. Không
   đổi `firestore.rules`. `itemId` = tên thuật ngữ viết thường, đã trim
   (giống khóa trong `collectTerms`).
   - Dòng `type: "terms"` **không** được hiện như một bài tập trong History,
     Next up hay thống kê. Xem Geo đang lọc dòng `type: "geo"` thế nào và làm
     giống vậy.
3. **Chọn câu hỏi.** Hàm thuần (pure) `pickTermReview(terms, attempts, today)`
   trong `web/src/lib/exercise/term-review.ts`: lấy thuật ngữ đến hạn, cũ
   nhất trước, tối đa 5. Hàm `termChoices(target, all, seed)` chọn 3 lựa
   chọn sai và xáo thứ tự theo seed (giống `shuffledOrder`). Viết test đủ.
4. **Che thuật ngữ trong ví dụ.** Không phân biệt hoa thường. Không tìm thấy
   thuật ngữ trong ví dụ thì hiện ví dụ nguyên văn.
5. **UI.** Trang `/terms/review`. Dòng trên Today. Nhãn trạng thái trên
   `/terms`. Dùng component sẵn có (Card, Button, `rise` từ motion). Chữ trên
   UI thật ít.
6. **Handbook.** Sửa mục "My terms": cách ôn, lịch 1-3-7, chọn sai là bình
   thường.
7. **Test E2E.** Một spec Playwright: có thuật ngữ đến hạn → dòng Today hiện
   → làm 1 lần ôn → dòng biến mất.

### [QUYẾT ĐỊNH]

- **Lịch 1-3-7 hay 1-3-7-21 ngày?** 1-3-7 giống Geo, nhưng 7 ngày là hơi
  ngắn để nhớ lâu. Đề nghị: thuật ngữ dùng 1-3-7-21, Geo giữ nguyên. Hỏi
  owner trước khi làm bước 1.
- **Thuật ngữ cũ** (gặp trước khi có tính năng này): cho vào lịch hết (có
  thể rất nhiều câu đến hạn ngày đầu), hay chỉ thuật ngữ gặp trong 30 ngày
  gần nhất? Đề nghị: tối đa 5 câu mỗi lần thì cho hết vào cũng không ngợp.

---

## R3 - Xuất "My terms" sang Anki

### Vì sao

Owner đã dùng Anki và đã có skill `/anki-import` (thêm IPA và âm thanh).
Xuất file là cách rẻ nhất để ôn thuật ngữ cùng với từ vựng tiếng Anh.
R2 và R3 bổ sung cho nhau: R2 cho người chỉ dùng app, R3 cho ôn trong Anki.

### Cách hoạt động

1. Trang `/terms` có nút "Export for Anki" (ẩn khi chưa có thuật ngữ).
2. Bấm vào: trình duyệt tải file `cogi-terms-YYYY-MM-DD.txt`. Không cần
   server, tạo file ngay trên trình duyệt.
3. Owner chạy `/anki-import cogi-terms-....txt "cogi::terms"` trong Claude Code.
   Thẻ đã có trong deck sẽ được skill bỏ qua, nên xuất lại nhiều lần vẫn an toàn.

### Định dạng file (khớp `/anki-import`)

Mỗi thẻ cách nhau một dòng trống:

```
1. <term>
<example, thuật ngữ được bọc **...**>
[Concept] <plain>
Seen in: <tên bài 1>, <tên bài 2>
```

- Dòng 1: số thứ tự và thuật ngữ (header, không hiện trên thẻ).
- Dòng 2: ví dụ, mặt trước. Bọc thuật ngữ bằng `**` (không phân biệt hoa
  thường). Không tìm thấy thì để nguyên (skill sẽ cảnh báo nhưng vẫn chạy).
- Dòng 3: định nghĩa, mặt sau.
- Dòng 4: tối đa 3 tên bài.
- Bỏ dấu `.` ở cuối? Không cần: skill tự bỏ.

### Cách làm (code)

1. Hàm thuần `termsToAnkiText(terms: LearnedTerm[]): string` trong
   `web/src/lib/exercise/terms-export.ts`, có test: bọc `**`, hoa thường,
   không tìm thấy thuật ngữ, ký tự xuống dòng trong định nghĩa (gộp thành
   một dòng), thứ tự giống trang `/terms`.
2. Nút trên `/terms`: tạo `Blob`, tải qua thẻ `<a download>`.
3. Handbook mục "My terms": một dòng về nút xuất và lệnh `/anki-import`.
4. Không sửa skill `anki-import`. Nếu cần sửa skill, hỏi owner (repo
   cskills là public).

### [QUYẾT ĐỊNH]

- Tên deck mặc định: `cogi::terms`? Hỏi owner.

---

## Không làm (đã cân nhắc)

- Streak, điểm, huy hiệu cho phần ôn: dễ biến thành học để giữ streak.
- Tự xây thuật toán ôn phức tạp (SM-2, FSRS): Anki đã làm tốt việc này (R3).
  Trong app chỉ cần lịch đơn giản.

## Tiến độ

(AI làm ghi một dòng mỗi phase: ngày, commit, ghi chú, số test trước/sau.)

- R1 (2026-11-15): `40b714a9` learner theo cấp (thêm `id` vào level config, không đụng `route.ts`), `8e8bcfb0` TEXT_SEGMENT_RULE cho mọi prompt Analytical + comment Systems, `246132d8` Calibration gộp chuỗi 3 (lên) / 2 (xuống) rồi chấm một lần, cần 15+ câu đã trả lời, `dae09cb6` en dash thành " - " (giữ tên nguồn trong `geo/places.ts`). Phát hiện khi làm: mỗi bài Calibration có 9-10 câu nên "đủ 15 câu" luôn đúng; vấn đề thật là chấm từng bài riêng, nên đổi sang gộp. Thêm (owner duyệt sau khi review flow): `e848da33` Evaluative ẩn số của AI trước khi nộp, `ec195c64` Learn first ẩn thuật ngữ khi làm câu kiểm tra, `2c922c94` Reframe khóa đáp án khi sang bước viết lại, `1885814a` "1 issue". Kiểm tra: tsc, eslint (0 lỗi), vitest 866/866, Playwright 204/204. Lưu ý: cổng 3000 đang chạy app noda, nên lần chạy đầu (dùng lại server đó) lỗi 203/204; chạy lại bằng config tạm ở cổng 3100 với `PLAYWRIGHT_BASE_URL`. Chưa làm: mục 4, 5, 7 của bản review flow (Systems/Evaluative sửa được sau khi thấy đáp án AI; mở lại bài về câu đầu).
- R2 (2026-11-15): `f6ed49fa`. Owner chọn lịch 1-3-7-21 ngày và cho mọi thuật ngữ cũ vào lịch. Khác plan: (1) không chuyển lịch ôn ra khỏi `geo/quiz.ts` vì session khác đang sửa file đó; lịch mới ở `lib/review/schedule.ts`, Geo giữ bản 1-3-7 của nó. (2) Không lưu dòng `exercises` type "terms" (sẽ hiện trong History, gợi ý chủ đề, thống kê); thay vào đó một doc `settings/termReview` chỉ giữ trạng thái mỗi thuật ngữ (bậc, ngày đến hạn), không cần đổi rules. Doc riêng vì `getAppSettings()` bỏ các trường lạ và sẽ xóa nó. Kiểm tra: tsc, eslint trên file đã sửa, vitest 877/877, Playwright 207/207 (cổng 3100), ảnh 1280px và 375px. Lưu ý môi trường: session khác vừa nâng Next 16.4.6 và eslint-plugin-react-hooks 7.1.1, nên `eslint .` báo 14 lỗi `set-state-in-effect` ở file cũ (không phải file của R2); `next dev` mới tự thêm một khối vào `web/AGENTS.md` (có em dash), chưa commit.
- R3 (2026-11-15): `3400573c`. Nút "Export for Anki" trên My terms tải `cogi-terms-YYYY-MM-DD.txt` đúng định dạng `/anki-import`. Tên deck mặc định `cogi::terms` (chỉ ở Handbook, đổi dễ). Không sửa skill. Kiểm tra: vitest 884/884, Playwright 208/208 (cổng 3100, có test đọc file tải về), và chạy `parse_file()` thật của skill trên file đó: 5 thẻ, 0 bỏ qua, không cảnh báo thiếu chữ đậm. Chưa chạy `push` vào Anki thật.
