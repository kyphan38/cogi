# PLAN - Tách database Firestore (cogi)

Ngày viết: 2026-09-01. Trạng thái: **đã làm xong bước 1-6** (2026-09-01).
Còn lại bước 7 do logi làm. Đây là bản sửa cho lỗi
`permission-denied` mà cogi đang gặp.

Bản song song: `logi/roadmap/PLAN-db-split.md`, `noda/PLAN-db-split.md`.

Mọi lệnh trong file này chạy từ `cogi/web`, không phải từ `cogi/`.

---

## 0. Vì sao

Ba app **cogi**, **logi**, **noda** dùng chung project `kyphan38-apps` và dùng chung
một database Firestore `(default)`.

Một database chỉ có **một** bộ rules. `firebase deploy --only firestore:rules` thay
toàn bộ bộ rules. Ngày 2026-08-26 logi deploy → rules của cogi bị xoá sạch → mọi lượt
đọc của cogi trả về `permission-denied`. Đó là gốc của việc "nút bấm không phản ứng":
`fetchRecommendation` → `getUserLanguageLevelForRequest()` → đọc Firestore → hỏng →
`catch { }` ở `reasoning/page.tsx:76` nuốt lỗi → màn hình đứng im.

Cách chữa: mỗi app một database riêng. Rules đi theo từng database nên hết đè nhau.

| App  | Database mới |
|------|--------------|
| cogi | `cogi-db`    |
| logi | `logi-db`    |
| noda | `noda-db`    |

`(default)` giữ dữ liệu cũ, khoá deny-all sau khi cả ba app xong.

**cogi làm trước.** Việc này không đụng vào `(default)`, nên logi và noda vẫn chạy
bình thường trong lúc cogi chuyển.

### Giá phải trả

