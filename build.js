// Builds the site into dist/ and writes the homepage Stories and Games lists from the stories/ and games/ folders.
// Netlify runs this on every change (see netlify.toml). No packages needed: plain Node.
//
// To add a story: put its .html file in stories/ with a STORY CARD block in its <head>:
//   <meta name="story:title"   content="...">
//   <meta name="story:date"    content="YYYY-MM-DD">   (newest date is shown as the big feature)
//   <meta name="story:label"   content="Topic · 5 min read · Interactive">
//   <meta name="story:summary" content="One or two sentences for the homepage card.">
// Optional: a thumbnail next to it with the same name ending .thumb.svg (e.g. my-story.thumb.svg).
// Games work the same way: files in games/ with game:title, game:date, game:label, game:summary (and an optional .thumb.svg).
// Link previews: add <name>.og.png (1200x630) next to a page and the build adds Open Graph tags pointing to it.
// Without one, the page uses og.png from the top of the site.
// Optional: <meta name="story:draft" content="true"> keeps a story off the homepage (the page itself is still published).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const STORIES = path.join(ROOT, 'stories');
const GAMES = path.join(ROOT, 'games');
// Address of the live site, used for link previews. Netlify sets URL during the build.
const SITE_URL = (process.env.URL || 'https://datacor.netlify.app').replace(/\/$/, '');
const SKIP = new Set(['dist', 'node_modules', '.git', '.netlify', 'build.js', 'netlify.toml', 'README.md', '.gitignore', 'package.json']);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function meta(html, name, kind = 'story') {
  const re = new RegExp(`<meta\\s+name=["']${kind}:${name}["']\\s+content=(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = html.match(re);
  return m ? unesc(m[1] ?? m[2]).trim() : '';
}

function readItems(DIR, folder, kind) {
  if (!fs.existsSync(DIR)) return [];
  const out = [];
  for (const file of fs.readdirSync(DIR)) {
    let htmlPath, href;
    const full = path.join(DIR, file);
    if (file.endsWith('.html')) { htmlPath = full; href = `${folder}/${file}`; }
    else if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'index.html'))) {
      htmlPath = path.join(full, 'index.html'); href = `${folder}/${file}/`;      // a story can also be a folder
    } else continue;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const title = meta(html, 'title', kind);
    if (!title) { console.warn(`! ${href}: no ${kind}:title, so it is not listed on the homepage`); continue; }
    if (meta(html, 'draft', kind).toLowerCase() === 'true') { console.log(`- ${href}: draft, not listed`); continue; }
    const date = meta(html, 'date', kind);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) console.warn(`! ${href}: ${kind}:date should look like 2026-11-03 (got "${date}")`);
    const base = htmlPath.endsWith('index.html') && htmlPath !== full ? path.join(full, 'thumb.svg') : htmlPath.replace(/\.html$/, '.thumb.svg');
    const thumb = fs.existsSync(base) ? fs.readFileSync(base, 'utf8').replace(/<\?xml[^>]*>/, '').trim() : '';
    out.push({ title, date, label: meta(html, 'label', kind), summary: meta(html, 'summary', kind), href, thumb, htmlPath });
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
}

function niceDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function storiesHTML(list) {
  if (!list.length) return '    <p class="mono">Stories coming soon.</p>\n';
  const [top, ...rest] = list;
  let h = `    <a class="feature reveal${top.thumb ? '' : ' no-art'}" href="${esc(top.href)}">
      <div class="feature-text">
        <div class="mono">Latest · ${esc(top.label || niceDate(top.date))}</div>
        <h3>${esc(top.title)}</h3>
        <p>${esc(top.summary)}</p>
        <span class="read">Read the story →</span>
      </div>
${top.thumb ? `      <div class="feature-art">${top.thumb}</div>\n` : ''}    </a>
`;
  if (rest.length) {
    h += `    <div class="more reveal">
      <span class="mono">More stories</span>
      <div class="posts">
${rest.map(s => `        <a class="post" href="${esc(s.href)}">
          <span class="date">${esc(niceDate(s.date))}</span>
          <div><h4>${esc(s.title)}</h4><p>${esc(s.summary)}</p><p class="mono" style="margin-top:8px">${esc(s.label)}</p></div>
          <span class="go">Read →</span>
        </a>`).join('\n')}
      </div>
    </div>
`;
  }
  return h;
}

function gamesHTML(list) {
  if (!list.length) return '    <p class="mono">Games coming soon.</p>\n';
  return `    <div class="games">
${list.map(g => `      <a class="game reveal" href="${esc(g.href)}">
${g.thumb ? `        <div class="art">${g.thumb}</div>\n` : ''}        <div class="txt">
          <div class="mono">${esc(g.label)}</div>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.summary)}</p>
          <div class="play"><span>Play →</span></div>
        </div>
      </a>`).join('\n')}
    </div>
`;
}

function fill(html, name, inner) {
  const START = new RegExp(`<!-- ${name}:START[^>]*-->`), END = `<!-- ${name}:END -->`;
  const s = html.search(START), e = html.indexOf(END);
  if (s < 0 || e < 0) { console.warn(`! index.html has no ${name}:START / ${name}:END markers, skipped`); return html; }
  return html.slice(0, s) + html.match(START)[0] + '\n' + inner + '    ' + html.slice(e);
}

// --- link previews (Open Graph + Twitter): what Reddit, Discord, WhatsApp, LinkedIn and X show when a link is shared
function previewTags({ type, title, description, url, image }) {
  const t = [
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="Jack Maughan">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
  ];
  if (image) t.push(
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`);
  return '<!-- LINK PREVIEW: added by build.js -->\n' + t.join('\n') + '\n';
}

