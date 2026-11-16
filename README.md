# So Drama! Entertainment: AI Solutions Dashboard

Everything AI at So Drama!, in three tabs:

1. **AI news** (The AI Dispatch): five AI stories, refreshed every morning, with at least one word of caution.
2. **Apps**: everything we've built, filterable by type.
3. **How it works**: four steps on a 3D revolving stage. Declare → AAGB security review and approval → purchase request with AAGB approval → acquire and use. The big button opens the AI tool declaration form (Microsoft Forms).

The first time someone opens the site, **How it works** is the front page. From their second visit on, the site opens on **AI news**. A "Declare a tool" button stays in the top bar on every tab.

Each tab has its own address: add `#news`, `#apps` or `#how` to the link (`#step-2` goes straight to step 2).

Live site: https://inthemightyjungle.github.io/sodrama-ai-dashboard/

It is a plain static site (HTML, CSS and JavaScript, no build step), hosted on GitHub Pages. Nothing is loaded from other servers: fonts, the 3D library and news thumbnails all live in this repository.

## The AI Dispatch updates itself

Every day a scheduled Claude task starts at 6:38 am Singapore time, so the new edition is live by 7:00. It:

1. searches for the latest AI news and picks five stories, at least one of them a word of caution;
2. writes them to [`assets/data/news.js`](assets/data/news.js) on the `news-draft` branch;
3. waits for the **News thumbnails** workflow, which copies each story's own preview image into `assets/img/news/`;
4. checks every thumbnail, then publishes by moving `main` to the same commit.

The task follows the runbook in [`CLAUDE.md`](CLAUDE.md). To change the time or pause it, open the scheduled task in Claude.

### Changing the news by hand

Edit [`assets/data/news.js`](assets/data/news.js) on GitHub (pencil icon → edit → commit to `main`).

- The file is strict JSON inside one assignment: double quotes everywhere, no trailing commas.
- The first story is the big lead story. Keep 4 to 6 stories, and at least one with `"kind": "caution"`.
- Each story needs `id`, `kind`, `category`, `title`, `summary`, `source`, `url` and `date` (`YYYY-MM-DD`).
- Thumbnails are automatic. About a minute after you commit, the workflow fetches each article's preview image. To pick a different picture add `"image": "https://…"`; to show the stage artwork instead add `"thumb": "none"`.

`python3 tools/check_news.py` tells you if anything in the file is wrong.

## Adding an app

Add an entry to [`assets/data/apps.js`](assets/data/apps.js) and put its cover image in `assets/img/`. The filter tabs are built from the `category` values automatically.

## The 3D stage

- The stage belongs to the **How it works** tab. Its code is only fetched when that tab is first shown.
- [`assets/js/stage3d.js`](assets/js/stage3d.js) builds the revolving stage with [three.js](https://threejs.org) (a copy is in `assets/vendor/three/`).
- Where 3D cannot run (no WebGL, no graphics chip, or the visitor prefers reduced motion) the page shows still pictures from `assets/img/posters/` instead. Add `?still` to the address to see that version.
- `tools/stage-lab.html` is a workbench for the stage, and `tools/make_posters.py` re-renders the still pictures after the stage changes.

### Keeping it smooth

- Every shader, shape and picture is loaded before the first frame, so nothing stalls the first time a set swings into view.
- The stage never draws more than about 3 million pixels, and on screens faster than 90 Hz it draws every second or third refresh.
- [`assets/js/pace.js`](assets/js/pace.js) watches how long frames really take. On a device that cannot keep up it draws the stage a little softer, and if that is still too slow the page swaps to the still pictures. `node tools/test_pace.mjs` checks that logic.
- Scrolling only moves one small element at a time (see `update()` in [`assets/js/site.js`](assets/js/site.js)).
- Add `?3d` to the address to keep the stage on at full sharpness whatever the device, for testing.

## Preview on your computer

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Hosting

GitHub Pages serves the `main` branch from the repository root (Settings → Pages → Deploy from a branch → `main`, `/ (root)`).

To show the site inside a Microsoft Teams channel: in the channel choose **+** (Add a tab) → **Website**, then paste the live site address.

## Credits

- Fonts: Bodoni Moda and Archivo, under the SIL Open Font License (see `assets/fonts/`).
- 3D: three.js, MIT licence (see `assets/vendor/three/`).
- News thumbnails are the publishers' own preview images and link to their stories.
