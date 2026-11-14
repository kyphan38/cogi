# PLAN-refine - cogi: tinh chỉnh UI/UX, giữ DESIGN.md

Viết ngày 2026-11-14, sau buổi review UI/UX cùng owner. Owner chọn hướng
**tinh chỉnh, không vẽ lại**: giữ nguyên màu xám, font hệ thống, bố cục một
cột của `ws/app/DESIGN.md`. Chỉ sửa chỗ chưa nhất quán và flow nhiều bước.

Mockup (8 màn hình, sáng và tối):
https://claude.ai/artifact/MD3sbJMNtudu1Pp6PXn9Ky

`[QUYẾT ĐỊNH]` = hỏi owner trước khi làm mục đó.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/cogi (app code is in web/). Read
ws/app/AGENTS.md, cogi/AGENTS.md, ws/app/DESIGN.md and cogi/PLAN-refine.md
first. Open the mockup link in PLAN-refine.md to see the target. Implement
only phase <R1> from PLAN-refine.md, exactly as written. Ask me before any
item marked [QUYẾT ĐỊNH]. Run every check in "Kiểm tra mỗi phase" and fix
all failures you caused. Then update the "Tiến độ" list, commit only the
files you changed on main (no Co-Authored-By) and stop. Do not push unless
I ask. Tell me in Vietnamese, in short simple sentences, what changed and
how to try it. Do not start the next phase.
```

Đổi `<R1>` thành phase muốn làm. Mỗi lần chỉ một phase.

---

## Vì sao (review 2026-11-14)

Ảnh chụp 12 màn hình ở 1280px và 390px, cộng với đo trong `web/src`:

| Vấn đề | Số liệu / chỗ thấy |
|---|---|
| Quá nhiều cỡ chữ | 12 cỡ, trong đó 6 cỡ tự đặt (`text-[11px]`, `text-[10px]`, `text-[1.65rem]`, `text-[9px]`...) |
| Hai hệ màu trong code | 389 class `zinc-*` và 461 class token. Màu ra giống nhau nhờ map trong `globals.css`, nhưng code khó đọc và dễ lệch |
| Tiêu đề trang mỗi nơi một kiểu | Home, History, Settings, Geo: 24px đậm. Exercise, Tracks, Simulators: nhỏ hơn, nhạt hơn |
| Nhãn mục hai kiểu | CHỮ HOA (`section-label`) và chữ thường 15px (Geo, Exercise setup) |
| Nút chính nhiều cỡ | "New exercise", "Generate topics", "Start today's quiz", "Save" khác chiều cao và padding |
| Thanh bước dùng font mono | Chỉ có ở `ExerciseShell`, không chỗ nào khác dùng |
| New exercise nặng | 2 tầng tab, 3 ô select, rồi mới bấm Generate: 5 quyết định trước khi thấy nội dung |
| Tracks dài | Khoảng 3.400px: 7 track mở hết 5 bước, track nào cũng có "Start" |
| Nav không cho biết đang ở đâu | Geo, Tracks, Simulators, New exercise đều hiện "Practice". Ba khu Explore bị giấu |
| Lỗi nhỏ | Chữ trục biểu đồ Simulators to gấp đôi (SVG bị phóng). Chấm Analytical và Evaluative ở History gần cùng màu. Settings có chữ "Home" lạ cạnh Save. Ô import là kiểu mặc định của trình duyệt |

Không phải vấn đề: màu, khoảng trắng, độ "hiện đại" chung. Phần này đã làm
xong ở PLAN-calm-layout (C1-C6).

---

## Quy tắc cho mọi phase

- Không đổi màu hay token trong DESIGN.md. Không thêm shadow, gradient, emoji.
- Giữ 4 chấm màu `--semantic-*` và khung của `EvaluativeMatrixBoard`,
  `PayoffMatrix`, `SystemsFlowCanvas`, bản đồ Geo.
- Không đổi dữ liệu Firestore hay prompt AI, trừ khi phase ghi rõ.
- Chữ trên UI càng ít càng tốt (AGENTS.md "UI copy"). Không em dash.
- Chữ UI đổi thì sửa Handbook (`web/src/lib/handbook/content.ts`) trong cùng
  commit.
- Một phase = một hoặc vài commit nhỏ, mỗi mục một commit.

## Kiểm tra mỗi phase

1. `cd web && npx tsc --noEmit && npm run lint && npm run test:unit`
2. Playwright các spec liên quan, và luôn chạy `tests/ui-ux/`. Server dev
   chạy ở port khác 3000 nếu port 3000 đang bận (app khác hay dùng port này).
   `playwright.config.ts` ghi cứng `localhost:3000`, nên tạo một config tạm
   (không commit) ghi đè `use.baseURL` và `webServer` sang port 3100, rồi
   chạy với `PLAYWRIGHT_BASE_URL=http://localhost:3100` (cookie E2E đọc biến này).
   Lần chạy đầu khi server vừa bật có thể lỗi vài test do chậm: chạy lại test
   lỗi một mình trước khi kết luận.
