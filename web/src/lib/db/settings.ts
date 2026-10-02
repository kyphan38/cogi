import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import { DEFAULT_LANGUAGE_LEVEL, type LanguageLevel } from "@/lib/adaptive/language-level";
import {
  DEFAULT_PRACTICE_LEVEL,
  isPracticeLevel,
  type LevelledExerciseType,
  type PracticeLevel,
} from "@/lib/exercise/levels";

export interface AppSettingsRow {
  id: "app";
  userContext: string;
  /** Language-complexity bar for generated exercises and feedback. */
  languageLevel?: LanguageLevel;
  /** Practice level per exercise type, chosen by the user. */
  practiceLevels?: Partial<Record<LevelledExerciseType, PracticeLevel>>;
  /** When the user last said "Not now" to a level suggestion, per type (ISO time). */
  levelSuggestionDismissedAt?: Partial<Record<LevelledExerciseType, string>>;
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

/** Settings with defaults filled in for missing fields. */
export async function getAppSettings(): Promise<AppSettingsRow> {
  const row = await getRow();
  return {
    id: SETTINGS_ID,
    userContext: row?.userContext ?? "",
    languageLevel: row?.languageLevel ?? DEFAULT_LANGUAGE_LEVEL,
    practiceLevels: row?.practiceLevels ?? {},
    levelSuggestionDismissedAt: row?.levelSuggestionDismissedAt ?? {},
  };
}

export async function getUserContext(): Promise<string> {
  const row = await getRow();
  return row?.userContext ?? "";
}

export async function setUserContext(userContext: string): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({ ...prev, userContext });
}

export async function setLanguageLevel(level: LanguageLevel): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({ ...prev, languageLevel: level });
}

/** Read for every AI request, so generated text matches the chosen level. */
export async function getLanguageLevelForRequest(): Promise<LanguageLevel> {
  const s = await getAppSettings();
  return s.languageLevel ?? DEFAULT_LANGUAGE_LEVEL;
}

export async function getPracticeLevel(type: LevelledExerciseType): Promise<PracticeLevel> {
  const s = await getAppSettings();
  const level = s.practiceLevels?.[type];
  return isPracticeLevel(level) ? level : DEFAULT_PRACTICE_LEVEL;
}

export async function setPracticeLevel(type: LevelledExerciseType, level: PracticeLevel): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({ ...prev, practiceLevels: { ...prev.practiceLevels, [type]: level } });
}

/** "Not now" on a level suggestion: wait for a fresh streak after this moment. */
export async function dismissLevelSuggestion(type: LevelledExerciseType): Promise<void> {
  const prev = await getAppSettings();
  await saveRow({
    ...prev,
    levelSuggestionDismissedAt: { ...prev.levelSuggestionDismissedAt, [type]: new Date().toISOString() },
  });
}
