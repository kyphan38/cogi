import "server-only";

import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

let firestoreSingleton: Firestore | null = null;

export function getFirebaseAdminFirestore(): Firestore {
  if (firestoreSingleton) return firestoreSingleton;
  firestoreSingleton = getFirestore(getFirebaseAdminApp());
  return firestoreSingleton;
}

export function getUserCollectionPath(uid: string, collectionName: string): string {
  return `users/${uid}/${collectionName}`;
}

export function getUserDocPath(uid: string, collectionName: string, docId: string): string {
  return `${getUserCollectionPath(uid, collectionName)}/${docId}`;
}
