# Datacor website

The homepage's **Data stories** and **Games** sections are built automatically from the `stories` and `games` folders. Add a file to either folder, and Netlify rebuilds the site and puts it on the homepage.

## What's here

| File / folder | What it is | Edit it? |
|---|---|---|
| `index.html` | Your homepage | Yes, for anything except the story list |
| `stories/` | One `.html` file per story, plus an optional `.thumb.svg` picture for its homepage card | Add new stories here |
| `games/` | One `.html` file per game, plus an optional `.thumb.svg` | Add new games here |
| `build.js` | Writes the story list into the homepage | No |
| `netlify.toml` | Tells Netlify to run `build.js` | No |

## Adding a new story

1. **Name the file** in lowercase with hyphens, e.g. `uk-housing.html`. That becomes the web address: `datacor.netlify.app/stories/uk-housing.html`.

2. **Paste this "story card" into the story's `<head>`**, just under its `<title>`, and fill it in:

   ```html
   <!-- STORY CARD: the homepage builds its story list from these lines -->
   <meta name="story:title" content="The headline as it should appear on the homepage">
   <meta name="story:date" content="2026-12-01">
   <meta name="story:label" content="Housing · 5 min read · Interactive">
   <meta name="story:summary" content="One or two sentences that make people want to click.">
   ```

   - `story:date` must look like `2026-12-01`. The newest date becomes the big featured card; the rest go under "More stories".
   - Avoid double quotes (`"`) inside the text. Apostrophes are fine.

3. **Link back to the homepage** from the story, e.g. `<a href="../index.html#stories">← All stories</a>`. The story is one folder down, so the link starts with `../`.

4. **Optional: add a picture** for the homepage card. Save an SVG with the same name ending `.thumb.svg` (e.g. `uk-housing.thumb.svg`) and it appears on the right of the featured card. Without one, the card is text only. To follow light and dark mode, use colours like `style="fill:var(--accent)"`.

5. **Upload it on GitHub:** open the `stories` folder → **Add file** → **Upload files** → drag in the `.html` (and `.thumb.svg`) → **Commit changes**. Netlify rebuilds in about a minute.

## Adding a new game
Exactly like a story, but put the file in `games/` and use `game:` instead of `story:` in the card block:

```html
<meta name="game:title" content="Name of the game">
<meta name="game:date" content="2026-12-01">
<meta name="game:label" content="Football · Game">
<meta name="game:summary" content="One or two sentences on how to play.">
```
Games appear as cards in the Games section, newest first. Link back with `<a href="../index.html">← Datacor</a>`.

## Link previews (Reddit, Discord, WhatsApp, LinkedIn, X)
The build adds preview tags to every story and game, and to the homepage, using the card details (title and summary).
- **The preview picture** is a 1200 × 630 PNG with the same name as the page, ending `.og.png` (e.g. `uk-housing.og.png` next to `uk-housing.html`). For a story folder, use `og.png` inside the folder.
- **No picture?** The page uses `og.png` from the top of the site instead.
- **Check a preview** by pasting the page's address into [opengraph.xyz](https://www.opengraph.xyz). Sites cache previews, so a link already shared may take a while to update.

## Other things you can do
- **Hide a story from the homepage** without deleting it: add `<meta name="story:draft" content="true">`. The page stays live at its address, so you can share it for review first.
- **Change a card's wording or order:** edit that story's `story:` lines and commit. You don't need to edit the homepage.
- **A story with several files** (images, data): make a folder, e.g. `stories/uk-housing/index.html`, and put the other files in the same folder. Add a `thumb.svg` inside the folder for the card picture.

## If a build fails
In Netlify, open **Deploys** and click the failed deploy to see its log. `build.js` prints which stories it found, plus a warning for any story with a missing title or a badly formatted date. The live site stays on the last good version until the next build works.

## Testing on your own computer (optional)
With Node installed, run `node build.js` in this folder and open `dist/index.html`.
