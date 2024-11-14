import fs from "node:fs";
import path from "node:path";
import { THEME_FILE_PATHS } from "../../theme/constants";
import { selectOption } from "./selectOptions";

export const getSlideData = async () => {
  const slides = fs.readdirSync(path.join(__dirname, "../../slides"));

  if (!slides.length) {
    console.error("No slides found");
    process.exit(1);
  }

  const slideNames = slides.map((slide) => slide.replace(".md", ""));

  const slideName = await selectOption("Choose a slide to serve:", slideNames);

  if (!slideName) {
    console.error("Please provide a slide");
    process.exit(1);
  }

  const slideDirPath = path.join(__dirname, "../../slides", slideName);
  const slideFilePath = path.join(slideDirPath, "index.md");

  if (!fs.existsSync(slideFilePath)) {
    console.error("Slide not found");
    process.exit(1);
  }

  const slideContent = fs.readFileSync(slideFilePath, "utf-8");
  const themeRegex = new RegExp("theme: (.*)");
  const themeName = slideContent.match(themeRegex)?.[1];

  const themeFilePath = themeName
    ? THEME_FILE_PATHS?.[themeName as keyof typeof THEME_FILE_PATHS]
    : null;

  if (themeFilePath && !fs.existsSync(themeFilePath)) {
    console.error("Theme not found");
    process.exit(1);
  }

  return {
    slideName,
    slideDirPath,
    slideFilePath,
    slideContent,
    themeName,
    themeFilePath,
  };
};
