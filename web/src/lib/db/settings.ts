import { Unsubscribe, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { DifficultyTierLabel } from "@/lib/adaptive/types";
import { DEFAULT_LANGUAGE_LEVEL, type LanguageLevel } from "@/lib/adaptive/language-level";

export interface AppSettingsRow {
  id: "app";
  userContext: string;
  delayedRecallEnabled?: boolean;
  weeklyReviewLastCompletedCount?: number;
  adaptiveDifficultyEnabled?: boolean;
  /** Nested sub-toggle - only meaningful when `adaptiveDifficultyEnabled` is true. */
  manualDifficultyEnabled?: boolean;
  /** Manual difficulty bar value; overrides the computed accuracy-based tier when `manualDifficultyEnabled` is true. */
  manualDifficultyTier?: DifficultyTierLabel | null;
  /** Manual language-complexity bar value (independent axis from difficulty). */
  languageLevel?: LanguageLevel;
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
  const clean = stripUndefinedDeep(row);
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, SETTINGS_ID, clean as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<AppSettingsRow>(COGI_COLLECTIONS.settings, SETTINGS_ID), clean);
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
    manualDifficultyEnabled: row?.manualDifficultyEnabled === true,
    manualDifficultyTier: row?.manualDifficultyTier ?? null,
    languageLevel: row?.languageLevel ?? DEFAULT_LANGUAGE_LEVEL,
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
    manualDifficultyEnabled: prev?.manualDifficultyEnabled === true,
    manualDifficultyTier: prev?.manualDifficultyTier ?? null,
    languageLevel: prev?.languageLevel ?? DEFAULT_LANGUAGE_LEVEL,
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

export async function setManualDifficultyEnabled(enabled: boolean): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    manualDifficultyEnabled: enabled,
  });
}

export async function setManualDifficultyTier(tier: DifficultyTierLabel): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    manualDifficultyTier: tier,
  });
}

export async function setLanguageLevel(level: LanguageLevel): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    languageLevel: level,
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
        manualDifficultyEnabled: row?.manualDifficultyEnabled === true,
        manualDifficultyTier: row?.manualDifficultyTier ?? null,
        languageLevel: row?.languageLevel ?? DEFAULT_LANGUAGE_LEVEL,
        geopoliticsProgressionEpoch: row?.geopoliticsProgressionEpoch,
      });
    },
    onError,
  );
}
