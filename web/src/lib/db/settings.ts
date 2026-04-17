import { getDb } from "@/lib/db/schema";
import type { AppSettingsRow } from "@/lib/db/schema";

const SETTINGS_ID = "app" as const;

async function getRow(): Promise<AppSettingsRow | undefined> {
  return getDb().settings.get(SETTINGS_ID);
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
  await getDb().settings.put(row);
}

export async function setDelayedRecallEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await getDb().settings.put({
    ...prev,
    delayedRecallEnabled: enabled,
  });
}

export async function setWeeklyReviewLastCompletedCount(count: number): Promise<void> {
  const prev = await getAppSettings();
  await getDb().settings.put({
    ...prev,
    weeklyReviewLastCompletedCount: count,
  });
}

export async function setAdaptiveDifficultyEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await getDb().settings.put({
    ...prev,
    adaptiveDifficultyEnabled: enabled,
  });
}
