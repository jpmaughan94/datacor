// Builds the site into dist/ and writes the homepage story list from the stories folder.
// Netlify runs this on every change (see netlify.toml). No packages needed: plain Node.
//
// To add a story: put its .html file in stories/ with a STORY CARD block in its <head>:
//   <meta name="story:title"   content="...">
//   <meta name="story:date"    content="YYYY-MM-DD">   (newest date is shown as the big feature)
//   <meta name="story:label"   content="Topic · 5 min read · Interactive">
//   <meta name="story:summary" content="One or two sentences for the homepage card.">
// Optional: a thumbnail next to it with the same name ending .thumb.svg (e.g. my-story.thumb.svg).
// Optional: <meta name="story:draft" content="true"> keeps a story off the homepage (the page itself is still published).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const STORIES = path.join(ROOT, 'stories');
const SKIP = new Set(['dist', 'node_modules', '.git', '.netlify', 'build.js', 'netlify.toml', 'README.md', '.gitignore', 'package.json']);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function meta(html, name) {
  const re = new RegExp(`<meta\\s+name=["']story:${name}["']\\s+content=(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = html.match(re);
  return m ? unesc(m[1] ?? m[2]).trim() : '';
}

function readStories() {
  if (!fs.existsSync(STORIES)) return [];
  const out = [];
  for (const file of fs.readdirSync(STORIES)) {
    let htmlPath, href;
    const full = path.join(STORIES, file);
    if (file.endsWith('.html')) { htmlPath = full; href = `stories/${file}`; }
    else if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'index.html'))) {
      htmlPath = path.join(full, 'index.html'); href = `stories/${file}/`;      // a story can also be a folder
    } else continue;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const title = meta(html, 'title');
    if (!title) { console.warn(`! ${href}: no story:title, so it is not listed on the homepage`); continue; }
    if (meta(html, 'draft').toLowerCase() === 'true') { console.log(`- ${href}: draft, not listed`); continue; }
    const date = meta(html, 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) console.warn(`! ${href}: story:date should look like 2026-11-03 (got "${date}")`);
    const base = htmlPath.endsWith('index.html') && htmlPath !== full ? path.join(full, 'thumb.svg') : htmlPath.replace(/\.html$/, '.thumb.svg');
    const thumb = fs.existsSync(base) ? fs.readFileSync(base, 'utf8').replace(/<\?xml[^>]*>/, '').trim() : '';
    out.push({ title, date, label: meta(html, 'label'), summary: meta(html, 'summary'), href, thumb });
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

const stories = readStories();
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const START = /<!-- STORIES:START[^>]*-->/, END = '<!-- STORIES:END -->';
const s = home.search(START), e = home.indexOf(END);
if (s < 0 || e < 0) throw new Error('index.html is missing the <!-- STORIES:START --> / <!-- STORIES:END --> markers');
const startTag = home.match(START)[0];
const built = home.slice(0, s) + startTag + '\n' + storiesHTML(stories) + '    ' + home.slice(e);
fs.writeFileSync(path.join(OUT, 'index.html'), built);

console.log(`Built ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} into dist/ (newest first):`);
stories.forEach((st, i) => console.log(`  ${i ? ' ' : '★'} ${st.date}  ${st.title}  →  ${st.href}`));
