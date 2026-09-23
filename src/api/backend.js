// Chooses where data lives. When the Supabase connection is configured it is
// the source of truth; otherwise everything stays in this browser (syncing to
// GitHub if that is set up instead).
//
// Kept separate from client.js so llm.js can read files without importing the
// module that imports llm.js.
import * as local from "./store";
import * as cloud from "./supabase";

const backend = () => (cloud.isSupabaseConfigured() ? cloud : local);

export const isCloud = () => cloud.isSupabaseConfigured();

const ENTITY_NAMES = ["Persona", "ChatSession", "Message", "UploadedDocument"];
const METHODS = ["list", "filter", "get", "create", "update", "delete"];

/** Each call re-checks the backend rather than binding at import time, so
 *  connecting Supabase takes effect without a reload. */
export const entities = Object.fromEntries(
  ENTITY_NAMES.map((name) => [
    name,
    Object.fromEntries(METHODS.map((m) => [m, (...args) => backend().entities[name][m](...args)])),
  ])
);

export const uploadFile = (file) => backend().uploadFile(file);
export const getFile = (url) => backend().getFile(url);
export const isStoredFileUrl = (url) => backend().isStoredFileUrl(url);
export const getCounts = () => backend().getCounts();
