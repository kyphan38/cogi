# cogi → project riêng `kyphan38-cogi-app`

Trạng thái: **chưa làm** (viết 2026-09-02)

Đây là bước tiếp theo của `docs/PLAN-db-split.md`. Lần trước ta tách
**database** (`cogi-db`) nhưng vẫn chung project `kyphan38-apps`. Lần này tách
hẳn **project**.

> Ghi chú: bước 7 của plan cũ ("khoá `(default)` deny-all") **logi đã làm xong**
> ngày 2026-09-01, commit `f6179e7` bên repo logi. Không cần làm lại.

Thứ tự trong 4 app: **làm cogi thứ hai**, sau logi. logi làm mẫu vì đơn giản hơn.

---

## 0. Hiện trạng cogi

| Mục | Giá trị hiện tại |
| --- | --- |
| Project | `kyphan38-apps` (dùng chung) |
| Database | `cogi-db` |
| Dữ liệu | `users/yjzds6g7Y6VjmwtgW4QTnUqaX0F2/` → 8 subcollection có dữ liệu (18 doc) trong tổng 14 collection được phép |
| Auth | Google, allowlist theo **UID và email** |
| Storage | **không dùng** (`storage.rules` đã xoá lần trước) |
| Cloud Functions | **không có** — mọi logic server nằm ở Next.js API routes |
| FCM | không dùng |
| Hosting | Vercel (`web/vercel.json`, `maxDuration: 60` cho `/api/ai/**`) |
| Indexes | 3 composite: `exercises`, `delayedRecallQueue`, `weaknesses` |

Điểm sướng: không Storage, không Cloud Functions. Chỉ có Firestore + Auth.

Điểm phải nhớ: **allowlist dùng UID**. UID đổi thì phải sửa `.env`, nếu không
app sẽ tự đăng xuất bạn ngay sau khi đăng nhập.

---

## 1. Việc trên Console (làm một lần)

1. Tạo project **`kyphan38-cogi-app`**, display name để giống ID. Tắt Analytics.
2. Authentication → Sign-in method → bật **Google**.
3. Firestore Database → Create database:
   - Database ID giữ nguyên **`(default)`**
   - Location **`asia-southeast1`** — **chọn xong không đổi được**
   - **Production mode**
4. Project settings → Your apps → Add app → **Web**, tên `cogi`. Chép 6 giá trị config.
5. Project settings → Service accounts → **Generate new private key** → file JSON.

**Không cần** Blaze: cogi không có Cloud Functions, không có Storage. Spark là đủ.
(Nếu Console vẫn đòi Blaze khi tạo Firestore thì cứ nâng, dùng ít không mất tiền.)

---

## 2. Backup

```bash
cd /Users/kyphan/ws/app/cogi      # git root là cogi/, không phải web/
git status --short                 # phải sạch
cp web/.env.local /tmp/cogi.env.bak
```

Dữ liệu cũ trong `kyphan38-apps/cogi-db` **không xoá** — đó là backup.

---

## 3. Đổi `web/.env.local`

Tên biến giữ nguyên, chỉ đổi giá trị:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...              (mới)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kyphan38-cogi-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kyphan38-cogi-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kyphan38-cogi-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...  (mới)
NEXT_PUBLIC_FIREBASE_APP_ID=...               (mới)

FIREBASE_ADMIN_PROJECT_ID=kyphan38-cogi-app
FIREBASE_ADMIN_CLIENT_EMAIL=...   (file JSON mới)
FIREBASE_ADMIN_PRIVATE_KEY="..."  (file JSON mới)

NEXT_PUBLIC_ALLOWED_USER_UID=<UID_MỚI>        ← đổi ở bước 6, chưa biết lúc này
```

Giữ nguyên: `NEXT_PUBLIC_ALLOWED_EMAIL`, `ALLOWED_USER_EMAIL`, `GEMINI_*`.

**Mẹo tránh vòng lặp gà-và-trứng:** ở bước 6 bạn cần đăng nhập được vào project
mới để lấy UID, nhưng `NEXT_PUBLIC_ALLOWED_USER_UID` lúc đó vẫn là UID cũ. Cách
đơn giản nhất: **tạm xoá dòng đó đi**, vì `allowed-user.ts` cho qua khi khớp
**email** (chỉ cần một trong hai khớp). Lấy được UID mới rồi thì điền lại.

`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` giữ lại cho `initializeApp` khỏi thiếu
trường, dù cogi không gọi Storage SDK.

---

## 4. Sửa code

Ít việc, vì cogi không có functions.

| File | Sửa gì |
| --- | --- |
| `web/.firebaserc` | `"default": "kyphan38-apps"` → `"kyphan38-cogi-app"` |
| `web/src/lib/firebase-db-id.ts:3` | `DB_ID = "cogi-db"` → `"(default)"`, viết lại comment |
| `web/firebase.json` | `firestore` từ **mảng** về **object** |
| `web/scripts/copy-to-cogi-db.mjs` | thay bằng script mới ở bước 6 |
| `web/.env.example` | cập nhật comment nếu có nhắc `kyphan38-apps` |
| `web/README.md` | sửa chỗ nói `cogi-db` / dùng chung project |

`firebase.json` sau khi sửa:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

`firebase-client.ts` và `firebaseAdminFirestore.ts` **không cần sửa** — chúng gọi
`getFirestore(app, DB_ID)` / `initializeFirestore(app, {...}, DB_ID)`, và
`'(default)'` cho ra đúng cùng một thứ với việc bỏ tham số. Giữ
`firebase-db-id.ts` lại làm một chỗ duy nhất để đổi.

---

## 5. Deploy rules + indexes

```bash
cd web
npx firebase use kyphan38-cogi-app
npx firebase deploy --only firestore
```

Luôn `--only firestore`. **Đừng** dùng `--only firestore:rules` (bug
firebase-tools #10447: với cấu hình mảng nó im lặng không làm gì; giờ ta về
object rồi nhưng cứ giữ thói quen an toàn).

Kiểm tra Console → Firestore → Rules: phải thấy `isAllowedCollection` với đủ 14
tên. Tab Indexes: 3 index đang **Building**, chờ xanh hết mới sang bước sau.

---

## 6. Chuyển dữ liệu (đổi cả project lẫn UID)

### 6a. Lấy UID mới

Tạm bỏ dòng `NEXT_PUBLIC_ALLOWED_USER_UID` trong `.env.local` (xem mẹo ở bước 3).

```bash
npm run dev
```

Đăng nhập `kyphan.work@gmail.com`. App sẽ trống — đúng.
Lấy UID: Console → Authentication → Users → cột User UID.

Điền lại `NEXT_PUBLIC_ALLOWED_USER_UID=<UID mới>` vào `.env.local`.

### 6b. Script copy

Viết `web/scripts/copy-to-new-project.mjs`, lấy `copy-to-cogi-db.mjs` làm khung.
Khác hai chỗ: **hai service account** (cũ + mới) và **đổi UID**.

```bash
node --env-file=web/.env.local web/scripts/copy-to-new-project.mjs \
  --from-uid yjzds6g7Y6VjmwtgW4QTnUqaX0F2 --to-uid <UID_MỚI>          # dry-run
