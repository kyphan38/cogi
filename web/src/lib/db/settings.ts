import { Unsubscribe, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";

export interface AppSettingsRow {
  id: "app";
  userContext: string;
  delayedRecallEnabled?: boolean;
  weeklyReviewLastCompletedCount?: number;
  adaptiveDifficultyEnabled?: boolean;
}

const SETTINGS_ID = "app" as const;

async function getRow(): Promise<AppSettingsRow | undefined> {
  const snapshot = await getDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID));
  return snapshot.exists() ? (snapshot.data() as AppSettingsRow) : undefined;
}

/** Defaults when fields missing (Dexie v1 rows). */
export async function getAppSettings(): Promise<AppSettingsRow> {
  const row = await getRow();
  return {
    id: SETTINGS_ID,
    userContext: row?.userContext ?? "",
    delayedRecallEnabled: row?.delayedRecallEnabled !== false,
    weeklyReviewLastCompletedCount: row?.weeklyReviewLastCompletedCount,
    adaptiveDifficultyEnabled: row?.adaptiveDifficultyEnabled === true,
  };
}

export async function getUserContext(): Promise<string> {
  const row = await getRow();
  return row?.userContext ?? "";
}

export async function setUserContext(userContext: string): Promise<void> {
  const prev = await getRow();
  const row: AppSettingsRow = {
    id: SETTINGS_ID,
    userContext,
    delayedRecallEnabled: prev?.delayedRecallEnabled !== false,
    weeklyReviewLastCompletedCount: prev?.weeklyReviewLastCompletedCount,
    adaptiveDifficultyEnabled: prev?.adaptiveDifficultyEnabled === true,
  };
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), row);
}

export async function setDelayedRecallEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), {
    ...prev,
    delayedRecallEnabled: enabled,
  });
}

export async function setWeeklyReviewLastCompletedCount(count: number): Promise<void> {
  const prev = await getAppSettings();
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), {
    ...prev,
    weeklyReviewLastCompletedCount: count,
  });
}

export async function setAdaptiveDifficultyEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), {
    ...prev,
    adaptiveDifficultyEnabled: enabled,
  });
}

export function subscribeAppSettings(
  onData: (settings: AppSettingsRow) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<AppSettingsRow>(
    COGI_COLLECTIONS.settings,
    (rows) => {
      const row = rows.find((item) => item.id === SETTINGS_ID);
      onData({
        id: SETTINGS_ID,
        userContext: row?.userContext ?? "",
        delayedRecallEnabled: row?.delayedRecallEnabled !== false,
        weeklyReviewLastCompletedCount: row?.weeklyReviewLastCompletedCount,
        adaptiveDifficultyEnabled: row?.adaptiveDifficultyEnabled === true,
      });
    },
    onError,
  );
}
