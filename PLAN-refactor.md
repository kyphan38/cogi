# PLAN-refactor (cogi)

Trạng thái: Phase 0 xong (2026-11-15). Unit 889/889, Playwright 215/215 (208 cũ + 7 mới trong `web/tests/resume-autosave.spec.ts`). Đã thử làm hỏng resume của Judgment: test mới fail đúng như mong đợi. Phase 1 chưa làm.

Mục tiêu: tách 7 file `*ExerciseFlow.tsx` (570 - 1600 dòng) thành các phần nhỏ.
Sau refactor, thêm một loại bài tập mới chỉ cần viết phần riêng của nó, không phải copy 1000 dòng.

Không đổi tính năng. Không đổi giao diện. Người dùng không thấy khác gì.

## Nguyên tắc chung

- Mỗi phase là một commit (hoặc vài commit nhỏ). Hỏi owner trước khi bắt đầu phase mới.
- Trước và sau mỗi phase: chạy `npm run test:unit` và các Playwright spec liên quan. Số test pass phải giống nhau.
- Chỉ di chuyển và gom code. Không sửa logic, không đổi text UI, không đổi `data-testid`.
- File mới nên dưới khoảng 400 dòng.
- cogi chỉ commit, không tự push (theo memory cogi motion plan).
- Repo đang có thay đổi chưa commit của phần geo. Không đụng vào các file đó. Stage đúng đường dẫn khi commit.

## Hiện trạng

Các file to nhất (trong `web/src/components/exercises/`):

| File | Dòng |
|---|---|
| EvaluativeExerciseFlow.tsx | 1593 |
| SystemsExerciseFlow.tsx | 1523 |
| AnalyticalExerciseFlow.tsx | 1138 |
| ReframeExerciseFlow.tsx | 904 |
| JudgmentExerciseFlow.tsx | 699 |
| StrategyExerciseFlow.tsx | 694 |
| CalibrationExerciseFlow.tsx | 567 |
| HighlightTag.tsx | 614 |
| `app/(main)/exercise/history/page.tsx` | 985 |

Phần lặp lại ở gần như mọi flow:

1. State chung: `step`, `level`, `levelSuggestion`, `error`, `loading`, `confidence`, `perspectiveStructured`, `takeaway`, `finishing`.
2. Lúc mở: `listRecentDomains` + `getPracticeLevel(type)`; `chooseLevel` gọi `setPracticeLevel`.
3. `advance(next, row)`: `putExercise({...row, currentStep})` rồi `setStep`.
4. Resume: `getExercise(resumeId)`, kiểm tra loại, đổ từng field vào state, tính bước để tiếp tục.
5. Tự lưu: debounce 2 giây với `useSaveOnLeave` (`pendingSave`), bỏ qua ở bước 0 và bước xong (7).
6. Handoff từ trang New exercise (`takeScenarioHandoff`) + `autoGenerate`.
7. `regenerate` (hỏi trước khi bỏ bài đang làm).
8. `finishExercise`: `completePracticeExercise` rồi bước 7, rồi `levelSuggestionFor`.
9. Bước 0 (setup): `LevelPicker`, chọn Topic (suggested / manual), `TopicSuggestionPicker`, `DomainInput`, custom scenario.
10. Bước feedback + xong: hiện perspective, takeaway, nút finish, gợi ý level.

Có 2 nhóm flow:
- Nhóm A (nhiều bước, có domain): Analytical, Systems, Evaluative, Strategy.
- Nhóm B (bước ngắn, có area + context): Judgment, Reframe, Calibration. Dùng `FEEDBACK_STEP`.

## Cấu trúc đích

```
components/exercises/
  flow/                      # phần dùng chung cho mọi loại bài
    useExerciseFlow.ts       # state + resume + autosave + advance + finish
    useScenarioHandoff.ts    # handoff + autoGenerate
    SetupStep.tsx            # khung bước 0 (level, topic, domain, custom)
    FeedbackStep.tsx         # perspective + takeaway + finish + level gợi ý
    types.ts
  analytical/
    AnalyticalExerciseFlow.tsx   # chỉ nối các bước lại
    useAnalyticalState.ts        # state riêng + hydrate(row) + toRow()
    steps/HighlightStep.tsx
    steps/GeoGuessStep.tsx
    ...
  systems/ ...
  evaluative/ ...
  judgment/ reframe/ calibration/ strategy/
  shared/                    # LevelPicker, RankList, CheckQuestions ... (đã có)
```

`ExerciseFlowHost.tsx` giữ nguyên, chỉ đổi đường dẫn import.

## Phase 0: lưới an toàn

1. Chạy toàn bộ unit + Playwright, lưu kết quả vào file (theo memory E2E summary check: so số passed với tổng `--list`).
2. Xem `tests/state-preservation.spec.ts` có test resume cho cả 7 loại chưa. Thiếu loại nào thì thêm test: làm đến bước 2, reload, phải quay lại đúng bước và đúng dữ liệu.
3. Thêm test cho autosave: sửa dữ liệu, chờ 2 giây, reload, dữ liệu còn.

Xong khi: có test resume + autosave cho cả 7 loại, tất cả pass.

