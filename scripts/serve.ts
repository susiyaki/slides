import { exec, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import open from "open";
import { selectOption } from "./selectOptions";

const PORT = 8080;
const URL = `http://localhost:${PORT}/`;

const slides = fs.readdirSync(path.join(__dirname, "../slides"));

if (!slides.length) {
  console.error("No slides found");
  process.exit(1);
}

const slideNames = slides.map((slide) => slide.replace(".md", ""));

const selected = await selectOption("Choose a slide to serve:", slideNames);

if (!selected) {
  console.error("Please provide a slide");
  process.exit(1);
}

console.log(`Serving slide: ${selected}`);

const indexFile = path.join(__dirname, "../slides", selected, "index.md");

if (!fs.existsSync(indexFile)) {
  console.error("Slide not found");
  process.exit(1);
}

const indexContent = fs.readFileSync(indexFile, "utf-8");
const themeRegex = new RegExp("theme: (.*)");
const theme = indexContent.match(themeRegex)?.[1];

const themeFile = theme
  ? path.join(__dirname, "../theme", `${theme}.css`)
  : null;

if (themeFile && !fs.existsSync(themeFile)) {
  console.error("Theme not found");
  process.exit(1);
}

console.log(`Using theme: ${theme}`);

const themeOption = theme
  ? `--theme ${path.join(__dirname, "../theme", `${theme}.css`)}`
  : "";

console.log("\nStarting server...");

const command = `marp -s ${themeOption} -I ${path.join(__dirname, "../slides", selected)}`;

try {
  open(URL);
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, PORT: PORT.toString() },
  });
} catch (error) {
  console.error("Error:", error);
}
