import path from "node:path";

export const THEME_FILE_PATHS = {
  wave: path.join(__dirname, "./wave/source/wave.css"),
  default: path.join(__dirname, "default.css"),
} as const;