Kết quả: mỗi loại có 1 test trong `resume-autosave.spec.ts`. Test sửa dữ liệu, chờ autosave ghi vào store E2E (không rời trang), rồi reload và kiểm tra đúng bước + đúng dữ liệu. Lệnh chạy: `npx playwright test --workers=2 --reporter=list` (khoảng 7 phút).

## Phase 1: hook chung `useExerciseFlow`

Tạo `flow/useExerciseFlow.ts`, nhận cấu hình theo loại:

```ts
useExerciseFlow<Row>({
  type: "analytical",
  resumeId,
  isRow: isAnalyticalExercise,      // kiểm tra loại khi resume
  hydrate: (row) => {...},          // đổ field riêng vào state riêng
  resumeStep: (row) => FlowStep,    // bước để tiếp tục
  autosave: { deps, toRow },        // field nào thay đổi thì lưu
  doneStep: 7,
})
```

Hook trả về: `step, setStep, advance, level, chooseLevel, domainSuggestions, error, setError, loading, setLoading, confidence, setConfidence, perspectiveStructured, takeaway, setTakeaway, finishing, finish(finalRow), levelSuggestion, exercise, setExercise`.

Thứ tự áp dụng (nhỏ trước, to sau):
1. Judgment (thử nghiệm, nhỏ nhất nhóm B)
2. Calibration, Reframe
3. Strategy
4. Analytical
5. Systems, Evaluative (có số bước thay đổi theo variant: truyền `doneStep` và `resumeStep` dạng hàm)

Mỗi loại một commit. Sau mỗi loại chạy spec của loại đó.

Thêm unit test cho hook (vitest + fake `putExercise`/`getExercise`): advance lưu `currentStep`, resume bỏ qua bài đã xong, autosave không chạy ở bước 0 và bước xong.

Xong khi: không flow nào còn tự viết resume / autosave / finish.

## Phase 2: UI chung `SetupStep` và `FeedbackStep`

1. `SetupStep`: khung bước 0. Nhận `levelDescriptions`, `levelNote`, `topicArea`, `sources` (generated / real_data / custom_scenario) và `children` cho phần riêng (ví dụ ô dán real data của Analytical, task type của Evaluative).
2. `FeedbackStep`: phần `(step === feedback || step === done)`. Nhận `perspective`, `answerKey` (component riêng của từng loại), `finished`, `levelSuggestion`, `onFinish`.
3. Nhóm B (Judgment, Reframe, Calibration) có setup khác (area + context + own situation). Làm `SetupStep` có 2 biến thể, hoặc một `AreaSetup` riêng cho nhóm B. Chọn cách ít điều kiện hơn khi làm.
4. Giữ nguyên `data-testid` cũ. Có thể truyền testid qua props.

Xong khi: không flow nào còn tự vẽ LevelPicker / TopicSuggestionPicker / khung feedback.

## Phase 3: tách từng bước thành file riêng

Mỗi loại thành một thư mục. File chính chỉ gọi hook và chọn bước:

```tsx
{step === 0 && <SetupStep .../>}
{step === 1 && <MatrixStep state={s} onNext={...}/>}
{step === 2 && <ScoreStep .../>}
```

State riêng của loại đó nằm trong `useXxxState.ts` (ví dụ Evaluative: placements, criterionWeights, scores, userProposedCriteria, criteriaPhase, stakeholder mapping, probabilities, payoffs).

Các hàm thuần đang nằm đầu file (ví dụ `payloadToRow`, `systemsVariantSteps`, `cycleImpact`, `answerOptions`) chuyển sang `lib/exercise/<type>/` và thêm unit test.

Thứ tự: Evaluative và Systems trước (to nhất, lợi nhiều nhất), rồi Analytical, Reframe, các loại còn lại.

Mục tiêu: file flow chính dưới 200 dòng, mỗi file bước dưới 400 dòng.

## Phase 4: trang History và HighlightTag

1. `history/page.tsx` (985 dòng): chuyển `HistoryActivityHeatmap`, `HistoryPerspectiveBody`, các hàm ngày (`startOfWeekMonday`, `formatDate`) sang `components/history/` và `lib/history/`. Thêm unit test cho hàm ngày.
2. `HighlightTag.tsx` (614 dòng): tách phần chọn chữ (logic thuần) khỏi phần vẽ. Chỉ làm nếu thấy rõ chỗ tách; nếu không thì để lại.

## Phase 5: hướng dẫn thêm loại bài mới

1. Viết `web/docs/add-exercise-type.md`: các bước tạo thư mục, hook state, các step, đăng ký vào `FLOW_BY_TYPE`, thêm spec.
2. Thêm dòng vào `AGENTS.md` của cogi: file trên 500 dòng thì tách trước khi thêm tính năng.
3. Handbook không cần đổi (không có tính năng mới).

## Rủi ro

- Thứ tự `useEffect` thay đổi có thể làm resume hoặc autosave chạy sai lúc. Phase 0 có test để bắt lỗi này.
- `eslint-disable react-hooks/exhaustive-deps` đang có ở autosave. Giữ đúng deps như cũ khi chuyển vào hook.
- Systems và Evaluative có số bước thay đổi theo variant (geo, resilience, uncertainty). Đừng ép chúng vào số bước cố định.
