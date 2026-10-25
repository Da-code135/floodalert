import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const titles = [
  "File:Kampala Flooding.jpg",
  "File:Flooded road Uganda.jpg",
  "File:Flooding in Bwaise but still couldn’t stop transportation-Africa on the move 01.jpg",
  "File:Flooding in Bwaise but still couldn’t stop transportation-Africa on the move 03.jpg",
  "File:Moment of a life saver at the right time.jpg",
  "File:The strong and brave ones will always try to pass through.jpg",
];

const api = new URL("https://commons.wikimedia.org/w/api.php");
api.search = new URLSearchParams({
  action: "query",
  titles: titles.join("|"),
  prop: "imageinfo",
  iiprop: "url|extmetadata|size",
  iiurlwidth: "1200",
  format: "json",
}).toString();

const response = await fetch(api);
if (!response.ok) throw new Error(`Commons API failed: ${response.status}`);
const data = await response.json();

const outDir = path.join(process.cwd(), "public", "demo");
await mkdir(outDir, { recursive: true });

const rows = [];
let index = 0;
for (const page of Object.values(data.query.pages)) {
  if (!page.imageinfo?.[0]) continue;
  index += 1;
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const slug = `flood-${index}`;
  const file = `${slug}.jpg`;
  const image = await fetch(info.thumburl, {
    headers: { "User-Agent": "FloodAlertHackathonDemo/1.0" },
  });
  if (!image.ok) throw new Error(`Image fetch failed: ${page.title}`);
  const bytes = Buffer.from(await image.arrayBuffer());
  await writeFile(path.join(outDir, file), bytes);
  rows.push({
    file,
    title: page.title.replace(/^File:/, ""),
    artist: (meta.Artist?.value ?? "Unknown").replace(/<[^>]+>/g, "").trim(),
    license: meta.LicenseShortName?.value ?? "See source",
    licenseUrl: meta.LicenseUrl?.value ?? "",
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  });
  console.log(`${file} <- ${page.title} (${Math.round(bytes.length / 1024)} KB)`);
}

const md = [
  "# Demo photo credits",
  "",
  "These photographs are used only in the FloodAlert hackathon demo. They are not",
  "evidence of specific reports shown in the seeded interface.",
  "",
  ...rows.flatMap((row) => [
    `## ${row.file}`,
    "",
    `- **Title:** ${row.title}`,
    `- **Credit:** ${row.artist}`,
    `- **License:** ${row.license}${row.licenseUrl ? ` (${row.licenseUrl})` : ""}`,
    `- **Source:** ${row.source}`,
    "",
  ]),
].join("\n");

await writeFile(path.join(outDir, "ATTRIBUTION.md"), md);
console.log(`\nWrote ${rows.length} images and ATTRIBUTION.md`);
