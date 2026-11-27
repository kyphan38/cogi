# PLAN-guide (cogi)

Mục tiêu: app tự chỉ flow cho người dùng, không tour, không popup.
Mockup: `ws/app/guide-mockup.html` (cogi B · top bar). Giữ nguyên theme gray-only.
Branch `feat/guide` (worktree `ws/app/cogi-guide`). Commit only, hỏi owner trước khi merge.

## G1 - Top bar 4 nhóm

- Hàng 1: `cogi` trái, 4 nhóm ở giữa `Practice · Labs · Memory · Guide`, `Settings` phải.
  Nhóm đang mở: ink + medium.
- Hàng 2: các trang của nhóm đang mở, căn giữa. Trang đang mở: ink + medium.
- Nhóm (giữ nguyên URL):
  - Practice: Today `/`, 5-minute question `/quick`, Tracks `/tracks`, New exercise `/reasoning`
    (đang làm bài: tên bài hiện trong hàng 2)
  - Labs: Geo Lab, Simulators, Briefs
  - Memory: Review terms, My terms, Forecasts, Past exercises `/exercise/history`
  - Guide: Handbook
- Bỏ `ExploreTabs` khỏi các trang (top bar đã có hàng trang).
- Phone: ẩn `cogi` và `Settings` ở hàng 1, hàng 2 trượt ngang. Settings vẫn mở được
  từ Guide (thêm vào hàng 2 của Guide).
- `lib/nav/place.ts` + test.
- Handbook: đổi "Explore > X" và "History" theo tên mới.

## G2 - Mục tiêu từng bước (hint nhạt dần)

- `lib/guide/step-goals.ts`: tên bước -> 1 dòng mục tiêu (≤ 10 chữ), test phủ hết
  các bước trong `ExerciseShell`.
- `lib/guide/hint.ts` (pure, có test): số lần xem -> `full` (1-3), `short` (4-6), `gone` (7+).
  Đếm theo từng hint, localStorage `cogi.hints`.
- `Hint` component: xl ở lề phải, nhỏ hơn thì 1 dòng dưới stepper.
- Settings: dòng `Hints: on · off · reset`.

## G3 - Where this went (PracticeFinishCard)

- Sau Finish: các dòng thật
  - `1 exercise` -> Memory · Past exercises
  - `1 plan` -> Today hỏi lại sau 7 ngày (ngày cụ thể)
- Nút chính giữ nguyên (New exercise / Compare with first try).

## Kiểm tra

- `npm run test:unit`, `tsc`, `npm run lint`, `npm run build`.
- Playwright: các spec về nav và finish.
- DESIGN.md: đổi dòng cogi trong bảng nav.
