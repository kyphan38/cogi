# PLAN-adaptive-tracks - cogi: track tự sinh theo tiến độ

Viết ngày 2026-11-25. Owner đã chốt các điểm trong "Đã chốt". Chưa bắt đầu.

Mục tiêu: mỗi track là 6 bài. Có cái mới để học, có bài vá lỗi cũ, có bài áp
vào đời thật. Nhìn thấy mình tiến bộ bằng số do code đếm, không phải AI đoán.
History cho xem lại từng ngày đã làm gì.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/cogi (app code is in web/). Read
ws/app/AGENTS.md, cogi/AGENTS.md and cogi/PLAN-adaptive-tracks.md first.
Implement only phase <A1> from PLAN-adaptive-tracks.md, exactly as written.
Follow "Quy tắc cho mọi phase". Run every command in "Kiểm tra mỗi phase"
and fix all failures you caused. Then write one line in "Tiến độ", commit
only the files you changed on main (no Co-Authored-By) and stop. Do not
push unless I ask. Tell me in Vietnamese, in short simple sentences, what
changed and how to try it. Do not start the next phase.
```

Đổi `<A1>` thành phase muốn làm. Mỗi lần một phase. Thứ tự: A1, A2, A3, A4.
A1 (heatmap) không phụ thuộc phase nào, có thể làm riêng bất cứ lúc nào.
A3 cần A2. A4 cần A3.

## Đã chốt (owner, 2026-11-25)

1. Mỗi track **6 bài**.
2. Tỉ lệ: **3 new + 1 fix + 1 redo + 1 own**. Không có bài redo phù hợp thì slot
   đó thành fix thứ 2. Tối đa 2 bài vá lỗi (fix + redo) mỗi track.
   Thứ tự: `new → fix → new → redo → new → own`.
3. Độ khó: app **chỉ gợi ý** đổi level (giữ quyết định trong `levels.ts`). Màn
   Recap khi đóng track có nút 1 chạm để xác nhận lên level.
4. Track kẹt: sau **14 ngày** không có bước nào xong, Next up hiện link
   "close and make a new one". Không tự đóng.
5. `TRACKS` cũ (`lib/exercise/tracks.ts`): làm **nguồn topic** cho bài new. Giữ
   trang `/tracks` để xem.
6. Today: **gộp** `WeakSpots` và `RedoRow` vào Next up.
7. `trackStepId` lưu vào bài làm **ngay trong MVP** (không so khớp `type + domain`).
8. Bài new **ưu tiên dạng bài của lỗi đang vá** (topic mới), để có thêm dữ liệu
   tiến bộ mà không giống "chép phạt".
9. Bước `own` có 2-3 dòng gợi ý mồi (viết bằng code) và nút Skip ngang hàng Start.

## Quy tắc cho mọi phase

- `AGENTS.md`: không em dash, code và comment bằng tiếng Anh, chữ trên UI càng
  ít càng tốt, không `Co-Authored-By`, chỉ commit, không push.
- Đổi tính năng nào thì sửa Handbook (`web/src/lib/handbook/content.ts`) trong
  **cùng commit**.
- Không thêm collection Firestore. Trạng thái track nằm trong một doc
  `settings/adaptiveTracks`, giống `settings/savedTopics` và `settings/termReview`.
  Không đổi `firestore.rules`.
- Không thêm thư viện.
- **Không gọi AI để sinh track.** Chọn bài là hàm thuần, có test. AI chỉ được gọi
  khi hết topic (một lần `topic-ideas`, dùng cache sẵn có). Bài tập vẫn chỉ sinh
  khi bấm Start, không sinh trước.
- **Không thêm trục độ khó mới** trong plan này (xem "Để sau").
- File gần 500 dòng thì tách trước khi thêm (luật trong `AGENTS.md`).
- `[QUYẾT ĐỊNH]` = hỏi owner trước khi làm phần đó.

## Kiểm tra mỗi phase

```bash
cd ws/app/cogi/web
npx tsc --noEmit
npx eslint .
npx vitest run
npx playwright test
```

Ghi số test trước và sau vào "Tiến độ". Chụp màn hình 1280px và 375px, sáng và
tối, cho phần UI mới. Cổng 3000 có thể đang chạy app khác: nếu vậy chạy
Playwright ở cổng 3100 với `PLAYWRIGHT_BASE_URL` (giống R1).

---

## A1 - Heatmap bấm được (History)

### Người dùng thấy

- Lưới vẫn kiểu GitHub, 14 tuần. Màu ô theo **số bài trong ngày** (0, 1, 2, 3+),
  các mức xám như hiện nay. Chú thích đổi từ dạng bài sang "less · more".
- Rê chuột: `title` = "Tue 25 Nov · 2 exercises".
- Bấm một ô có bài: dưới lưới hiện danh sách các bài ngày đó. Mỗi dòng:
  tên bài · dạng bài · level · dòng điểm · lỗi chính (nếu có).
  Bấm dòng thì mở bài đó trong phần xem lại của History.
- Bấm lại ô đó, hoặc ô trống, thì đóng danh sách.

### Cách làm

1. Hàm thuần `activityByDay(rows): Map<string, Exercise[]>` trong
   `web/src/lib/history.ts`. Chỉ bài đã xong, khóa là ngày địa phương
   (`en-CA`, giống code hiện tại). Có test.
2. Hàm thuần `missesOf(ex): string[]` trong `lib/exercise/weak-spots.ts`: trả về
   nhãn của các mục bị sai trong một bài, tách từ `tallyExercise`. `weakSpots()`
   phải dùng chung logic này, không lặp code. Có test. "Lỗi chính" = nhãn đầu tiên.
3. `HistoryActivityHeatmap`: ô là `<button>` (bấm được trên điện thoại, dùng được
   bằng bàn phím, có `aria-label`). Ô tương lai và ô trống không bấm được. Thêm
   prop `onOpenExercise(id)`; trang History truyền `setSelectedId`. Nếu bài bị
   bộ lọc ẩn, dùng cách History đang xử lý (`openExerciseHiddenByFilters`).
4. Dòng điểm dùng `scoreSummary(ex)?.line`. Level dùng `LEVEL_LABELS`, bỏ qua nếu
   bài cũ không có `level`.
5. Handbook: mục History, một dòng "Tap a day to see what you did."
6. E2E: có bài ở một ngày → bấm ô → thấy tên bài → bấm dòng → phần xem lại mở.

---

## A2 - Dữ liệu và thuật toán track (chưa đổi UI)

### Kiểu dữ liệu

`web/src/lib/tracks/adaptive.ts` (kiểu và hàm thuần),
`web/src/lib/db/adaptive-tracks.ts` (đọc/ghi doc).

```ts
type StepKind = "new" | "fix" | "redo" | "own";