3. Chụp màn hình đã đổi ở 360, 390 và 1280px, sáng và tối. Kiểm tra: không
   gì tràn mép phải, không gì đè lên nhau.
4. Đếm lại số liệu ở bảng "Vì sao" nếu phase đụng tới nó, ghi vào "Tiến độ".

---

## R1 - Nền móng: cỡ chữ, tiêu đề trang, nút

Chưa đổi bố cục. Chỉ tạo các mảnh dùng chung.

1. **5 cỡ chữ** trong `globals.css` (`@theme`):
   - `text-page` 24px / 600 / tracking -0.01em: tiêu đề trang.
   - `text-lead` 18px / 500: tên track, chủ đề đang chọn.
   - `text-body` 15px / line-height 1.7: chữ đọc, tên hàng.
   - `text-meta` 13px: ngày, số đếm, mô tả một dòng.
   - `text-label` 11px / 500 / chữ hoa / tracking 0.08em: nhãn mục (thay
     `section-label`, giữ tên cũ làm alias tới hết R2).
2. **`PageHeader`** (`components/shared/PageHeader.tsx`): `title`, `sub?`
   (một dòng, muted), `action?` (bên phải). Đúng như mockup.
3. **`Section`**: đổi tên `HomeSection` thành `Section` và chuyển vào
   `components/shared/`. Sửa mọi import trong cùng commit.
4. **Nút**: `Button` mặc định cao 36px (`h-9`), padding 16px, bo 8px,
   chữ 14px/500. Bỏ các size tự đặt ở nơi gọi. Trên điện thoại nút chính có
   thể `h-11` (44px, vùng bấm đủ lớn), qua một prop `size="touch"`.
5. Test đơn vị cho `PageHeader` (render title, sub, action).

## R2 - Áp dụng cho mọi trang

1. Mọi trang trong `app/(main)/` dùng `PageHeader`: Exercise (qua
   `ExerciseShell`), Tracks, Simulators, Geo, Terms, Handbook, New exercise.
2. Mọi nhãn mục dùng `Section` / `text-label`. Các tiêu đề con 15px của Geo
   và Exercise setup thành `text-label` hoặc `text-body font-medium` theo
   mockup.
3. Thay hết cỡ chữ tự đặt (`text-[..px]`, `text-[..rem]`) bằng 5 cỡ trên.
   Ngoại lệ: chữ trong SVG của công cụ (matrix, canvas, bản đồ).
4. Thanh bước trong `ExerciseShell`: bỏ font mono. Mỗi bước là một vạch 2px
   (ink khi xong hoặc đang làm, `sunk` khi chưa) và chữ 13px bên dưới.
