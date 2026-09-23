// Supabase-backed store. Exposes the same shape the pages already use, so
// switching backends does not touch any screen.
import { createClient } from "@supabase/supabase-js";
import { getSettings } from "./settings";

const BUCKET = "momchim-files";
const FILE_PREFIX = "stored-file:";

const TABLES = {
  Persona: "momchim_personas",
  ChatSession: "momchim_chat_sessions",
  Message: "momchim_messages",
  UploadedDocument: "momchim_uploaded_documents",
};

export const ENTITY_NAMES = Object.keys(TABLES);

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseKey } = getSettings();
  return !!(supabaseUrl && supabaseKey);
}

let client;
let clientFor = "";

function db() {
  const { supabaseUrl, supabaseKey } = getSettings();
  if (!supabaseUrl || !supabaseKey) throw new Error("החיבור למאגר לא הוגדר.");
  const signature = supabaseUrl + supabaseKey;
  if (!client || clientFor !== signature) {
    client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    clientFor = signature;
  }
  return client;
}

const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

function fail(error, what) {
  throw new Error(`${what} נכשל: ${error.message}`);
}

/** "-updated_date" means newest first; "created_date" means oldest first. */
function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith("-");
  return query.order(desc ? sort.slice(1) : sort, { ascending: !desc });
}

function makeEntity(name) {
  const table = TABLES[name];
  return {
    async list(sort) {
      const { data, error } = await applySort(db().from(table).select("*"), sort);
      if (error) fail(error, `טעינת ${name}`);
      return data ?? [];
    },
    async filter(query = {}, sort) {
      let q = db().from(table).select("*");
      for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
      const { data, error } = await applySort(q, sort);
      if (error) fail(error, `טעינת ${name}`);
      return data ?? [];
    },
    async get(id) {
      const { data, error } = await db().from(table).select("*").eq("id", id).maybeSingle();
      if (error) fail(error, `טעינת ${name}`);
      return data;
    },
    async create(values) {
      const row = { ...values, id: values.id || newId() };
      const { data, error } = await db().from(table).insert(row).select().single();
      if (error) fail(error, `שמירת ${name}`);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await db().from(table).update(patch).eq("id", id).select().single();
      if (error) fail(error, `עדכון ${name}`);
      return data;
    },
    async delete(id) {
      const { error } = await db().from(table).delete().eq("id", id);
      if (error) fail(error, `מחיקת ${name}`);
    },
  };
}

export const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, makeEntity(n)]));

// ─── Files ──────────────────────────────────────────────────────────────────

export const isStoredFileUrl = (url) => typeof url === "string" && url.startsWith(FILE_PREFIX);

export async function uploadFile(file) {
  const id = newId();
  const { error } = await db().storage.from(BUCKET).upload(id, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) fail(error, "העלאת הקובץ");
  return { file_url: FILE_PREFIX + id };
}

/** Returns { blob, name, type } for a stored file or any plain http(s) URL. */
export async function getFile(url) {
  if (!isStoredFileUrl(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`לא ניתן לטעון את הקובץ (${res.status})`);
    const blob = await res.blob();
    return { blob, name: url.split("/").pop(), type: blob.type };
  }
  const id = url.slice(FILE_PREFIX.length);
  const { data, error } = await db().storage.from(BUCKET).download(id);
  if (error) fail(error, "טעינת הקובץ");
  return { blob: data, name: id, type: data.type };
}

export async function getCounts() {
  const out = [];
  for (const name of ENTITY_NAMES) {
    const { count, error } = await db().from(TABLES[name]).select("*", { count: "exact", head: true });
    if (error) fail(error, "ספירת רשומות");
    out.push([name, count ?? 0]);
  }
  return out;
}

/** Confirms the URL and key actually reach the tables. */
export async function testConnection() {
  const { error } = await db().from(TABLES.Persona).select("id", { count: "exact", head: true });
  if (error) throw error;
}