function setPreview(file, tags) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/^[ \t]*<meta\s+(property=["']og:|name=["']twitter:)[^>]*>[ \t]*\r?\n?/gim, '')   // drop any hand-written ones
             .replace(/^[ \t]*<link\s+rel=["']canonical["'][^>]*>[ \t]*\r?\n?/gim, '');
  if (!/<\/head>/i.test(html)) return;
  fs.writeFileSync(file, html.replace(/<\/head>/i, tags + '</head>'));
}

// preview image: <name>.og.png next to the page (or og.png inside a story folder); falls back to the site-wide og.png
function previewImage(htmlPath) {
  const own = path.basename(htmlPath) === 'index.html' ? path.join(path.dirname(htmlPath), 'og.png') : htmlPath.replace(/\.html$/, '.og.png');
  if (fs.existsSync(own)) return SITE_URL + '/' + path.relative(ROOT, own).split(path.sep).join('/');
  return fs.existsSync(path.join(ROOT, 'og.png')) ? SITE_URL + '/og.png' : '';
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (src === ROOT && SKIP.has(name)) continue;
    if (name.endsWith('.thumb.svg') || name === 'thumb.svg') continue;      // thumbnails are inlined into the homepage
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

// --- build
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(ROOT, OUT);

const stories = readItems(STORIES, 'stories', 'story');
const games = readItems(GAMES, 'games', 'game');
let home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
home = fill(home, 'STORIES', storiesHTML(stories));
home = fill(home, 'GAMES', gamesHTML(games));
fs.writeFileSync(path.join(OUT, 'index.html'), home);

// link previews for every listed story and game, and for the homepage
for (const item of [...stories, ...games]) {
  const built = path.join(OUT, path.relative(ROOT, item.htmlPath));
  setPreview(built, previewTags({ type: 'article', title: item.title, description: item.summary,
                                  url: SITE_URL + '/' + item.href, image: previewImage(item.htmlPath) }));
}
const homeTitle = (home.match(/<title>([^<]*)<\/title>/i) || [, 'Jack Maughan'])[1];
const homeDesc = (home.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [, ''])[1];
setPreview(path.join(OUT, 'index.html'), previewTags({ type: 'website', title: unesc(homeTitle), description: unesc(homeDesc),
                                                       url: SITE_URL + '/', image: previewImage(path.join(ROOT, 'home.html')) }));

console.log(`Built ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} and ${games.length} game${games.length === 1 ? '' : 's'} into dist/ (newest first):`);
stories.forEach((st, i) => console.log(`  ${i ? ' ' : '★'} story ${st.date}  ${st.title}  →  ${st.href}`));
games.forEach(g => console.log(`    game  ${g.date}  ${g.title}  →  ${g.href}`));