interface GenStep {
  id: string;              // unique, e.g. "<trackId>-3"
  kind: StepKind;
  type: TrackStepType;     // widen TrackStepType if a fix needs strategy/reframe
  domain: string;          // "" for own
  focus?: string;          // weak spot key, sent as ?focus=
  redoOf?: string;         // exercise id to redo
  source?: "catalog" | "saved" | "ai";
  skipped?: boolean;
}

interface GenTrack {
  id: string;
  n: number;               // track number, 1, 2, 3...
  startedAt: string;
  targets: string[];       // weak spot keys this track aims at
  baseline: Record<string, Tally>;  // each target's misses/chances when the track started
  steps: GenStep[];
}

interface TrackRecap {
  id: string; n: number;
  startedAt: string; closedAt: string;
  closeReason: "done" | "stale";
  done: number; skipped: number; total: number;
  ratings: { good: number; ok: number; poor: number };
  targets: { key: string; before: Tally; during: Tally; cleared: boolean }[];
}

interface AdaptiveTracksDoc {
  id: "adaptiveTracks";
  current: GenTrack | null;
  past: TrackRecap[];      // newest first, keep 12
}

type Tally = { misses: number; chances: number };
```

### `trackStepId` trên bài làm

1. Thêm `trackStepId?: string` vào phần chung của các kiểu bài trong
   `lib/types/exercise.ts`.
2. Helper `trackStepFromUrl()` đọc `?step=`, giống `getGenerationContext()` đọc
   `?focus=`. Các flow mà track dùng (ít nhất analytical, systems, evaluative,
   judgment; thêm strategy, reframe nếu `TrackStepType` mở rộng) ghi field này
   lúc tạo doc (chỗ đang có `createdAt: new Date().toISOString()`).
3. **`redoRow()` phải xóa `trackStepId`** trong `freshCommon()`. Nếu không, bài
   redo mang id của bước cũ và đánh dấu sai. Có test cho việc này.
4. `startRedo(ex, trackStepId?)`: bài redo của bước `redo` mang id của bước đó.
5. Mở lại bài dở (`resumeId`) không cần `?step=`: field đã nằm trong doc.

### Bước xong

`genTrackProgress(track, completed)`: bước xong khi có bài đã xong với
`trackStepId === step.id`. Bước `skipped` tính như đã qua. Track xong khi
xong + skipped = 6. Không so khớp `domain` nữa (track cũ trong `TRACKS` vẫn
giữ cách so khớp cũ cho trang `/tracks`).

### Thuật toán `buildNextTrack(input): GenTrack`

Đầu vào: `completed` (mới nhất trước), `all` (cả bài dở, cho `canRedo`),
`past` (recap), `savedTopics`, `aiIdeas` (có thể rỗng), `today`, `n`.

1. **Mục tiêu.** `spots = weakSpots(completed, 5)`, bỏ spot có `aim === null`
   (calibration) và spot đã "cleared" ở recap gần nhất. Lấy tối đa 2 spot đầu
   làm `targets`. Lưu `baseline` = tally của từng target lúc này.
2. **Cold start** (không có target): 6 bài, kind là `new` cho 5 bài đầu và
   `own` ở cuối. 5 bài new thuộc 5 dạng khác nhau (track dò).
3. **Slot fix:** target 1, dạng bài của nó, `focus = key`, topic mới.
4. **Slot redo:** hàm mới `redoForTrack(completed, all, today, targetTypes)` trong
   `lib/exercise/redo.ts`: bài có thể redo (`canRedo`), được chấm "poor", cùng
   dạng với một target; cũ nhất trước. Cần chấm "poor": tách `rateRow` ra khỏi
   `level-suggestion.ts` thành hàm dùng chung. Không có thì slot này thành fix
   thứ 2 (target 2 nếu có, không thì target 1 với topic khác).
5. **Slot new (3 bài):**
   - Dạng bài: ít nhất 1 bài cùng dạng với target 1 (luật đã chốt số 8). Còn lại
     ưu tiên dạng ít làm nhất trong track trước. Cả track có ≥3 dạng, không dạng
     nào quá 3 bài.
   - Topic, theo thứ tự: bước chưa làm trong `TRACKS` (đúng dạng) → `savedTopics`
     (đúng `mode`) → `aiIdeas`. Nguồn ghi vào `source`.
   - Bỏ topic đã làm: so `normalizeTitleKey(domain)` với `domain` của mọi bài đã
     làm và với `practicedTopics`.
6. **Slot own:** `domain = ""`, dạng bài = dạng của target 1 nếu dạng đó có chế độ
   "your own situation" (custom scenario), không thì `judgment`. Cold start dùng
   `judgment`. A2 kiểm tra danh sách dạng có custom scenario rồi ghi vào code.
7. **Thứ tự:** `new → fix → new → redo → new → own`.
8. **Seed:** dùng `shuffledOrder` với seed = id track, để cùng đầu vào cho cùng kết
   quả (test được).

`aiIdeas` chỉ được lấy (một lần gọi `topic-ideas`, có cache) khi `TRACKS` và
`savedTopics` không đủ 3 topic. Hàm thuần không gọi mạng: nơi gọi lo việc này.

### Đóng track và recap

`closeTrack(track, completed, reason, now): TrackRecap`, hàm thuần:

- `ratings`: đếm good/ok/poor của các bài thuộc track (dùng `rateRow`).
- `targets[].during`: tally của target **chỉ trong các bài thuộc track**.
- `cleared`: target dưới ngưỡng của `weakSpots` (dưới 2 lần sai **hoặc** dưới 1/3)
  trong track này **và** cả trong track trước có nhắm nó. Một track tốt chưa đủ:
  mẫu quá nhỏ.
- `stale`: `true` khi không có bài nào của track xong trong 14 ngày (tính từ bài
  xong gần nhất, hoặc `startedAt` nếu chưa có bài nào).

### Test

Hàm thuần có test đủ: cold start; 1 target; 2 target; không có redo; topic hết
→ dùng `aiIdeas`; không lặp topic đã làm; luật dạng bài; thứ tự; recap (`cleared`
cần 2 track); stale 14 ngày; redo xóa `trackStepId`.

Phase này **chưa đổi UI**. Handbook chưa cần sửa.

---

## A3 - Today: Next up chạy track mới

### Người dùng thấy

- Today chỉ còn một khối **Next up**: thanh tiến độ, "Track 3 · 2 of 6", bước tiếp
  theo. Hàng chữ nhỏ cho biết loại bước: `new`, `fix: <tên lỗi>`, `redo`,
  `your own`.
- Bước `fix`: dòng "Aims at: Missing a connection". Bấm Start mở bài với
  `?focus=` và `?step=`.
- Bước `redo`: Start gọi `startRedo(ex, step.id)`.
- Bước `own`: hiện 2-3 dòng gợi ý mồi, rồi **Start** và **skip** cạnh nhau. Start
  mở bài ở chế độ "your own situation".
- Mọi bước có "skip" (chữ nhỏ). Skip thì đánh dấu `skipped`, sang bước sau.
- "not today" giữ nguyên như bây giờ.
- Sau 14 ngày đứng yên: thêm link "close and make a new one".
- Bước cuối xong (hoặc skip): track đóng, tạo track mới, hiện Recap (A4). Trước
  A4: chỉ đóng và tạo track mới.
- Bỏ `WeakSpots` và `RedoRow` khỏi Today (`HomeContent.tsx`). Giữ file
  `WeakSpots.tsx` nếu nơi khác còn dùng, không thì xóa.

### Gợi ý mồi cho bước `own`

Hàm thuần `ownPrompts(type, focus?): string[]` trong `lib/tracks/own-prompts.ts`.
2-3 dòng ngắn, viết sẵn bằng code theo dạng bài (và theo lỗi nếu có). Không gọi
AI. Ví dụ Evaluative: "a big purchase coming up", "a choice at work this week".
Chữ tiếng Anh, ngắn, kiểu đời thường.

### Cách làm

1. `useAdaptiveTrack()`: đọc doc; chưa có `current` thì gọi `buildNextTrack` và
   lưu. Track xong thì đóng, lưu recap, tạo track mới. Ghi doc một lần mỗi việc.
2. `NextUp.tsx` dùng track mới. Nếu file vượt ~500 dòng thì tách bước `own` ra
   component riêng.
3. Link Start: `/exercise/<type>?domain=...&step=<id>` (+ `&focus=` cho fix;
   bước own không có `domain`, mở thẳng chế độ custom scenario). Kiểm tra
   `ExerciseFlowHost` chấp nhận `domain` và `focus` cùng lúc.
4. Hai tab mở cùng lúc có thể tạo hai track: chỉ tạo khi doc vẫn chưa có
   `current` (đọc lại ngay trước khi ghi).
5. Handbook: viết lại mục Tracks (track 6 bài, 4 loại bước, skip, đóng khi xong,
   link sau 14 ngày) và mục Today. Bỏ chữ về "Your weak spots" và "Do it again"
   trên Today nếu có.
6. E2E: track mới tạo khi chưa có → làm bước 1 → tiến độ 1/6; skip một bước;
   bước own có gợi ý và skip; dữ liệu cũ 14+ ngày → hiện link close.

### [QUYẾT ĐỊNH]

- Nếu đang có track trong `TRACKS` cũ làm dở (ví dụ 3/5): Next up chuyển ngay sang
  track mới, hay cho làm hết track cũ trước? Đề nghị: chuyển ngay; các bước còn
  lại của track cũ vẫn làm được ở `/tracks` và còn được chọn làm topic new.

---

## A4 - Recap và trang `/tracks`

### Người dùng thấy

- Khi track đóng: Today hiện **Recap** một lần, phía trên Next up của track mới.
  - "Track 3 done · 5 of 6 · 1 skipped".
  - Mỗi target: "Missing a connection: 4 of 7 before → 1 of 5 in this track".
    Thêm chữ "cleared" nếu `cleared`.
  - So với track trước: good/ok/poor của hai track, một dòng.
  - Gợi ý level: dùng lại `LevelSuggestionCard`, có nút xác nhận 1 chạm (đổi level
    trong settings ngay tại đó). "Not now" dùng lại cách bỏ qua hiện có.
  - Nút "ok" để ẩn Recap.
- Trang `/tracks`:
  - Phần "Your track": track hiện tại, 6 bước với loại bước và trạng thái.
  - Phần "Past tracks": mỗi recap một dòng (số track, ngày, x of 6, target đã
    cleared). Bấm mở chi tiết như Recap.
  - Các track cũ trong `TRACKS` vẫn hiện bên dưới, đổi tên phần thành "Topic
    packs". Làm bước ở đây vẫn được, nhưng không tính vào track tự sinh.

### Cách làm

1. Recap là component riêng `components/dashboard/TrackRecap.tsx`. Đã xem thì lưu
   `seen: true` trên recap (thêm field optional vào `TrackRecap`).
2. Gợi ý level: lấy từ logic hiện có của từng dạng có bài trong track. Không thêm
   luật mới.
3. Monthly review: thêm số track đã đóng trong tháng vào `monthStats` (một con số,
   prompt chỉ đọc số).
4. Handbook: mục Tracks thêm Recap, "cleared" nghĩa là gì (2 track liền dưới
   ngưỡng), và "Topic packs".
5. E2E: đóng track → Recap hiện với số đúng → bấm ok → ẩn; nút lên level đổi
   level trong settings.

---

## Để sau (không làm trong plan này)

- **Twist độ khó** cho Analytical, Systems, Evaluative (thiếu dữ kiện, nguồn mâu
  thuẫn, hệ quả bậc 2). Chỉ làm twist mà bộ chấm bằng code chấm được (ví dụ
  `decoys` ở Analytical, `secondNodeImpact` ở Systems). Nếu bộ chấm không chấm
  được, dữ liệu tiến bộ sẽ sai.
- **Kiểm tra lại lỗi đã cleared:** thêm một bài focus sau 2 track (ôn cách quãng
  cho kỹ năng).
- Đánh dấu ngày đóng track trên heatmap.
- Bỏ hẳn "Topic packs" nếu không còn dùng.

## Không làm (đã cân nhắc)

- AI sinh cả track hoặc viết lời bình cho Recap: tốn token, khó test. Monthly
  review đã làm việc viết lời.
- Sinh trước 6 bài khi tạo track: phí token nếu skip, topic dễ cũ.
- API tin tức cho "chủ đề thời sự": model không có tin mới, dễ bịa. Tin mới đi
  qua `savedTopics` do owner tự lưu.
- App tự tăng level: trái với quyết định trong `levels.ts`.
- Streak, điểm, huy hiệu cho track (giống lý do trong PLAN-retention).

## Tiến độ

(AI làm ghi một dòng mỗi phase: ngày, commit, ghi chú, số test trước/sau.)

- A1 (2026-11-25): heatmap bấm được. Màu ô theo số bài (0, 1, 2, 3+), chú thích "less · more". Bấm ô: danh sách bài ngày đó (dạng · level · điểm · lỗi chính), bấm dòng thì mở Review và cuộn tới. Hàm mới: `activityByDay`, `activityLevel`, `activitySwatchClass` (`lib/history.ts`, thay `typeSwatchClass`), `missesOf` (`weak-spots.ts`, dùng chung `tallyExercise`). Heatmap dùng `rows` đã lọc, nên bài nào bấm được cũng nằm trong danh sách (không cần `openExerciseHiddenByFilters`). Không có mục Handbook "History": thêm một dòng vào mục "Reading the feedback". Kiểm tra: tsc sạch, eslint 0 lỗi (19 cảnh báo, giống trước), vitest 970/970 (trước 967), Playwright 244/247 (thêm 1 test, sửa 1 test chú thích). 3 lỗi không do A1: `dashboard-features:154` đếm 25 mục Handbook nhưng commit `9da2fe2f` (AI cost) đã thêm mục thứ 26; 2 test khác (`dashboard-features:22`, `evaluative-dealbreaker:50`) qua khi chạy lại riêng. Ảnh 1280px và 375px, sáng và tối.
- A2 (2026-11-25): dữ liệu và thuật toán, chưa đổi UI. `lib/tracks/adaptive.ts` (kiểu, `buildNextTrack`, `missingTopics`, `trackRows`, `genTrackProgress`, `isStale`, `closeTrack`, `withRecap`), `lib/db/adaptive-tracks.ts` (doc `settings/adaptiveTracks`). `trackStepId` trên mọi kiểu bài, đọc `?step=` bằng `trackStepFromUrl()` và ghi ở 6 flow (analytical, systems, evaluative, judgment, strategy, reframe). `redoRow` xóa `trackStepId`; `startRedo(ex, trackStepId?)`. `rateRow` tách thành `rateExercise` (`lib/exercise/rate-exercise.ts`); `redoForTrack` trong `redo.ts`; `tallyRows`, `isWeak` xuất từ `weak-spots.ts`. `TrackStepType` thêm strategy, reframe. Khác plan: track dò (cold start) ưu tiên dạng chưa có trong track trước, rồi mới tới dạng có topic sẵn, nên bước new thứ 5 (strategy) không có topic: A3 phải hỏi AI hoặc để người dùng tự chọn. Kiểm tra: tsc sạch, eslint 0 lỗi (19 cảnh báo, như trước), vitest 982/982 (trước 970), Playwright 245/247 + 1 test mới (bài mở bằng `?step=` giữ step id). 2 lỗi có từ trước, cũng lỗi khi bỏ thay đổi A2: `dashboard-features:120` (Reasoning picker) và `dashboard-features:177` (Explore → Tracks).
- A3 (2026-11-25): Today chạy track tự sinh. `NextUp` viết lại: "Track n · x of 6 done", dòng loại bước (`new`, `fix · <lỗi>`, `redo`, `your own`), Start / Continue, `skip`, `not today`, link "close and make a new one" khi kẹt 14 ngày. Bước own có 3 gợi ý (`lib/tracks/own-prompts.ts`). Bước redo gọi `startRedo(ex, step.id)`. `lib/tracks/sync.ts`: đóng track xong, tạo track mới, gọi `topic-ideas` một lần khi thiếu topic, đọc lại doc trước khi ghi (hai tab), và chỉ một lần sync mỗi lúc trong một tab. Hook `useAdaptiveTrack`. Bỏ `WeakSpots.tsx`, `RedoRow.tsx`, `redoSuggestion`, `weakSpotHref` (không còn ai dùng). Judgment và Reframe giờ hiểu `?source=custom_scenario` (mở "My situation", lên Standard nếu đang Guided). Handbook: Learning tracks, Your weak spots, Do it again. QUYẾT ĐỊNH về track cũ đang dở: theo đề nghị, chuyển ngay; track cũ vẫn ở `/tracks`. Kiểm tra: tsc sạch, eslint 0 lỗi (19 cảnh báo, như trước), vitest 983/983, Playwright 258 qua (thêm test fix, redo, own + track 2, track kẹt, Judgment own; sửa test tracks và Today), 1 lỗi chập chờn (`geo-timelines:27`, qua khi chạy lại). Ảnh 1280px và 375px, sáng và tối.
- A4 (2026-11-25): Recap và `/tracks`. Today hiện "Last track" một lần sau khi track đóng (`TrackRecap.tsx`, phần số dùng chung `components/tracks/RecapBody.tsx`): số bước, mỗi lỗi được nhắm "missed x of y before → a of b in this track", chữ "cleared", good/ok/hard so với track trước, và tối đa một gợi ý level (luật cũ `levelSuggestionFor`, `LevelSuggestionCard` thêm tên dạng bài), đổi level một chạm. "ok" ghi `seen: true`. `/tracks`: Your track (6 bước, trạng thái, Start cho bước tiếp; bước redo trỏ về Today), Past tracks (mở lại recap), Topic packs (track cũ, đóng sẵn). Bỏ `currentTrack` (không còn dùng). Monthly review: `tracksDone` trong `monthStats` và schema (optional, review cũ vẫn đọc được), prompt có một dòng số track. Chữ bước dùng chung `lib/tracks/step-text.ts`. Handbook: Learning tracks thêm Recap, "cleared", Past tracks, Topic packs. Kiểm tra: tsc sạch, eslint 0 lỗi (19 cảnh báo, như trước), vitest 983/983 (bỏ 3 test `currentTrack`, thêm 3), Playwright 252 qua + sửa `simulators:42` (Topic packs đóng sẵn); lỗi còn lại: `dashboard-features:120`, `:177` (có từ trước A2), `:22` (qua khi chạy lại). Ảnh 1280px và 375px, sáng và tối.