node --env-file=web/.env.local web/scripts/copy-to-new-project.mjs \
  --from-uid ... --to-uid ... --commit                                 # ghi thật
```

Yêu cầu:
- **Mặc định dry-run**, chỉ `--commit` mới ghi.
- Nguồn: `kyphan38-apps` / `cogi-db` bằng service account **cũ**
  (đọc từ `/tmp/cogi.env.bak`, hoặc đặt biến `OLD_FIREBASE_ADMIN_*`).
- Đích: `kyphan38-cogi-app` / `(default)` bằng `FIREBASE_ADMIN_*` mới.
- Chỉ chép 14 collection trong `COGI_COLLECTIONS`. Đừng chép mù cả `users/{uid}` —
  doc gốc từng dùng chung với logi/noda.
- Batch 400.
- In số doc từng collection ở cả dry-run lẫn sau khi commit.

### 6c. Đối chiếu

Chạy lại dry-run sau khi commit. Tổng phải là **18 doc** (số đếm ngày 2026-09-02):
8 collection có dữ liệu, 6 collection rỗng.

---

## 7. Vercel

Đây là bước dễ quên nhất, vì `.env.local` không tự đẩy lên Vercel.

- Vercel → project cogi → Settings → Environment Variables.
- Cập nhật 9 biến Firebase + `NEXT_PUBLIC_ALLOWED_USER_UID`, cho **cả 3 môi trường**
  Production / Preview / Development.
- Redeploy, **bỏ tick** "use existing build cache".
- Firebase Console mới → Authentication → Settings → **Authorized domains** →
  thêm domain Vercel. Quên là đăng nhập trên web hỏng ngay.

---

## 8. Kiểm tra

```bash
cd web
npx tsc --noEmit
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Test không đụng Firebase thật (unit dùng `vi.mock`, e2e dùng
`__E2E_AUTH_BYPASS__` + Firestore in-memory), nên chúng sẽ xanh **kể cả khi cấu
hình Firebase sai**. Đừng coi test xanh là bằng chứng migrate thành công.

Bằng chứng thật là kiểm tra tay:
- [ ] Đăng nhập Google được, **không bị đá ra** (chứng tỏ UID allowlist đúng)
- [ ] Journal: thấy các bài cũ
- [ ] Exercises: thấy lịch sử cũ
- [ ] Weekly review: mở được
- [ ] Bấm một nút gọi `/api/ai/*` → có phản hồi (chứng tỏ Admin SDK đúng project)
- [ ] Weaknesses: danh sách hiện đúng (chứng tỏ composite index đã xong)

`npm run gate:phase0` cần `GATE_ID_TOKEN` mới — lấy lại token từ project mới nếu muốn chạy.

---

## 9. Dọn dẹp (sau 30 ngày chạy ổn)

- [ ] Xoá `web/scripts/copy-to-cogi-db.mjs` và `copy-to-new-project.mjs`
- [ ] Trong `kyphan38-apps`: xoá database `cogi-db`
- [ ] Xoá `/tmp/cogi.env.bak` (có private key)
- [ ] Xoá file JSON service account đã tải

**Không** xoá project `kyphan38-apps` cho tới khi cả logi và noda cũng xong.

---

## 10. Checklist

- [ ] 1. Console: tạo project, bật Auth, tạo Firestore, web app, service account
- [ ] 2. Backup `.env.local`
- [ ] 3. Đổi `.env.local` (tạm bỏ ALLOWED_USER_UID)
- [ ] 4. Sửa code (4 file + docs)
- [ ] 5. `firebase deploy --only firestore`, chờ index xanh
- [ ] 6. Đăng nhập lấy UID mới → điền lại `.env` → chạy script copy → đối chiếu 18 doc
- [ ] 7. Cập nhật env + authorized domains trên Vercel, redeploy
- [ ] 8. typecheck / lint / test / build + kiểm tra tay
- [ ] 9. Commit (commit thôi, **không push** trừ khi được yêu cầu)
- [ ] 10. Dọn dẹp (sau 30 ngày)
