// Local-first data store. Everything is kept in this browser's IndexedDB and,
// when a GitHub token is configured, mirrored to a private GitHub repo:
//   data/db.json   – all entities
//   files/<id>     – uploaded files
import { idbGet, idbSet, idbClear } from "./idb";
import { isGithubConfigured, getRaw, getSha, putFile, blobToBase64 } from "./github";

export const ENTITY_NAMES = ["Persona", "ChatSession", "Message", "UploadedDocument"];
const DB_PATH = "data/db.json";
const FILE_PREFIX = "stored-file:";

const emptyState = () => ({
  version: 1,
  updated_at: "",
  entities: Object.fromEntries(ENTITY_NAMES.map((n) => [n, []])),
  files: {}, // id -> { name, type, size, synced }
});

let state;
let loadPromise;

function normalize(s) {
  const base = emptyState();
  return {
    ...base,
    ...s,
    entities: { ...base.entities, ...(s?.entities || {}) },
    files: { ...(s?.files || {}) },
  };
}

function ready() {
  if (!loadPromise) {
    loadPromise = idbGet("kv", "state").then((s) => { state = normalize(s); });
  }
  return loadPromise;
}

// ─── Change + sync status notifications ─────────────────────────────────────

const dataListeners = new Set();
export const onDataChange = (fn) => { dataListeners.add(fn); return () => dataListeners.delete(fn); };
const notifyData = () => dataListeners.forEach((fn) => fn());

let syncStatus = { state: "off", message: "" };
const statusListeners = new Set();
export const getSyncStatus = () => syncStatus;
export const onSyncStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };
function setStatus(s, message = "") {
  syncStatus = { state: s, message };
  statusListeners.forEach((fn) => fn(syncStatus));
}

async function commit() {
  state.updated_at = new Date().toISOString();
  await idbSet("kv", "state", state);
  schedulePush();
}

// ─── Entities (same call shapes the pages already use) ──────────────────────

const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const av = a[field] ?? "";
    const bv = b[field] ?? "";
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (desc ? -1 : 1);
  });
}

function makeEntity(name) {
  return {
    async list(sort) {
      await ready();
      return sortRecords(state.entities[name], sort);
    },
    async filter(query = {}, sort) {
      await ready();
      const rows = state.entities[name].filter((r) =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
      return sortRecords(rows, sort);
    },
    async get(id) {
      await ready();
      return state.entities[name].find((r) => r.id === id) || null;
    },
    async create(data) {
      await ready();
      const now = new Date().toISOString();
      const record = { ...data, id: newId(), created_date: now, updated_date: now };
      state.entities[name].push(record);
      await commit();
      return record;
    },
    async update(id, patch) {
      await ready();
      const list = state.entities[name];
      const i = list.findIndex((r) => r.id === id);
      if (i === -1) throw new Error(`${name} ${id} not found`);
      list[i] = { ...list[i], ...patch, id, updated_date: new Date().toISOString() };
      await commit();
      return list[i];
    },
    async delete(id) {
      await ready();
      state.entities[name] = state.entities[name].filter((r) => r.id !== id);
      await commit();
    },
  };
}

export const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, makeEntity(n)]));

// ─── Files ──────────────────────────────────────────────────────────────────

export const isStoredFileUrl = (url) => typeof url === "string" && url.startsWith(FILE_PREFIX);

export async function uploadFile(file) {
  await ready();
  const id = newId();
  const meta = { name: file.name, type: file.type || "application/octet-stream", size: file.size, synced: false };
  await idbSet("files", id, new Blob([file], { type: meta.type }));
  state.files[id] = meta;
  await commit();
  pushFile(id);
  return { file_url: FILE_PREFIX + id };
}

/** Returns { blob, name, type } for a stored-file: URL or any http(s) URL. */
export async function getFile(url) {
  await ready();
  if (!isStoredFileUrl(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`לא ניתן לטעון את הקובץ (${res.status})`);
    const blob = await res.blob();
    return { blob, name: url.split("/").pop(), type: blob.type };
  }
  const id = url.slice(FILE_PREFIX.length);
  const meta = state.files[id] || {};
  let blob = await idbGet("files", id);
  if (!blob && isGithubConfigured()) {
    const raw = await getRaw(`files/${id}`);
    if (raw) {
      blob = new Blob([raw], { type: meta.type || raw.type });
      await idbSet("files", id, blob);
    }
  }
  if (!blob) throw new Error("הקובץ לא נמצא");
  return { blob, name: meta.name, type: meta.type || blob.type };
}

async function pushFile(id) {
  if (!isGithubConfigured()) return;
  try {
    const blob = await idbGet("files", id);
    if (!blob) return;
    await putFile(`files/${id}`, await blobToBase64(blob), await getSha(`files/${id}`), `קובץ: ${state.files[id]?.name || id}`);
    state.files[id] = { ...state.files[id], synced: true };
    await commit();
  } catch (e) {
    setStatus("error", e.message);
  }
}

// ─── GitHub sync ────────────────────────────────────────────────────────────

let dbSha = null;
let pushTimer;
let pushing = false;
let pushAgain = false;

function schedulePush() {
  if (!isGithubConfigured()) return;
  clearTimeout(pushTimer);
  setStatus("pending");
  pushTimer = setTimeout(pushNow, 2000);
}