5. Thay `zinc-*` bằng token (`text-foreground`, `text-muted-foreground`,
   `border-border`, `bg-muted`...). Làm theo từng thư mục, mỗi thư mục một
   commit. Khi `grep -r "zinc-" web/src` còn 0, xoá phần map `--color-zinc-*`
   trong `globals.css` và thêm một test nhỏ để `zinc-` không quay lại.

## R3 - Sửa lỗi nhỏ và bớt chữ

1. `components/sim/LineChart.tsx`: chữ trục (`fontSize="10"` trong SVG có
   `viewBox`) bị phóng theo chiều rộng. Đưa 3 nhãn trục ra HTML dưới SVG
   (`text-meta`), hoặc tính cỡ chữ theo tỉ lệ. Kiểm tra ở 390 và 1280px.
2. History, legend của heatmap: Analytical và Evaluative gần cùng màu. Dùng
   3 bậc xám cách xa nhau trong dãy chart series (`#171717`, `#8a8a8a`,
   `#d4d4d4` và bản tối), tên luôn ghi bên cạnh.
3. Settings: bỏ chữ "Home" cạnh Save. Ô import thành một chữ
   "Import JSON backup" (input file ẩn, label bấm được).
4. Bớt chữ (tối đa khoảng 10 chữ một dòng):
   - Settings, Language level: còn một dòng, ví dụ "Sets how hard the
     English is."
   - History, heatmap: bỏ đoạn giải thích, legend đã đủ.
   - New exercise: bỏ dòng "Choose filters if you like..." (sẽ mất hẳn ở R6).
