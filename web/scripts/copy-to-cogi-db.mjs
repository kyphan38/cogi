// ---------------------------------------------------------------------------
// cogi - Chép dữ liệu từ (default) sang cogi-db.
// Mặc định chạy khô. Thêm --commit mới ghi thật. Chạy lại nhiều lần được.
//
//   node --env-file=.env.local scripts/copy-to-cogi-db.mjs
//   node --env-file=.env.local scripts/copy-to-cogi-db.mjs --commit
//
// Xem docs/PLAN-db-split.md.
// ---------------------------------------------------------------------------
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const TARGET_DB = "cogi-db";
// Chỉ 14 collection của cogi. (default) còn chứa activities/weekTargets/meta của
// logi và lessons của noda dưới cùng UID - tuyệt đối không chép sang.
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
    // Đã kiểm tra 2026-09-01: không collection nào có subcollection lồng bên trong.
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
