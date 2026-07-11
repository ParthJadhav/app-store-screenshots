import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/lib/starter-project.json");
const target = path.join(root, "app-store-screenshots.json");

JSON.parse(await readFile(source, "utf8"));
await copyFile(source, target);
console.log("Synced app-store-screenshots.json from src/lib/starter-project.json");
