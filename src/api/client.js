// Drop-in replacement for the old Base44 client: same `entities` / `integrations.Core`
// call shapes, but backed by the browser + GitHub + the Claude API.
import { entities, uploadFile } from "./store";
import { invokeLLM, extractText } from "./llm";

export const api = {
  entities,
  integrations: {
    Core: {
      InvokeLLM: invokeLLM,
      UploadFile: ({ file }) => uploadFile(file),
      ExtractDataFromUploadedFile: extractText,
    },
  },
};
