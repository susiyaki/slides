import { execSync } from "node:child_process";
import open from "open";
import { getSlideData } from "./utils/getSlideData";

const PORT = 8080;
const URL = `http://localhost:${PORT}/`;

const { slideName, slideDirPath, themeName, themeFilePath } =
  await getSlideData();

console.log(`Serving slide: ${slideName}`);
console.log(`Using theme: ${themeName}`);

const themeOption = themeFilePath ? `--theme ${themeFilePath}` : "";

console.log("\nStarting server...");

const command = `marp -s ${themeOption} -I ${slideDirPath}`;

try {
  open(URL);
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, PORT: PORT.toString() },
  });
} catch (error) {
  console.error("Error:", error);
}
