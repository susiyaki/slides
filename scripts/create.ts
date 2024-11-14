import fs from "node:fs";
import path from "node:path";

const [name] = process.argv.slice(2);

if (!name) {
  console.error("Please provide a name");
  process.exit(1);
}

const dir = path.join(__dirname, "../slides", name);

if (fs.existsSync(dir)) {
  console.error("Directory already exists");
  process.exit(1);
}

fs.mkdirSync(dir);

const TEMPLATE = `---
marp: true
title: ${name}
theme: uncover
paginate: true
---

# ${name}
`;

fs.writeFileSync(path.join(dir, "index.md"), TEMPLATE);

process.chdir(dir);

console.log("Done!");
