import { readFile } from "node:fs/promises";
import { isNodeError } from "../utils/errors.js";

export async function loadEnv(filePath: string) {
  try {
    const envText = await readFile(filePath, "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match || match[1].startsWith("#")) {
        continue;
      }

      const key = match[1];
      const value = (match[2] || "").replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

export function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return sanitizeEnvValue(value)?.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

export function sanitizeEnvValue(value: string | undefined) {
  return value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "") || undefined;
}
