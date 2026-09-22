// Calls Claude directly from the browser with the user's own API key.
import Anthropic from "@anthropic-ai/sdk";
import { getSettings } from "./settings";
import { getFile } from "./store";
import { blobToBase64 } from "./github";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export class MissingApiKeyError extends Error {
  constructor() {
    super("חסר מפתח Claude API. יש להגדיר אותו במסך ההגדרות.");
  }
}

function client() {
  const { anthropicKey } = getSettings();
  if (!anthropicKey) throw new MissingApiKeyError();
  return new Anthropic({ apiKey: anthropicKey, dangerouslyAllowBrowser: true });
}

function isTextLike(name = "", type = "") {
  return /^text\//.test(type) || /\.(txt|md|csv|json)$/i.test(name);
}
function isDocx(name = "", type = "") {
  return /\.docx$/i.test(name) || type.includes("wordprocessingml");
}

async function docxToText(blob) {
  const { default: mammoth } = await import("mammoth/mammoth.browser");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
  return value;
}

/** Turns an uploaded file into a Claude content block, or null if it can't be sent. */
async function fileToBlock(url) {
  const { blob, name, type } = await getFile(url);
  if (IMAGE_TYPES.includes(type)) {
    return { type: "image", source: { type: "base64", media_type: type, data: await blobToBase64(blob) } };
  }
  if (type === "application/pdf" || /\.pdf$/i.test(name || "")) {
    return {
      type: "document",
      title: name,
      source: { type: "base64", media_type: "application/pdf", data: await blobToBase64(blob) },
    };
  }
  if (isTextLike(name, type) || isDocx(name, type)) {
    const text = isDocx(name, type) ? await docxToText(blob) : await blob.text();
    return { type: "document", title: name, source: { type: "text", media_type: "text/plain", data: text } };
  }
  return null;
}

/** Same shape as Base44's InvokeLLM: returns the answer as a string. */
export async function invokeLLM({ prompt, file_urls = [] }) {
  const anthropic = client();
  const blocks = (await Promise.all(file_urls.map(fileToBlock))).filter(Boolean);

  const response = await anthropic.beta.messages.create({
    model: getSettings().model || "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: [...blocks, { type: "text", text: prompt }] }],
  });

  if (response.stop_reason === "refusal") {
    return "_המודל סירב לענות על הבקשה הזו._";
  }
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Same shape as Base44's ExtractDataFromUploadedFile, for text / docx / csv files. */
export async function extractText({ file_url }) {
  try {
    const { blob, name, type } = await getFile(file_url);
    let text = "";
    if (isDocx(name, type)) text = await docxToText(blob);
    else if (isTextLike(name, type)) text = await blob.text();
    return text.trim()
      ? { status: "success", output: { text } }
      : { status: "error", details: "unsupported file type" };
  } catch (e) {
    return { status: "error", details: e.message };
  }
}

export async function testApiKey() {
  const anthropic = client();
  await anthropic.models.retrieve(getSettings().model || "claude-opus-5");
}
