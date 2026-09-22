// User settings live only in this browser (never in the code or the repo).
const KEY = "momchim-settings";

const DEFAULTS = {
  anthropicKey: "",
  model: "claude-opus-5",
  githubToken: "",
  dataRepo: "Anat1969/MOMCHIM-data",
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("momchim-settings"));
  return next;
}
