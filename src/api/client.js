// Single entry point the pages talk to, mirroring the old Base44 client shape.
import { entities, uploadFile } from "./backend";
import { invokeLLM, extractText } from "./llm";

export { entities, getFile, isStoredFileUrl, getCounts, isCloud } from "./backend";

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
