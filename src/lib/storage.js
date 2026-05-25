const STORAGE_KEY = "manualFunds";
const SCHEMA_VERSION = 2;

function migratePortfolio(data) {
  // Legacy: raw array stored without wrapper object
  if (Array.isArray(data)) {
    data = { manualFunds: data };
  }
  // Rename old field names: version -> schemaVersion, funds -> manualFunds
  if (data.version !== undefined && data.schemaVersion === undefined) {
    data = { ...data, schemaVersion: data.version };
    const { version: _, ...rest } = data;
    data = rest;
  }
  if (data.funds !== undefined && data.manualFunds === undefined) {
    data = { ...data, manualFunds: data.funds };
    const { funds: _, ...rest } = data;
    data = rest;
  }
  // v1 (or no version) -> v2: backfill feeUpdatedAt: null where missing
  if (!data.schemaVersion || data.schemaVersion < 2) {
    if (Array.isArray(data.manualFunds)) {
      data.manualFunds = data.manualFunds.map(f =>
        f.feeUpdatedAt !== undefined ? f : { ...f, feeUpdatedAt: null }
      );
    }
    data.schemaVersion = 2;
  }
  return data;
}

export function loadManualFunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const migrated = migratePortfolio(JSON.parse(raw));
    saveManualFunds(migrated.manualFunds ?? []);
    return migrated.manualFunds ?? [];
  } catch {
    return [];
  }
}

export function saveManualFunds(funds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, manualFunds: funds }));
}