5. Màu `faint` (#8a8a8a trên #fafafa) không đủ tương phản 4.5:1 cho chữ nhỏ.
   Chỉ dùng cho `text-label`. Chữ meta dùng `muted`.

## R4 - Nav và khu Explore `[QUYẾT ĐỊNH]`

Hỏi owner trước:
- (a) Đổi "Practice" thành "Today"?
- (b) Thêm mục "Explore" gom Tracks, Geo Lab, Simulators?

Nếu đồng ý:
1. `AppTopNav`: links `Today · Explore · History · Handbook · Settings`.
   Path có thêm cấp con: `cogi / Explore / Tracks`,
   `cogi / Today / New exercise`, `cogi / Today / Evaluative`. Chỗ hiện tại
   luôn đúng (sửa `isPracticePath`, thêm rule cho `/tracks`, `/geo`,
   `/simulators`).
2. Trang `/explore` (hoặc giữ route cũ và thêm hàng tab chữ
   `Tracks · Geo Lab · Simulators` dưới `PageHeader` ở cả 3 trang). Chọn cách
   giữ route cũ nếu không có lý do khác: link cũ và test vẫn chạy.
3. Ở 360px: cả hàng nav phải vừa. Nếu không vừa, cuộn ngang (như hiện tại)
   hoặc ẩn "cogi /" (đã có `min-[420px]`).
4. Sửa bảng nav của cogi trong `ws/app/DESIGN.md` (repo khác: chỉ sửa
   file, báo owner để commit), Handbook, và `tests/ui-ux/layout-architecture`
   + `mobile-overflow`.

## R5 - Today (Home)

Theo mockup "Today". File: `components/dashboard/HomeContent.tsx`,
`TrackCard.tsx`, `GeoLabCard.tsx`.

1. `PageHeader` "Today" + ngày (`text-meta`).
2. **Next up**: bước tiếp theo của track đang học. Thanh tiến độ 2px, meta
   "Step 2 · Systems · about 10 min", câu bài tập ở `text-lead`, nút **Start**
   (nút tô nền duy nhất trên trang) và chữ "not today" (ẩn bước này đến mai,
   lưu ở `localStorage`).
3. **Start your own**: một ô giống input, bấm vào đi tới New exercise.
   Thay nút "New exercise" ở góc trên.
4. **In progress**: bài đang làm dở (đã có dữ liệu cho phần này), mỗi bài một
   hàng, chữ "Continue ›".
5. **Explore**: 3 hàng: Daily map quiz (chữ "ready" khi chưa làm hôm nay),
   Simulators, All tracks.
6. Người mới (chưa có track): Next up là bước 1 của track đầu tiên.

## R6 - New exercise một màn hình `[QUYẾT ĐỊNH]`

Theo mockup "New exercise". File: `app/(main)/reasoning/page.tsx`,
`TopicIdeasPanel.tsx`, `WordChoice.tsx`, `DomainInput.tsx`.

Hỏi owner trước: khi người dùng tự gõ chủ đề, chọn mode thế nào?
- (a) AI gợi ý mode từ câu đã gõ (thêm một lần gọi AI nhỏ). Đề xuất.
- (b) Mặc định Analytical, có chữ "change" để đổi.

Rồi làm:
1. Một ô lớn "What do you want to think about?" + nút **Start**.
2. Dưới ô: một dòng meta "Mode: picked for you · Level: Guided · change".
   Bấm "change" mở Mode, Area, Level ngay tại chỗ (không sang trang khác).
3. **Or pick one**: 5 chủ đề gợi ý tải sẵn khi mở trang (dùng lại logic
   "Generate topics"), mỗi chủ đề một hàng, chữ "Use ›" hiện khi rê chuột
   (trên điện thoại luôn hiện mờ, theo DESIGN.md "Show on hover"). Hai chữ
   bên phải nhãn: "area: any" và "new set".
4. Bỏ 2 tầng tab (A topic / A mode, Domain / Specific scenario) và 3 ô select.
   Vẫn giữ được mọi đường cũ qua "change".
5. Sửa `tests/topic-ideas.spec.ts` và Handbook mục "Choosing what to practise".

## R7 - Tracks gọn lại

Theo mockup "Explore / Tracks". File: `app/(main)/tracks/page.tsx`.

1. **Your track**: track đang học, mở 5 bước. Bước xong: chữ "done", màu
   muted. Bước tiếp theo: đậm, có nút **Start**. Các bước sau: chữ thường.
2. **All tracks**: các track khác, mỗi track một hàng: tên, lĩnh vực, thanh
   tiến độ nhỏ và "x of 5", chữ "Open ›". Bấm vào thì mở các bước ngay tại chỗ.
3. Bỏ các link "Try the simulator for this track ›" khỏi đầu track. Đưa vào
   trong phần mở rộng của track.
4. Sửa `tests/tracks.spec.ts`.

## Để sau

- Handbook (khoảng 11.500px): mục lục dính bên trên, mỗi mục gập lại, mở
  khi bấm.
- Simulators: mỗi simulator một trang con, trang chính chỉ còn danh sách.
- Thanh nav mờ khi đang gõ (đã ghi ở PLAN-calm-layout).

---

## Tiến độ

- R1 (2026-11-14): 5 cỡ chữ (`text-page`, `text-lead`, `text-body`, `text-meta`, `text-label`) trong `@theme` của `globals.css`; `section-label` giờ dùng `text-label` (11px, 500, tracking 0.08em, trước là 600 và 0.07em). `PageHeader` mới trong `components/shared/` (chưa trang nào dùng, R2 làm). `HomeSection` đổi tên thành `Section` và chuyển sang `components/shared/Section.tsx`, sửa 6 import, không giữ file cũ. `Button`: nút tô nền cỡ default giờ 36px, padding 16px (trước 32px, 10px) qua `compoundVariants`; thêm `size="touch"` (44px). Settings vẫn có `Section` riêng trong file (R2 thay). Kiểm tra: tsc, lint (0 lỗi mới), vitest 800/800 (có 3 test mới), `tests/ui-ux` 72/72 (2 test chấm semantic lỗi ở lần chạy đầu do server vừa bật, chạy lại thì qua; trước R1 cũng qua). Ảnh chụp Home, New exercise, Geo, Settings, History ở 390 và 1280px: không vỡ bố cục. Chưa chụp dark và 360px.
- R2 (2026-11-14): `PageHeader` trên 9 trang (Practice, New exercise, History, Settings, Tracks, Simulators, Geo, Terms, Handbook). `ExerciseShell` có `title` và `sub` (sub chỉ ở bước Setup), 7 flow truyền tên loại bài; bỏ tiêu đề cũ ở bước Setup ("Evaluative exercise", "Analytical exercise"...). Thanh bước: bỏ font mono và số "1.", mỗi bước một vạch 2px (`bg-foreground` / `bg-input`) và chữ `text-meta`. Settings dùng `Section` chung. `CardTitle` 15px/500, tiêu đề bước (`MinimalContainer`) `text-lead`; `MinimalContainerAction` dùng `buttonVariants` (trước là nút riêng 40px bo `rounded-xl`). Thay hết cỡ chữ tự đặt ngoài công cụ (matrix, payoff, canvas giữ nguyên); bỏ `font-tracker`. Thay toàn bộ `zinc-*` và `bg/text/border-white` bằng token (theo đúng giá trị màu; thêm `--color-faint` = #8a8a8a / #7a7a7a), xoá map `--color-zinc-*` và `--color-white`; `--z-*` vẫn giữ vì bản đồ Geo dùng. Test mới `lib/no-zinc.test.ts` chặn `zinc-` quay lại. Lỗi tìm thấy khi chụp: `cn()` (tailwind-merge) coi `text-meta` là màu và bỏ nó khi gặp `text-foreground`; sửa bằng `extendTailwindMerge` + `lib/utils.test.ts`. Làm một commit thay vì mỗi thư mục một commit (các flow bị sửa bởi cả hai việc). Kiểm tra: tsc, lint (0 lỗi), vitest 803/803, Playwright đủ bộ 203: 199 qua, 4 lỗi: 2 flaky (chạy riêng thì qua), 1 test "container title semibold" sửa theo `text-lead`, 1 lỗi có từ trước R2 (`simulators.spec.ts:42` đếm 3 link simulator, giờ có 4 vì track Vietnam's economy). Ảnh 1280 sáng/tối, 390 sáng/tối, 360: không tràn ngang.
- Còn lại sau R2: `text-sm` (276) và `text-xs` (185) chưa nằm trong 5 cỡ. Đổi `text-sm` thành `text-body` và `text-xs` thành `text-meta` sẽ làm chữ to lên khắp app (14 thành 15, 12 thành 13), cần owner xem ảnh trước. Đề xuất làm thành R2b sau R3.
- R3 (2026-11-14): Simulators: `LineChart` đo chiều rộng thật (`ResizeObserver`) và vẽ SVG 1:1, nên chữ trục 12px, nét 2px và chấm tròn không còn to gấp 2 trên desktop; viền chấm dùng `var(--background)` (trước là trắng cứng). History: heatmap dùng 4 bậc ink rõ ràng (Evaluative 100%, Systems 55%, Analytical 30%, Other 15%), legend thêm "Other" cho 4 loại bài mới, bỏ đoạn giải thích dài. Settings: bỏ chữ "Home" cạnh Save, ô import thành chữ "Import JSON backup" (input ẩn `sr-only`), mô tả Language level còn "Sets how hard the English is." (ý đầy đủ chuyển vào comment). New exercise: bỏ dòng "Choose filters if you like...", hai dòng hướng dẫn còn 6-8 chữ. `faint`: giữ cho nhãn, chữ lựa chọn chưa chọn và icon trang trí (DESIGN.md "Words as buttons"); 10 chỗ chữ cần đọc (mô tả level, ví dụ, câu hỏi gợi ý, subtitle login...) chuyển sang `muted`. Handbook không nhắc tới các chữ đã đổi, không cần sửa. Kiểm tra: tsc, lint (0 lỗi), vitest 803/803, Playwright ui-ux + settings + history + simulators + topic-ideas + dashboard + interactive: 116/117, lỗi duy nhất là `simulators.spec.ts:42` có từ trước R2. Ảnh Simulators, History, Settings, New exercise ở 1280, 390 (sáng/tối), 360: không tràn ngang.
- R4 (2026-11-14, owner đồng ý cả hai): nav `Today · Explore · History · Handbook · Settings`. Logic "đang ở đâu" tách ra `lib/nav/place.ts` (`navPlace`, có test): path hai cấp `cogi / Today / Evaluative`, `cogi / Today / New exercise`, `cogi / Explore / Geo Lab`, `cogi / History / My terms`; phần cuối ink `font-medium` và `aria-current="page"`. Dưới 420px chỉ hiện phần mục (Today, Explore...), tiêu đề trang nói phần còn lại: ở 360px phần trang con bị cắt thành "T...", nên bỏ. Explore trỏ tới `/tracks` (giữ route cũ, không có trang `/explore`); `ExploreTabs` (Tracks · Geo Lab · Simulators) dưới `PageHeader` ở cả 3 trang, thay hai link "Simulators: ..." và "Geo Lab: ..." ở đầu Tracks. Trang chủ đổi tiêu đề thành "Today". Handbook: 7 chỗ "Practice page" thành "Today" / "Explore > ...", thêm cách mở Simulators. `AGENTS.md` (cogi và web) sửa tên tab. `ws/app/DESIGN.md`: dòng nav của cogi đã sửa; thư mục `ws/app` không phải git repo nên thay đổi này chỉ nằm trên đĩa. Test: sửa nav, heading Today, các chỗ bấm "Practice"; thêm test path và test tab Explore; sửa luôn `simulators.spec.ts:42` (3 thành 4 link, lỗi có từ trước R2). Kiểm tra: tsc, lint (0 lỗi), vitest 805/805, Playwright đủ bộ rồi chạy lại phần lỗi: tất cả qua (107/107 ở lần chạy cuối các spec nav, ui-ux, geo, simulators, evaluative). Ảnh 1280, 430, 390 (tối), 360: không tràn ngang.
- R5 (2026-11-14): trang Today viết lại theo mockup. `NextUp` (thay `TrackCard`): thanh tiến độ 2px (`scaleX`, có `role="progressbar"`), "Money and interest rates · 0 of 5 steps done", "Step 1 · Analytical", câu bài ở `text-lead`, nút **Start** / **Continue** (nút tô nền duy nhất trên trang) và chữ "not today". "not today" lưu ngày trong `localStorage` (`cogi.nextUpSkippedOn`, `lib/exercise/next-up-skip.ts`, đọc qua `useSyncExternalStore`), hiện "Back tomorrow. show" tới hết ngày. Ô "Start your own" giống ô nhập, mở New exercise; thay nút "New exercise" ở góc trên. "In progress": bài làm dở, mỗi bài một hàng có "Continue ›" và icon xoá; bài của bước track đã hiện ở Next up thì không lặp lại. `HomeExplore` (thay `GeoLabCard`): 3 hàng Daily map quiz ("ready" khi chưa làm hôm nay), Simulators, All tracks. Bỏ "Recently completed" (đã có ở History) và câu "No exercises yet": người mới thấy ngay bước 1 của track đầu. Ngày trên tiêu đề lấy theo máy người dùng. Bỏ "about 10 min" của mockup vì app không có số liệu thời gian. Handbook: "Next up", "Today > In progress", "not today", "Daily map quiz row". Test mới: chỉ một nút tô nền, "not today" giữ qua reload rồi "show" đưa lại, 3 link Explore. Kiểm tra: tsc, lint (0 lỗi), vitest 806/806, Playwright dashboard + tracks + geo-lab + ui-ux + evaluative + topic-ideas 118/118. Ảnh 1280 sáng/tối, 390, 360 tối, và trạng thái "not today": không tràn ngang.
