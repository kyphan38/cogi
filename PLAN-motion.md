# PLAN-motion - cogi: chuyển động và tương tác

Viết ngày 2026-10-21 để giao cho một AI khác làm (hoặc làm trong phiên
này). Owner chưa duyệt: hỏi owner trước khi bắt đầu P1.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/cogi (app code is in web/). Read
ws/app/AGENTS.md, cogi/AGENTS.md, ws/app/DESIGN.md (sections "Motion" and
"Layout") and cogi/PLAN-motion.md first. Implement only phase <P1> from
PLAN-motion.md, exactly as written. Follow "Quy tắc cho mọi phase", "CSS
dùng chung" and "Lỗi hay gặp". Run every command in "Kiểm tra mỗi phase" and
fix all failures you caused. Then update the Motion section in
web/README.md and the "Tiến độ" list, commit only the files you changed on
main (no Co-Authored-By) and stop. Do not push unless I ask. Tell me in
Vietnamese, in short simple sentences, what changed and how to try it. Do
not start the next phase.
```

Đổi `<P1>` thành phase muốn làm. Mỗi lần chỉ một phase.

## Đọc trước khi làm

1. `ws/app/AGENTS.md` và `cogi/AGENTS.md`: không em dash (U+2014), code và
   comment bằng tiếng Anh, chữ trên UI càng ít càng tốt, không ghi
   `Co-Authored-By`. **cogi: chỉ commit, không push** nếu owner không bảo.
   Next.js ở đây là bản 16: đọc docs trong `web/node_modules/next/dist/docs/`
   nếu đụng tới API của Next.
2. `ws/app/DESIGN.md`, phần **Motion**: easing, thời lượng, quy tắc. Plan
   này chỉ áp dụng phần đó cho cogi.
3. Code đã làm xong cùng hệ thống này, copy cách làm (không import chéo
   repo): `logi/src/lib/motion.ts`, `logi/src/hooks/usePresence.ts`,
   `logi/src/hooks/useFlip.ts`, `logi/src/components/SheetShell.tsx`,
   `noda/components/ModalShell.tsx`, `noda/components/ToastLayer.tsx`.
   `logi/PLAN-motion.md` và `fina/PLAN-motion.md` ghi các bẫy của React
   Compiler lint.
4. Luật riêng của cogi phải giữ:
   - **Cogi là app đọc và suy nghĩ.** Trang dài toàn chữ. Chuyển động chỉ để
     chỉ ra thay đổi, không bao giờ để gây chú ý. Không có gì chạy khi trang
     mới hiện (ngoài hiệu ứng chuyển trang đã có).
   - **Không đổi chữ trên UI** (`Generating…`, `Thinking...`, `Go deeper`).
     Không đổi nội dung AI, không đổi prompt, không đổi logic bài tập.
   - **Chỉ xám** (DESIGN.md). Bốn chấm màu của thẻ Geopolitics
     (`--semantic-*`) giữ nguyên.
   - **Không phá layout.** Có test tự động chống tràn ngang trên điện thoại
     (`tests/ui-ux/mobile-overflow.spec.ts`, `layout-architecture.spec.ts`).
     Hiệu ứng chỉ dùng `opacity` và `transform`, không làm trang rộng ra.
   - **Không thêm thư viện.** `tw-animate-css` đã có trong `package.json` nhưng
     DESIGN.md chọn CSS thuần: không dùng class của nó cho phần mới.

## Hiện trạng (2026-10-21)

- `web/src/app/globals.css` có ba khối chuyển động riêng, mỗi khối tự có
  `prefers-reduced-motion`: toast (`toast-cogi-*`, 280ms), modal
  (`cogi-modal-backdrop` 280ms, `cogi-modal-panel` 380ms), chuyển trang
  (`cogi-main-route-enter`, 220ms, dùng ở `app/(main)/template.tsx`). Toast
  và modal **chỉ có hiệu ứng vào**, không có hiệu ứng ra.
- Chỉ có **một** modal: hộp "Delete exercise?" ở
  `app/(main)/exercise/history/page.tsx` (dòng ~890). Có một toast dùng
  chung (`components/ui/toast.tsx`, `ToastProvider`, hẹn giờ 3,2s).
- Chờ AI: `InlineSpinner` (`components/ui/inline-spinner.tsx`) là vòng
  quay (`animate-spin`), dùng ở khoảng 15 chỗ cạnh chữ `Generating…`,
  `Loading…`. Trái với DESIGN.md ("không vòng quay"). Khung chờ dùng
  `animate-pulse`: `PerspectiveLoadingCard`, `history-exercise-list-skeleton`,
  `TopicSuggestionPicker`.
- Mọi bài tập đi qua `ExerciseShell` (`components/shared/ExerciseShell.tsx`):
  một hàng chữ bước "1. Setup · 2. ... · 3. AI feedback" và vùng nội dung.
  Đổi bước không có hiệu ứng.
- Phản hồi AI hiện cả khối một lúc (`AIPerspective.tsx`, `*AnswerKey.tsx`,
  `AnswerKeyParts.tsx`). "Go deeper" (`DeepDivePanel.tsx`) mở ra tức thì,
  mũi tên đổi tức thì, chữ `Thinking...` đứng yên.
- Nút (`components/ui/button.tsx`) và các thẻ chọn (`LevelPicker`,
  `TopicSuggestionPicker`) chỉ đổi màu, không có phản hồi chạm.
- Test: `vitest` cho `src/**/*.test.ts` (không có jsdom, không test
  component) và Playwright (`tests/*.spec.ts`, `npm run test:e2e`, cổng 3000,
  tự bật `npm run dev`). Playwright vào app **không cần đăng nhập** qua
  `bypassFirebaseAuth(page)` trong `tests/helpers/auth-setup.ts` (đặt cờ
  `__E2E_AUTH_BYPASS__`), và có mock AI trong `tests/helpers/exercise-flow.ts`.
- Lint dùng React Compiler (Next 16): cấm `setState` trong `useEffect`
  (code cũ có chỗ phải tắt bằng `eslint-disable-next-line`; đừng thêm chỗ mới).

## Quy tắc cho mọi phase

- Theo đúng phần **Motion** trong DESIGN.md: chỉ `opacity` và `transform`,
  reduced motion phải chạy, không vòng lặp gây chú ý, không thư viện.
- Mỗi cử chỉ phải có cách thay thế (nút, phím, chữ có sẵn).
- Không đổi logic bài tập, AI, lưu dữ liệu (`src/lib/*`). Chỉ đổi UI. Hàm
  thuần mới phải có test vitest.
- Không đổi chữ trên UI. **Không cần cập nhật Handbook**
  (`src/lib/handbook/content.ts`): chuyển động không phải tính năng cho người
  dùng. Nếu bạn lỡ đổi chữ hay hành vi, thì phải cập nhật (xem `AGENTS.md`).
- Mỗi phase xong: cập nhật phần **Motion** trong `web/README.md` (tạo mới
  nếu chưa có, ngắn, tiếng Anh), ghi một dòng vào "Tiến độ" cuối file này,
  rồi **hỏi owner trước khi làm phase tiếp theo**.

## Kiểm tra mỗi phase

```bash
cd ws/app/cogi/web
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
```

Playwright (cần cổng 3000 trống, hoặc đã có `npm run dev` chạy sẵn):

```bash
npx playwright test --workers=1 --reporter=list
```

- **Chạy Playwright một lần trước khi sửa** và lưu output ra file. Sau mỗi
  phase chạy lại, lưu ra file khác, rồi so **số `passed`** với tổng số test
  (`npx playwright test --list`). Đọc dòng cuối `N passed` không đủ nếu có
  `skipped` hay `failed`. Chỉ cần không có test **mới** fail do mình.
- Xem hiệu ứng thật: viết một spec Playwright tạm (xoá sau) dùng
  `bypassFirebaseAuth` và mock AI, rồi đọc class và style bằng
  `page.evaluate`. Trình duyệt trong pane của app có thể không vẽ hình
  (`visibilityState` là `hidden`, `requestAnimationFrame` không chạy): nếu vậy,
  ghi rõ "chưa thấy tốc độ".
- Thử màn 375px và màn rộng, và một lần với reduced motion bật
  (`page.emulateMedia({ reducedMotion: 'reduce' })`).
- Commit: chỉ add đúng đường dẫn đã sửa (`git add <file> ...`, không
  `git add -A`). Kiểm tra `git branch --show-current` là `main` trước khi
  commit. Message dạng `feat(motion): ...`. Không co-author. **Không push**
  nếu owner không bảo.

## Chỗ sửa chính (vị trí ngày 2026-10-21, có thể lệch vài dòng)

| Chỗ | File | Phase |
|---|---|---|
| Ba khối chuyển động cũ, token | `web/src/app/globals.css:308-415` | P1 |
| Vòng quay | `web/src/components/ui/inline-spinner.tsx` | P1 |
| Khung chờ | `PerspectiveLoadingCard.tsx`, `history-exercise-list-skeleton.tsx`, `TopicSuggestionPicker.tsx:78` | P1 |
| Toast | `web/src/components/ui/toast.tsx` | P1 |
| Modal xoá | `web/src/app/(main)/exercise/history/page.tsx:~890` | P1 |
| Đổi bước | `web/src/components/shared/ExerciseShell.tsx:~100-150` | P2 |
| Phản hồi AI | `AIPerspective.tsx` (`PerspectivePoint`), `AnswerKeyParts.tsx`, `*AnswerKey.tsx` | P2 |
| Go deeper | `web/src/components/exercises/DeepDivePanel.tsx` | P2 |
| Nút, thẻ chọn | `components/ui/button.tsx`, `LevelPicker.tsx`, `TopicSuggestionPicker.tsx` | P3 |
| Danh sách vừa tạo | `components/dashboard/TopicIdeasPanel.tsx`, `TopicSuggestionPicker.tsx` | P3 |
| Hoàn thành | `components/shared/PracticeFinishCard.tsx` | P3 |
| Hàng chữ điều hướng | `components/shell/AppTopNav.tsx` | P4 |
| Danh sách History | `app/(main)/exercise/history/page.tsx` | P4 |
| Chuyển trang | `app/(main)/template.tsx` | P4 |

## CSS dùng chung (sửa `globals.css`)

Thêm token vào `:root` (một lần, không cần bản dark):

```css
  --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
```

Thay ba khối cũ (toast, modal, chuyển trang) và ba khối `prefers-reduced-motion`
nhỏ của chúng bằng khối dưới. **Giữ tên class cũ** `.toast-cogi`,
`.cogi-modal-backdrop`, `.cogi-modal-panel`, `.cogi-main-route-enter` (chỗ dùng
chúng không đổi tên). Tên chung giống mora, logi, noda, fina:

```css
/* ---- Motion: short, opacity/transform only (DESIGN.md "Motion") ---- */
@keyframes fade-in {
  from { opacity: 0; }
}
.fade-in {
  animation: fade-in 180ms ease-out both;
}

