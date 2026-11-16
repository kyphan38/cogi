import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { Forecast } from "@/lib/forecasts/logic";

/** One doc in the settings collection, so the Firestore rules need no new collection. */
const FORECASTS_ID = "forecasts";

interface ForecastsRow {
  id: typeof FORECASTS_ID;
  forecasts: Forecast[];
}

export async function getForecasts(): Promise<Forecast[]> {
  if (isE2EAuthBypass()) {
    return (await e2eGetDoc<ForecastsRow>(COGI_COLLECTIONS.settings, FORECASTS_ID))?.forecasts ?? [];
  }
  const snapshot = await getDoc(userDocRef<ForecastsRow>(COGI_COLLECTIONS.settings, FORECASTS_ID));
  return snapshot.exists() ? (snapshot.data().forecasts ?? []) : [];
}

export async function setForecasts(forecasts: Forecast[]): Promise<void> {
  const row = stripUndefinedDeep({ id: FORECASTS_ID, forecasts }) as ForecastsRow;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, FORECASTS_ID, row as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<ForecastsRow>(COGI_COLLECTIONS.settings, FORECASTS_ID), row);
}
