import { execSync } from "node:child_process";
import { getSlideData } from "./utils/getSlideData";

const { slideDirPath, themeFilePath } = await getSlideData();

const themeOption = themeFilePath ? `--theme ${themeFilePath}` : "";

const command = `marp -o --pdf --allow-local-files ${themeOption} -I ${slideDirPath}`;

try {
  execSync(command, {
    stdio: "inherit",
  });
} catch (error) {
  console.error("Error:", error);
}