Firestore chỉ cho một database miễn phí mỗi project
(<https://firebase.google.com/docs/firestore/quotas>). Ba database đặt tên nghĩa là cả
ba đều tính tiền. Mức dùng hiện tại nhỏ, ước tính cả ba dưới 1 USD/tháng. Project đã
bật Blaze rồi.

---

## 1. Ba cái bẫy phải nhớ

1. `firebase.json` phải đổi `firestore` từ object sang **mảng**. Viết
   `"database": "(default)"` có ngoặc; viết `"default"` sẽ lỗi 404.
2. Với dạng mảng, `firebase deploy --only firestore:rules` in "Deploy complete!"
   nhưng **không deploy gì cả**
   (<https://github.com/firebase/firebase-tools/issues/10447>).
   Luôn dùng `firebase deploy --only firestore`.
3. Database mới phải **cùng region** với `(default)`. Region không đổi được sau khi
   tạo. Xem region ở Console → Firestore → Databases.

---

## 2. Các bước

### Bước 1 - Tạo database (Console)

Console → Firestore → Databases → Create database.
- Database ID: `cogi-db`
- Region: giống hệt `(default)`

### Bước 2 - Dọn `firebase.json`

Hiện tại:

```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage": { "rules": "storage.rules" }
}
```

Đổi thành:

```json
{
  "firestore": [
    {
      "database": "cogi-db",
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    }
  ]
}
```

Bỏ hẳn khối `storage`. Lý do: `grep -rn "getStorage" src` không ra kết quả nào - cogi
**không dùng Firebase Storage**. File `storage.rules` của cogi chỉ là bản chép rules
của noda (comment đầu file ghi rõ "Noda media uploads"). Giữ lại thì mỗi lần cogi
deploy storage là một lần đè rules của noda. Xoá luôn `storage.rules`.

### Bước 3 - Dọn `firestore.rules`

Trong `isAllowedCollection` có hai tên **không phải của cogi**: `lessons` và
`sidebarFolders`. Đó là collection của noda, được thêm vào cho noda khỏi hỏng khi
dùng chung `(default)`. Sang `cogi-db` thì noda không còn ở đây nữa - xoá hai dòng đó.

Danh sách còn lại (14 collection, đây cũng là danh sách phải chép ở bước 5):

```
actions, activeMathSessions, aiArtifacts, cachedTopicLists, confidenceRecords,
decisions, delayedRecallQueue, exercises, journalEntries, perspectiveDisagreements,
practicedTopics, settings, weaknesses, weeklyReviews
```

Deploy:

```bash
firebase deploy --only firestore
```

Chạy trước khi chép dữ liệu, để index kịp build.

Kiểm tra: Console → Firestore → chọn `cogi-db` → tab Rules phải thấy
`isAllowedCollection`. Nếu tab Rules trống thì gần như chắc là dính bẫy số 2.

### Bước 4 - Sửa code

Thêm `src/lib/firebase-db-id.ts`:

```ts
// Database id của cogi trong project kyphan38-apps.
// logi dùng 'logi-db', noda dùng 'noda-db'. Xem docs/PLAN-db-split.md.
export const DB_ID = "cogi-db";
```

Hai file phải sửa:

**`src/lib/auth/firebase-client.ts`** (hàm `getFirebaseFirestore`, khoảng dòng 54-70):

```ts
cachedFirestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, DB_ID);
// ...
cachedFirestore = getFirestore(app, DB_ID);   // cả hai nhánh fallback
```

`initializeFirestore` nhận `databaseId` ở tham số **thứ ba**, sau `settings`.

**`src/lib/firebaseAdminFirestore.ts`** (dòng 10):

```ts
firestoreSingleton = getFirestore(getFirebaseAdminApp(), DB_ID);
```

Sót một chỗ thì chỗ đó vẫn đọc `(default)` và sẽ `permission-denied` sau bước 7.
Tìm sót bằng:

```bash
grep -rn "getFirestore(\|initializeFirestore(" src scripts tests
```

### Bước 5 - Chép dữ liệu

**Quan trọng**: trong `(default)`, `users/{uid}/` chứa dữ liệu của **cả ba app** vì ba
app dùng chung một tài khoản, một UID. Chỉ chép đúng 14 collection ở bước 3. Không
chép đệ quy toàn bộ `users/{uid}`, nếu không sẽ kéo `activities` của logi và `lessons`
của noda sang `cogi-db`.

Tạo `scripts/copy-to-cogi-db.mjs`:

```js
// ---------------------------------------------------------------------------
// cogi - Chép dữ liệu từ (default) sang cogi-db.
// Mặc định chạy khô. Thêm --commit mới ghi thật. Chạy lại nhiều lần được.
//
//   node --env-file=.env.local scripts/copy-to-cogi-db.mjs
//   node --env-file=.env.local scripts/copy-to-cogi-db.mjs --commit
// ---------------------------------------------------------------------------
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const TARGET_DB = "cogi-db";
const COLLECTIONS = [
  "actions", "activeMathSessions", "aiArtifacts", "cachedTopicLists",
  "confidenceRecords", "decisions", "delayedRecallQueue", "exercises",
  "journalEntries", "perspectiveDisagreements", "practicedTopics",
  "settings", "weaknesses", "weeklyReviews",
];
const COMMIT = process.argv.includes("--commit");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
});

const src = getFirestore(app);              // (default)
const dst = getFirestore(app, TARGET_DB);   // cogi-db

let total = 0;

async function copyCollection(fromCol, toCol) {
  const snap = await fromCol.get();
  if (snap.size > 0) console.log(`  ${fromCol.path}: ${snap.size} doc`);
  let batch = dst.batch();
  let n = 0;
  for (const doc of snap.docs) {
    if (COMMIT) {
      batch.set(toCol.doc(doc.id), doc.data());
      n += 1;
      if (n === 400) { await batch.commit(); batch = dst.batch(); n = 0; }
    }
    total += 1;
    // Nếu collection nào có subcollection thì phải chép đệ quy thêm ở đây.
    // Kiểm tra bằng: (await doc.ref.listCollections()).map((c) => c.id)
  }
  if (COMMIT && n > 0) await batch.commit();
}

for (const userRef of await src.collection("users").listDocuments()) {
  console.log(`users/${userRef.id}`);
  const snap = await userRef.get();
  if (snap.exists && COMMIT) {
    await dst.collection("users").doc(userRef.id).set(snap.data(), { merge: true });
  }
  for (const name of COLLECTIONS) {
    await copyCollection(
      userRef.collection(name),
      dst.collection("users").doc(userRef.id).collection(name),
    );
  }
}

console.log(COMMIT ? `Đã ghi ${total} doc.` : `Chạy khô: sẽ ghi ${total} doc.`);
process.exit(0);
```

Lưu ý: doc `users/{uid}` được ghi bằng `merge: true` vì cả ba app có thể cùng đặt
field ở doc đó. Ba app chép sang ba database khác nhau nên thực tế không đụng nhau,
nhưng `merge` an toàn hơn.

Trước khi chạy, kiểm tra xem có collection nào lồng subcollection không:

```js
// chạy tạm trong node, in ra subcollection của vài doc
(await doc.ref.listCollections()).map((c) => c.id)
```

Chạy:

```bash
node --env-file=.env.local scripts/copy-to-cogi-db.mjs           # xem số
node --env-file=.env.local scripts/copy-to-cogi-db.mjs --commit  # ghi thật
node --env-file=.env.local scripts/copy-to-cogi-db.mjs           # chạy lại, so số
```

Số ở lần cuối phải khớp lần đầu.

### Bước 6 - Kiểm tra và deploy

```bash
npx tsc --noEmit && npm run lint && npm run test:unit && npm run build
```

Rồi deploy app (Vercel). Thử lại đúng cái nút đang hỏng: `fetchRecommendation` phải
gọi được API thật. Mở tab Network xem có request đi ra không.

Sau khi mọi thứ chạy, sửa nốt `catch { /* silently fall back */ }` ở
`reasoning/page.tsx:76`: ít nhất phải `console.error`. Lỗi rules mà im lặng là lý do
bug này ngồi im nhiều ngày. Việc này tách riêng, không nằm trong kế hoạch chuyển db.

### Bước 7 - Khoá `(default)` (do logi làm, khi cả ba app đã xong)

logi giữ file `firestore.default.rules` deny-all và deploy. Sau bước đó, bất kỳ chỗ
nào còn trỏ `(default)` sẽ hỏng ngay và thấy rõ. Đó là mục đích.

Xoá dữ liệu cũ trong `(default)` để sau vài tuần.

---

## 3. Lỡ hỏng thì lui thế nào

Chưa tới bước 7 thì `git revert` phần sửa code là xong. Dữ liệu trong `(default)` vẫn
nguyên, không bước nào xoá nó.

---

## 4. Checklist

- [x] Tạo `cogi-db`, đúng region với `(default)`
- [x] `firebase.json`: mảng firestore, bỏ khối storage
- [x] Xoá `storage.rules`
- [x] `firestore.rules`: bỏ `lessons`, `sidebarFolders`
- [x] `firebase deploy --only firestore`, kiểm tra tab Rules của `cogi-db`
- [x] Thêm `firebase-db-id.ts`, sửa 2 file init
- [x] `grep` lại tìm chỗ sót
- [x] Kiểm tra subcollection lồng nhau trước khi chép
- [x] Chạy khô, chép thật, chạy lại đối chiếu
- [x] typecheck / lint / test / build
- [ ] Deploy, thử nút recommendation
- [x] Sửa `catch` im lặng ở `reasoning/page.tsx:76` (việc riêng)
