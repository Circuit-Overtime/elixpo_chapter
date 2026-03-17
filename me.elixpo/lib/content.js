import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "content");

export function getPersonContent(person, file) {
  const filePath = path.join(contentDir, person, `${file}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function getValidPersons() {
  return fs
    .readdirSync(contentDir)
    .filter((entry) =>
      fs.statSync(path.join(contentDir, entry)).isDirectory()
    );
}
