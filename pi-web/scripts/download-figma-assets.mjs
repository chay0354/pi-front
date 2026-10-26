/**
 * Downloads the static Figma assets for the feed screen (node 336:32843) into
 * src/assets/figma/feed. Figma asset URLs expire after 7 days — re-run
 * get_design_context and update the prefixes below if a download fails.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'figma', 'feed');

const base = 'https://www.figma.com/api/mcp/asset';
const card = `${base}/b5fdbb1c-0941-47df-9ec2-a504fabf9aa2`;
const arrows = `${base}/0b5d7585-f0fc-450b-a482-c7e84d7a753e`;
const left = `${base}/9341a530-e06c-4219-92aa-ca92ce8dcb8d`;
const right = `${base}/3b42b7bc-0493-46f9-a55c-67d96c620be3`;

const assets = {
  'icon-rooms.svg': `${card}/5fbe3.svg`,
  'icon-stairs.svg': `${card}/aa999.svg`,
  'icon-location.svg': `${card}/5ce64.svg`,
  'icon-favorite.svg': `${card}/959c8.svg`,
  'icon-dots.svg': `${card}/ec704.svg`,
  'profile-ring.svg': `${card}/cf450.svg`,
  'pager.svg': `${card}/025cc.svg`,
  'pichat-bubble.svg': `${card}/6d383.svg`,
  'pichat-plane.svg': `${card}/248c9.svg`,
  'pichat-pi.svg': `${card}/30061.svg`,

  'arrow-up.svg': `${arrows}/a8713.svg`,
  'arrow-down.svg': `${arrows}/3a518.svg`,

  'post-plus.svg': `${left}/aecc3.svg`,
  'checkbox-checked.svg': `${left}/96fee.svg`,
  'nav-feed-selected.svg': `${left}/a84d1.svg`,
  'nav-grid.svg': `${left}/31d84.svg`,
  'nav-video.svg': `${left}/5f4fb.svg`,
  'nav-liked.svg': `${left}/3ae57.svg`,
  'icon-search-small.svg': `${left}/abc31.svg`,
  'filter-city.svg': `${left}/fa8dd.svg`,
  'filter-home.svg': `${left}/754ce.svg`,
  'filter-rooms.svg': `${left}/78d35.svg`,
  'filter-price.svg': `${left}/df20a.svg`,

  'cat-private.svg': `${right}/63636.svg`,
  'cat-broker.svg': `${right}/4d9c7.svg`,
  'cat-renderings.svg': `${right}/57c21.svg`,
  'cat-news.svg': `${right}/3c5ca.svg`,
  'cat-posts.svg': `${right}/b5ca9.svg`,
  'cat-services.svg': `${right}/52ed9.svg`,
  'icon-search.svg': `${right}/7c26e.svg`,
};

await fs.mkdir(outDir, {recursive: true});
for (const [name, url] of Object.entries(assets)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error(`${name}: empty`);
  await fs.writeFile(path.join(outDir, name), buf);
  console.log(`${name} ${buf.length}B`);
}
