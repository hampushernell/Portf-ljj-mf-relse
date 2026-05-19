const STORAGE_KEY = "manualFunds";
const CURRENT_VERSION = 1;

export function loadManualFunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      saveManualFunds(parsed);
      return parsed;
    }
    if (parsed?.version === 1 && Array.isArray(parsed.funds)) {
      return parsed.funds;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveManualFunds(funds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, funds }));
}