@keyframes fade-out {
  to { opacity: 0; }
}
.fade-out {
  animation: fade-out 200ms ease-in both;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
}
.rise {
  animation: rise 240ms var(--ease-soft) both;
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.7); }
}
.pop {
  animation: pop 180ms var(--ease-soft) both;
}

/* A slow fade in and out for "loading"; never blinks. */
@keyframes breathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
.breathe {
  animation: breathe 3.2s ease-in-out infinite;
}

/* Modal and toast: in and out. */
@keyframes panel-out {
  to { opacity: 0; transform: translateY(8px) scale(0.98); }
}
.cogi-modal-backdrop {
  animation: fade-in 180ms ease-out both;
}
.cogi-modal-panel {
  animation: cogi-modal-panel-in 220ms var(--ease-soft) both;
}
.cogi-modal-backdrop.is-leaving {
  animation: fade-out 200ms ease-in both;
}
.cogi-modal-panel.is-leaving {
  animation: panel-out 180ms ease-in both;
}
```

(Giữ keyframe `cogi-modal-panel-in` và `cogi-main-route-fade` có sẵn; chỉ đổi
thời lượng và easing như trên. Route: `cogi-main-route-enter` 220ms
`var(--ease-soft)`.)

Toast: giữ vị trí hiện có (cố định góc phải, giữa đáy trên điện thoại), đổi vào
thành `toast-cogi-slide-in` 240ms `var(--ease-soft)` và thêm lớp ra:

```css
@keyframes toast-cogi-slide-out {
  to { transform: translateX(24px); opacity: 0; }
}
@keyframes toast-cogi-slide-down {
  to { transform: translateX(50%) translateY(16px); opacity: 0; }
}
.toast-cogi.is-leaving {
  animation: toast-cogi-slide-out 200ms ease-in both;
  pointer-events: none;
}
@media (max-width: 639px) {
  .toast-cogi.is-leaving {
    animation: toast-cogi-slide-down 200ms ease-in both;
  }
}
```

Khối reduced motion chung, đặt **sau** mọi keyframe và class motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

## Lỗi hay gặp (đọc kỹ)

1. **Không có test component.** Đừng cài jsdom. Logic thành hàm thuần trong
   `src/lib/motion.ts`, test trong `src/lib/motion.test.ts` (vitest chỉ chạy
   `src/**/*.test.ts`).
2. **`matchMedia` không có trong Node.** `reducedMotion()` trả `true` khi
   không có `matchMedia`.
3. **React Compiler lint.** Cấm `setState` trong `useEffect`; tính state "đã
   đổi" lúc render (mẫu `prev`/`setPrev` trong `logi/src/components/Toasts.tsx`
   và `noda/components/ToastLayer.tsx`). Một `setState` trong callback của
   `setTimeout` hoặc `requestAnimationFrame` thì được.
4. **Hydration.** Trang render trên server. Đừng đọc `matchMedia` lúc render
   đầu rồi đổi class theo nó. Đọc trong effect hoặc lúc có sự kiện.
5. **Đừng remount nội dung bài tập.** `ExerciseShell` bọc cả bài tập. Đổi
   `key` của vùng nội dung theo bước sẽ huỷ state con (ô nhập chưa lưu,
   cuộn, tiêu điểm). Hiệu ứng đổi bước dùng Web Animations API trên phần tử
   có sẵn (`el.animate`) qua `useEffect`/`useLayoutEffect`, không dùng `key`.
6. **Không làm trang rộng ra.** Test `mobile-overflow` và
   `layout-architecture` đo chiều ngang. `transform: translateX` ngoài khung
   (toast ra) phải nằm trong phần tử `fixed` không gây thanh cuộn ngang.
7. **Phản hồi AI chỉ chạy khi nó vừa về.** Mở lại bài từ History hay tải lại
   trang thì hiện sẵn, không chạy (DESIGN.md quy tắc 8). Cách biết "vừa về":
   component đã thấy trạng thái đang chờ (loading) ngay trước đó trong cùng
   lần mở.
8. **Tên class.** Tailwind v4 đọc class từ chuỗi trong mã: viết class đầy đủ
   trong chuỗi, đừng ghép bằng nối chuỗi.
9. **Không em dash.** Kiểm tra trước khi commit (zsh):
   `grep -rn $'\xe2\x80\x94' web/src web/tests PLAN-motion.md web/README.md`
   phải rỗng.

---

## P1 - Nền móng: CSS, hook, thay vòng quay, toast và modal có hiệu ứng ra

### P1.1 CSS và token

File: `web/src/app/globals.css`. Làm đúng như "CSS dùng chung": thêm token và
khối Motion, rút ngắn thời lượng cũ, thay các khối reduced motion nhỏ bằng
một khối chung ở cuối.

### P1.2 Hàm và hook

File mới: `web/src/lib/motion.ts`, `web/src/lib/hooks/usePresence.ts`,
`web/src/lib/motion.test.ts`.

- `motion.ts`: `reducedMotion()` (trả `true` khi không có `matchMedia`) và
  `leavingItems()`, copy từ `logi/src/lib/motion.ts`.
- `usePresence.ts`: copy từ `logi/src/hooks/usePresence.ts` (state tính lúc
  render), import `reducedMotion` từ `@/lib/motion`.
- Test: `reducedMotion()` là `true` trong Node; `leavingItems` giống bài của
  logi (xoá một, không đổi, thêm mới không tính là rời).

### P1.3 Thay vòng quay bằng chấm thở

File: `web/src/components/ui/inline-spinner.tsx`.

- Giữ tên và API (`InlineSpinner({ className })`), đổi hình: một chấm tròn
  `size-2` (`rounded-full bg-current`) với class `breathe`, `aria-hidden`.
  Khoảng 15 chỗ dùng nó tự đổi theo, không sửa từng chỗ.
- Chữ cạnh nó (`Generating…`) giữ nguyên. Chỉ sửa khoảng cách nếu chấm nhỏ hơn
  vòng cũ làm chữ lệch (giữ chiều cao dòng).
- Bỏ import `Loader2`.

### P1.4 Khung chờ thở chậm

File: `PerspectiveLoadingCard.tsx`, `history-exercise-list-skeleton.tsx`,
`TopicSuggestionPicker.tsx` (dòng ~78).

- Đổi `animate-pulse` thành `breathe`. Giữ kích thước.

### P1.5 Toast có hiệu ứng ra

File: `web/src/components/ui/toast.tsx`.

- `ToastProvider` hiện render `{toast ? <div .../> : null}` nên toast mất
  ngay. Giữ toast cuối và thêm 200ms với class `is-leaving` khi `toast` thành
  `null` (`usePresence(toast !== null, 200)` và một state nhớ toast cuối, tính
  lúc render như `noda/components/ToastLayer.tsx`). Toast mới thay ngay, `key`
  theo nội dung + loại. Reduced motion: gỡ ngay.
- Toast đang rời đi: `pointer-events: none`, nút `✕` bị khoá, `aria-hidden`.
- Giữ hẹn giờ 3,2s, giữ API `useToast().show`.

### P1.6 Modal xoá có hiệu ứng ra

File mới: `web/src/components/ui/modal-shell.tsx`;
sửa `app/(main)/exercise/history/page.tsx` (khối `pendingDelete`).

- `ModalShell` (copy ý từ `noda/components/ModalShell.tsx`): nền + panel, giữ
  đúng class hiện có (`cogi-modal-backdrop`, `cogi-modal-panel`, z-[100], nền
  mờ, bo góc), bắt `mousedown` trên nền (không đổi sang `click`). Props:
  `onClose`, `labelledBy`, `children`.
- Đóng bằng bấm nền hoặc `Esc`: thêm `is-leaving` cho nền và panel, đợi
  200ms rồi gọi `onClose`. Reduced motion: gọi ngay. Nút Cancel/Delete bên
  trong gọi thẳng như cũ (đóng ngay).
- Hộp hiện **không** xử lý `Esc`: thêm xử lý `Esc` (chỉ trong `ModalShell`).
  `closeDeleteDialog` và `autoFocus` của ô nhập giữ nguyên.
- Chuyển hộp xoá trong History sang `ModalShell`. Test
  `tests/history-page.spec.ts` có bước xoá: phải còn pass (nút
  Cancel/Delete vẫn đóng ngay).

Xong khi: chờ AI thấy chấm thở thay vòng quay; khung chờ thở chậm; toast
trượt vào và trượt ra; hộp xoá hiện lên mượt, bấm nền hoặc `Esc` thì mờ đi
rồi đóng; reduced motion thì mọi thứ hiện và mất ngay.

---

## P2 - Bài tập: đổi bước, phản hồi AI, Go deeper

### P2.1 Đổi bước có hiệu ứng nhẹ

File: `web/src/components/shared/ExerciseShell.tsx`. Hàm thuần (nếu cần) vào
`src/lib/motion.ts`.

- Khi `stepIndex` đổi (Setup, bài làm, AI feedback), vùng nội dung
  (`<div className="flex-1">{children}</div>`) chạy một hiệu ứng vào: mờ từ
  0 và trượt lên 6px, 240ms. Dùng `ref` + `el.animate(...)` trong
  `useEffect` khi `stepIndex` khác lần trước. **Không dùng `key`** (lỗi hay
  gặp số 5). Lần mount đầu không chạy. Reduced motion (`reducedMotion()`):
  không chạy.
- Hàng chữ bước: chữ bước hiện tại đổi màu mượt (`transition-colors
  duration-150`) khi đổi bước. Giữ nguyên nội dung và độ đậm.
- Đổi "phần" trong một bước (`partLabel`, ví dụ "Part 2 of 3") không có hiệu
  ứng riêng.

### P2.2 Phản hồi AI hiện từng phần

File: `AIPerspective.tsx` (`PerspectivePoint`), `AnswerKeyParts.tsx`, các
`*AnswerKey.tsx` có danh sách dòng.

- Khi phản hồi **vừa về** (không phải mở lại từ History), mỗi điểm (`PerspectivePoint`,
  dòng answer key) vào bằng `rise`, mỗi điểm trễ thêm 40ms, tối đa 6 điểm
  (từ điểm thứ 7 trễ bằng điểm 6). Dùng `style={{ animationDelay }}`.
- Cách biết "vừa về": trong component cha của phản hồi (flow), thấy trạng
  thái `loading` chuyển từ đúng sang sai trong cùng lần mở; truyền cờ
  `fresh` xuống. Mở lại bài đã xong (`exercise.perspective` có sẵn lúc mount)
  thì `fresh` là sai: hiện sẵn.
- Không đổi nội dung, thứ tự, hay độ cao đã dành chỗ (tránh nhảy layout).
- Làm cho `AIPerspective` và ít nhất hai kiểu answer key (ví dụ
  `AnalyticalAnswerKey` và `EvaluativeAnswerKey`) trước; các flow còn lại dùng
  cùng `AnswerKeyParts` thì hưởng chung. Ghi rõ trong Tiến độ cái nào chưa
  làm.

### P2.3 Go deeper mở và đóng mượt

File: `DeepDivePanel.tsx`.

- Mũi tên (`ChevronDown`/`ChevronUp`): thay hai icon bằng một `ChevronDown`
  xoay (`transition-transform duration-200`, `rotate-180` khi mở).
- Phần thân (`data-testid="deep-dive-body"`) khi mở lần đầu hoặc mở lại:
  `rise`. Đóng: mất ngay (không cần hiệu ứng ra; không animate chiều cao).
- Chữ `Thinking...` khi đang tải: thêm `breathe` cho nút (không đổi chữ).
- Giữ `data-testid`, `aria-expanded`, và thứ tự phần tử (test E2E dùng).

Xong khi: chuyển từ Setup sang bài làm rồi sang phản hồi thì nội dung hiện lên
nhẹ, không mất chữ đã gõ; phản hồi AI vừa về hiện từng điểm một, còn bài mở
lại từ History hiện sẵn; "Go deeper" xoay mũi tên và nội dung trượt lên nhẹ.
Tất cả test Playwright của bài tập (analytical, evaluative, systems, ...) vẫn
pass.

---

## P3 - Danh sách vừa tạo, thẻ chọn, phản hồi chạm

### P3.1 Danh sách gợi ý vừa tạo

File: `TopicIdeasPanel.tsx`, `TopicSuggestionPicker.tsx`.

- Khi danh sách gợi ý (ý tưởng chủ đề, gợi ý đề) **vừa được tạo** hoặc bấm
  "More": các thẻ mới vào bằng `rise`, mỗi thẻ trễ thêm 40ms, tối đa 6 thẻ.
  Thẻ đã có không chạy lại. Tải lần đầu từ bộ nhớ (nếu có cache) thì không
  chạy.
- Thẻ đang được chọn (`pickingTitle`): giữ viền đậm, thêm `transition-colors`.

### P3.2 Thẻ chọn và nút

File: `components/ui/button.tsx`, `LevelPicker.tsx`, các thẻ chọn trong
`TopicSuggestionPicker.tsx` và `ExercisePickerCard.tsx`.

- Nút: `active:scale-[0.98]` và `transition-transform duration-100` (cộng
  vào class có sẵn của `button.tsx`; không đổi màu, kích thước).
- `LevelPicker`: đã có `transition-colors`; không thêm gì ngoài `active:scale`.
- Thẻ chọn (`button` bọc `Card`): `active:scale-[0.99]`.
- Nút `disabled` không co lại (`disabled:active:scale-100` hoặc dùng
  `enabled:active:`).

### P3.3 Hoàn thành

File: `PracticeFinishCard.tsx`.

- Khi bấm Finish và thẻ đổi sang trạng thái "Saved" **lúc đang xem**: thẻ
  hiện bằng `fade-in`. Mở lại bài đã lưu thì hiện sẵn (cùng cách biết
  "vừa xong" như P2.2).

Xong khi: bấm Generate thì các thẻ gợi ý hiện lần lượt; bấm vào nút hay thẻ
thì thấy co nhẹ; bấm Finish thì "Saved" hiện mờ vào; mở lại bài cũ không có
gì chạy.

---

## P4 - Điều hướng và History

### P4.1 Hàng chữ điều hướng

File: `components/shell/AppTopNav.tsx`.

- Từ hiện tại đổi màu và độ đậm mượt (`transition-colors duration-150`) khi
  chuyển trang. Không thêm vạch, không thêm nền (DESIGN.md: chữ là điều
  hướng). Đây chỉ là chuyển mượt, không phải marker trượt.

### P4.2 Danh sách History

File: `app/(main)/exercise/history/page.tsx`, hook mới
`web/src/lib/hooks/useRowMotion.ts` (copy ý từ `fina/src/hooks/useRowMotion.ts`),
`src/lib/motion.ts` (thêm `rowChanges`, copy từ fina, kèm test).

- Xoá một bài (qua hộp xác nhận): dòng ở lại 180ms với `row-out`, rồi gỡ;
  các dòng dưới trượt lên bằng `useFlip` (copy từ logi).
- Đổi bộ lọc, đổi trang, hoặc tải lại danh sách: không chạy gì (hơn 3 dòng đổi
  là "thay danh sách", như fina). Tải lần đầu: không chạy.
- Dòng rời đi không bấm được (`pointer-events: none`, không `onClick`),
  `aria-hidden`.
- Chỉ phần danh sách. Panel chi tiết (`detailEx`) giữ nguyên.
- Lưu ý: khung chờ danh sách (`HistoryExerciseListSkeleton`) đã dùng `breathe`
  từ P1.

### P4.3 Chuyển trang

File: `app/(main)/template.tsx`, `globals.css`.

- Đã có `cogi-main-route-enter` (từ P1: 220ms `var(--ease-soft)`, trượt lên
  4px). Giữ. Chỉ kiểm tra rằng sau P2 hiệu ứng đổi bước không chạy chồng với nó
  khi vào bài tập (lần mount đầu của `ExerciseShell` đã không chạy).

Xong khi: xoá một bài trong History thì dòng trượt ra và các dòng dưới nhích
lên; đổi bộ lọc thì danh sách đổi ngay, không chạy gì; chữ trong thanh trên
cùng đổi màu mượt khi sang trang khác.

---

## Không làm (ghi lại để AI sau khỏi đề xuất lại)

- **Làm động các `<details>`** (LearnFirst, CheckQuestions, LinkTypeGuide,
  TakeWithYouCards, các thẻ Geo): là phần tử gốc của trình duyệt, animate
  chiều cao phải viết lại. Mở và đóng ngay là đủ.
- **Animate chiều cao hay `max-height`** của bất kỳ khối nào.
- **Đếm số chạy lên** hay hiệu ứng ăn mừng khi xong bài.
- **Làm động canvas và bảng tương tác** (`SystemsFlowCanvas` của React Flow,
  `EvaluativeMatrixBoard`, `RankList` của dnd-kit, `HighlightTag`): thư viện
  hoặc thao tác kéo thả đã có chuyển động riêng, thêm vào dễ chồng.
- **Gõ chữ từng ký tự** (typewriter) cho phản hồi AI: chậm và khó đọc lại.
- **Vuốt giữa các bước** hay giữa các trang: đụng với cuộn và chọn chữ.
- **Dùng `tw-animate-css`** cho phần mới.
- **Chuyển trang kiểu View Transitions:** để sau.

## Tiến độ

(AI làm ghi một dòng mỗi phase: ngày, commit, ghi chú.)
- P1 (2026-10-21): Motion CSS block + `--ease-soft`, one global reduced-motion block (replaced three small ones), shorter toast/modal/route durations, `src/lib/motion.ts` + test, `usePresence`, `InlineSpinner` as a breathing dot (about 15 callers unchanged), skeletons `breathe`, toast exit (`id` per toast so each one plays its entry), `ModalShell` for the History delete dialog (now also closes on Esc). Playwright baseline before: 203/203 (11.2 min); checked with a throwaway spec using `bypassFirebaseAuth` (spinner is a `breathe` dot with no svg; toast shows, is replaced, leaves with pointer-events none, then goes; modal leaves via backdrop and Esc after 200ms, inner button and reduced motion close at once). Playwright after: 203/203 (11.1 min), same count as before.