async function pushNow() {
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  setStatus("syncing");
  try {
    const content = await blobToBase64(new Blob([JSON.stringify(state)], { type: "application/json" }));
    try {
      dbSha = await putFile(DB_PATH, content, dbSha ?? (await getSha(DB_PATH)), "עדכון נתונים");
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      dbSha = await putFile(DB_PATH, content, await getSha(DB_PATH), "עדכון נתונים");
    }
    setStatus("synced");
  } catch (e) {
    setStatus("error", e.message);
  } finally {
    pushing = false;
    if (pushAgain) { pushAgain = false; pushNow(); }
  }
}

/** Merge two states record-by-record, keeping the newest version of each record. */
function mergeStates(a, b) {
  const out = normalize(a);
  for (const name of ENTITY_NAMES) {
    const byId = new Map(out.entities[name].map((r) => [r.id, r]));
    for (const r of b.entities?.[name] || []) {
      const cur = byId.get(r.id);
      if (!cur || (r.updated_date || "") > (cur.updated_date || "")) byId.set(r.id, r);
    }
    out.entities[name] = [...byId.values()];
  }
  for (const [id, meta] of Object.entries(b.files || {})) {
    out.files[id] = { ...meta, ...(out.files[id] || {}), synced: !!(meta.synced || out.files[id]?.synced) };
  }
  return out;
}

const entitiesJson = (s) => JSON.stringify(ENTITY_NAMES.map((n) => sortRecords(s.entities[n], "id")));

/** Pull the GitHub copy, merge it with local data, and push back whatever GitHub is missing. */
export async function syncWithGithub() {
  await ready();
  if (!isGithubConfigured()) { setStatus("off"); return; }
  setStatus("syncing");
  try {
    const raw = await getRaw(DB_PATH);
    dbSha = raw ? await getSha(DB_PATH) : null;
    const remote = raw ? normalize(JSON.parse(await raw.text())) : emptyState();
    const merged = mergeStates(state, remote);
    const changedLocally = entitiesJson(merged) !== entitiesJson(state);
    const remoteBehind = !raw || entitiesJson(merged) !== entitiesJson(remote);
    state = merged;
    if (changedLocally) {
      state.updated_at = new Date().toISOString();
      await idbSet("kv", "state", state);
      notifyData();
    }
    for (const [id, meta] of Object.entries(state.files)) {
      if (!meta.synced && (await idbGet("files", id))) await pushFile(id);
    }
    if (remoteBehind) await pushNow();
    else setStatus("synced");
  } catch (e) {
    setStatus("error", e.message);
  }
}

/** How many records are held right now, as [entity, count] pairs. */
export async function getCounts() {
  await ready();
  return ENTITY_NAMES.map((n) => [n, state.entities[n].length]);
}

/** Wipes everything held in this browser, then re-pulls the GitHub copy.
 *  Use when the local copy has drifted — nothing is deleted on GitHub. */
export async function resetLocalData() {
  await ready();
  state = emptyState();
  dbSha = null;
  await idbSet("kv", "state", state);
  await idbClear("files");
  notifyData();
  await syncWithGithub();
  return ENTITY_NAMES.map((n) => [n, state.entities[n].length]);
}

// ─── Backup / import ────────────────────────────────────────────────────────

export async function exportBackup() {
  await ready();
  return JSON.stringify(state, null, 2);
}

async function mergeIn(incoming) {
  await ready();
  state = mergeStates(state, incoming);
  await commit();
  notifyData();
}

/** Accepts a backup file from this app, or `{ Persona: [...], Message: [...] }`. */
export async function importJson(text) {
  const data = JSON.parse(text);
  const incoming = data.entities ? normalize(data) : normalize({ entities: data });
  await mergeIn(incoming);
  return ENTITY_NAMES.map((n) => [n, incoming.entities[n].length]).filter(([, c]) => c);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

function guessEntity(headers, fileName) {
  const byName = ENTITY_NAMES.find((n) => fileName.toLowerCase().includes(n.toLowerCase()));
  if (byName) return byName;
  if (headers.includes("file_url")) return "UploadedDocument";
  if (headers.includes("role") && headers.includes("content")) return "Message";
  if (headers.includes("persona_id")) return "ChatSession";
  if (headers.includes("domain") || headers.includes("tone")) return "Persona";
  return null;
}

/** Imports a CSV exported from the Base44 data table (one entity per file). */
export async function importCsv(text, fileName) {
  const [headers, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const name = guessEntity(headers, fileName);
  if (!name) throw new Error(`לא זוהה סוג הנתונים בקובץ ${fileName}`);
  const now = new Date().toISOString();
  const records = rows.map((cells) => {
    const r = {};
    headers.forEach((h, i) => {
      let v = cells[i] ?? "";
      if (v === "") return;
      if (h === "is_active") v = v === "true" || v === "TRUE";
      else if (h === "file_size") v = Number(v);
      r[h] = v;
    });
    r.id ||= newId();
    r.created_date ||= now;
    r.updated_date ||= r.created_date;
    return r;
  });
  const incoming = emptyState();
  incoming.entities[name] = records;
  await mergeIn(incoming);
  return [[name, records.length]];
}
