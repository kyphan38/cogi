import { Unsubscribe, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";

export interface AppSettingsRow {
  id: "app";
  userContext: string;
  delayedRecallEnabled?: boolean;
  weeklyReviewLastCompletedCount?: number;
  adaptiveDifficultyEnabled?: boolean;
  /** ISO timestamp - geopolitics progression ignores completions before this. */
  geopoliticsProgressionEpoch?: string;
}

const SETTINGS_ID = "app" as const;

async function getRow(): Promise<AppSettingsRow | undefined> {
  if (isE2EAuthBypass()) {
    return e2eGetDoc<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID);
  }
  const snapshot = await getDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID));
  return snapshot.exists() ? (snapshot.data() as AppSettingsRow) : undefined;
}

async function saveRow(row: AppSettingsRow): Promise<void> {
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, SETTINGS_ID, row as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), row);
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
    geopoliticsProgressionEpoch: row?.geopoliticsProgressionEpoch,
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
    geopoliticsProgressionEpoch: prev?.geopoliticsProgressionEpoch,
  };
  await saveRow(row);
}

export async function setGeopoliticsProgressionEpoch(epoch: string): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    geopoliticsProgressionEpoch: epoch,
  });
}

export async function setDelayedRecallEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    delayedRecallEnabled: enabled,
  });
}

export async function setWeeklyReviewLastCompletedCount(count: number): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    weeklyReviewLastCompletedCount: count,
  });
}

export async function setAdaptiveDifficultyEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
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
        geopoliticsProgressionEpoch: row?.geopoliticsProgressionEpoch,
      });
    },
    onError,
  );
}
