// Tiny GitHub Contents API client used to back up the app data into a private repo.
import { getSettings } from "./settings";

export function isGithubConfigured() {
  const { githubToken, dataRepo } = getSettings();
  return !!(githubToken && dataRepo);
}

function contentsUrl(path) {
  const { dataRepo } = getSettings();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${dataRepo}/contents/${encoded}`;
}

function headers(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${getSettings().githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fail(res) {
  let detail = "";
  try { detail = (await res.json()).message; } catch {}
  const err = new Error(`GitHub ${res.status}: ${detail || res.statusText}`);
  err.status = res.status;
  return err;
}

/** Returns the file's sha, or null when it doesn't exist. */
export async function getSha(path) {
  const res = await fetch(contentsUrl(path), { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw await fail(res);
  return (await res.json()).sha;
}

/** Returns the raw file as a Blob, or null when it doesn't exist. */
export async function getRaw(path) {
  const res = await fetch(contentsUrl(path), {
    headers: headers("application/vnd.github.raw+json"),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw await fail(res);
  return res.blob();
}

export async function putFile(path, base64, sha, message) {
  const res = await fetch(contentsUrl(path), {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw await fail(res);
  return (await res.json()).content.sha;
}

export async function checkAccess() {
  const { dataRepo } = getSettings();
  const res = await fetch(`https://api.github.com/repos/${dataRepo}`, { headers: headers() });
  if (!res.ok) throw await fail(res);
  const repo = await res.json();
  if (!repo.permissions?.push) throw new Error("לטוקן אין הרשאת כתיבה למאגר");
  return repo;
}

export async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
