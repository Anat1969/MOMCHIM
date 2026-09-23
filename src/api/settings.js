// User settings live only in this browser (never in the code or the repo).
const KEY = "momchim-settings";

const DEFAULTS = {
  anthropicKey: "",
  // Set once the key has actually answered a call, so the UI can say "connected"
  // on load without spending another round trip.
  keyVerified: false,
  model: "claude-opus-5",
  githubToken: "",
  dataRepo: "Anat1969/MOMCHIM-data",
};

// Settings are held in memory and only mirrored to localStorage. Reading them
// back out of storage would make every caller depend on the write having
// succeeded — and it can fail (quota, private mode, site data blocked), which
// silently left the app acting as though no key had been entered.
let cache = null;
let persistError = null;

function readStored() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getSettings() {
  if (!cache) cache = readStored();
  return { ...cache };
}

export function saveSettings(patch) {
  cache = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
    persistError = null;
  } catch (e) {
    persistError = e;
  }
  window.dispatchEvent(new Event("momchim-settings"));
  return { ...cache };
}

/** Set when the last save could not be written to disk — the settings still
 *  apply for this session, but will be gone once the tab closes. */
export function getPersistError() {
  return persistError;
}
