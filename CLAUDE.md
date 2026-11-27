# Working on the AI Solutions Dashboard

This is So Drama! Entertainment's internal AI page. It is private: people sign in with an email address and password, and only those on the list the owner keeps can see anything. `.github/workflows/deploy.yml` publishes `main` to Firebase.
Live: https://PROJECT_ID.web.app/ (filled in after the first deploy). The old GitHub Pages address is being retired.

## Ground rules

- **No build step.** Plain HTML, CSS and JavaScript. Do not add frameworks, bundlers or package files.
- **Nothing from other servers.** Fonts, three.js, the Firebase sign-in library and news thumbnails are all in this repository. Never hotlink an image, script or font. The only outside addresses the page talks to are Google's sign-in and database services (`identitytoolkit`, `securetoken` and `firestore.googleapis.com`), named in the content security policy.
- **Commits:** author `Claude <noreply@anthropic.com>`. Never put the repository owner's personal email in a commit, a file or a request to another service.
- **Pictures of people:** never use a photo of a public figure (politician, executive, celebrity, presenter) as a thumbnail or anywhere else on the site.
- **Words:** plain, short sentences for staff who are not technical. Summaries are written in our own words, never copied from the source.
- **Keep it smooth.** The owner asked for the page to be less laggy, and it was tuned on their laptop. Before adding an effect, check these still hold:
  - None of the 3D code is fetched until "How it works" is first shown (`bootStage()` in `site.js`), and the stage stops drawing whenever another page is showing.
  - Nothing compiles or uploads while the reader scrolls: the stage loads every shader, shape and picture before its first frame (`rehearse()` in `stage3d.js`).
  - `update()` in `site.js` runs on every scroll frame. It must not read the layout (`getBoundingClientRect`, `offsetTop` and friends belong in `measure()`), and it must not set a CSS variable on `<html>` or `<body>`: either one makes the browser re-work the whole page on every frame.
  - Animate only `transform` and `opacity`. No `backdrop-filter` or `mix-blend-mode` on anything that sits over the 3D stage, apart from the top bar.
  - New lights, or materials of a new kind, in one bay only mean a second set of shaders: add them to the rehearsal.
- **App identity.** `manifest.webmanifest` has `"id": "/sodrama-ai-dashboard/"`. Never change it to `"./"`: browsers read a relative id from the root of inthemightyjungle.github.io, which other apps on the same site (Lion Strike, Little Log) also used, and Chrome then treated them as one app (opening a game replaced the dashboard's desktop shortcut and icon).
- **Privacy and safety.** The page loads only its own files, sends no referrer to sites opened from it, asks search engines not to index it, and stores nothing but the sign-in session (kept by the Firebase library in the browser's storage for this site) and the `sd-intro-seen` flag. A content security policy in `index.html` enforces this; it allows the one inline `<head>` script by its fingerprint, so after editing that script run `python3 tools/check_csp.py --fix`. Don't add analytics, outside fonts or scripts.
- **The content is not in the published files.** News, thumbnails list, apps, approved tools, tool icons and form links live in `assets/data/` in the repository, and the Deploy workflow copies them into the database (`content/site`), which only signed-in people on the list can read (`firestore.rules`). Never put a file from `assets/data/` in the published folder, write a form or app link into `index.html`, or load data any other way. Links that need filling in carry `data-link="…"` and come from `assets/data/links.js`. The page's design, the "How it works" words and the pictures (thumbnails, icons, posters) are public files.
- Only `main` is published. `news-draft` is a scratch branch for the daily news job and gets overwritten; `tools-draft` is the same for checking tool icons before they go live.

## What the owner has asked for (keep to these)

- **The name is "AI Solutions Dashboard".** It was briefly renamed "AI Sandbox" and the owner asked to go back. The app icon is a 3D scene (curtain, lit stage, gold 3D letters reading "AI Dashboard") with the So Drama logo laid on top **exactly as it is**: never redraw, recolour or add effects to the logo.
- **Private, with sign-in (Firebase, email and password).** Until someone is signed in, has confirmed their email address and is on the list, the page shows only the sign-in screen (the stage behind a velvet rope) and holds no content. People on the list set their own password the first time ("First time here?"). Admins manage the list on the **People** page (account menu, `#people`): add someone as Staff or Admin, a switch to make someone an admin, send a password link, remove (asks first). The owner, from the `OWNER_EMAIL` repository secret, is always an admin and can never be removed or demoted. The owner asked for People only on the admin page; add other settings only when asked.
- **Four pages, in this order: AI news, Apps, How it works, Approved tools.** The four steps on the 3D stage ("How it works") are the front page only the first time someone opens the site. From the second visit on, the site opens on AI news and the steps are the third tab. The same four tabs sit in the top bar on wide screens and in a bar along the bottom on phones (where the fourth is labelled "Approved").
- **Approved tools** lists the approved AI tools from the **AI Tool Register** the owner supplied (a CSV of staff declarations, 26 Nov 2026). Each tool appears once, with its icon, full name, what it is for, and how it is used: **Company**, **Personal** or **Both** (declared both ways). Tools are grouped by function, with a search box and an All / Company / Personal filter (a "Both" tool shows under both). The list is `assets/data/tools.js`. **Never publish staff names or email addresses from the register**, and never commit the CSV. When the owner sends a newer register, rebuild the list the same way: merge spellings of the same tool (e.g. "Magnific.com", "Magnific"), split rows that name two tools ("Deepseek & Qwen"), and fold Adobe's AI entries into Adobe Firefly.
- The look is a theatre with the house lights down: a real 3D revolving stage, velvet curtains, warm spotlight. Flat, hard-edged vector drawings were rejected as looking "like MS Paint".
- Scrolling must be obvious: the stage turns, the progress bar and the rail on the right move, the big type bands slide.
- It must not feel laggy: the stage follows the scroll closely (`FOLLOW` in `stage3d.js`) and never stutters when a new set arrives.
- The AI Dispatch always shows real thumbnails from the stories' own sources, and always includes at least one word of caution.
- The purchase step is worded "Request the purchase with AAGB approval".
- Every app, story and form link opens in a window of its own and leaves the dashboard as it was (`setupWindows()` in `site.js`). Keep `target="_blank"` on these links as well: it is the fallback when pop-ups are blocked. A new-tab link alone is not enough, because the Claude app's browser panel opens it in place of the dashboard.

## Map

| Path | What it is |
| --- | --- |
| `index.html` | The sign-in screen, the four pages (`#news`, `#apps`, `#how`, `#tools`) and People (`#people`, admins only). The small script in its `<head>` picks the page to open on before the first paint. |
| `assets/js/account.js` | Sign-in screen, account menu and People page. Fills the page (`window.SD_DATA` and the `sd-data` event) only once the person is signed in and on the list. |
| `assets/js/backend.js` | Firebase: signing in (the library in `assets/vendor/firebase/`) and the database through its plain web address. Reads `assets/js/firebase-config.js`, which the deploy writes; it is not in the repository. |
| `firestore.rules` | Who may read the content and see or change the list. Tested by `tests/rules.test.mjs` and `tests/e2e_emulator.py` in `.github/workflows/test-signin.yml`. |
| `firebase.json`, `.github/workflows/deploy.yml`, `tools/publish_content.mjs` | The deploy, on every push to `main` and after the thumbnail and icon jobs: page files to Firebase Hosting, content to the database, rules, and the owner kept on the list. Needs the `FIREBASE_SERVICE_ACCOUNT` and `OWNER_EMAIL` secrets. |
| `assets/data/links.js` | The declaration form's address, filled into every `data-link="declare"` link after sign-in. |
| `manifest.webmanifest`, `sw.js`, `assets/img/app/` | Make the site installable as an app. `sw.js` always asks the network first and keeps a copy of the site's own files only for offline use; it never touches the database. Change its `VERSION` only when its `SHELL` list changes. |
| `assets/css/site.css` | All styles. |
| `assets/js/site.js` | News, app and approved-tool lists, switching between the pages, scroll indicators, starts the stage. Waits for the content from `account.js` before filling anything in. |
| `assets/js/stage3d.js` | The 3D revolving stage (three.js). `stage-boot.js` loads it. |
| `assets/js/pace.js` | Softens the stage on devices that cannot keep up, and asks for still pictures if that is not enough. Tested by `node tools/test_pace.mjs`. |
| `assets/data/news.js` | The five stories. **Strict JSON** inside `window.SD_NEWS = …;`. |
| `assets/data/news-thumbs.js`, `assets/img/news/` | Thumbnails. Written by the workflow, never by hand. |
| `assets/data/apps.js` | The apps list. **Strict JSON** inside `window.SD_APPS = …;`. |
| `assets/img/posters/` | Still pictures of the stage (fallback and cover art). Made by `tools/make_posters.py`. |
| `tools/check_news.py` | Validates `news.js`. |
| `tools/news_thumbs.py` | Downloads thumbnails. Run by `.github/workflows/news-thumbs.yml` on pushes to `main` and `news-draft`. |
| `tools/stage-lab.html` | Workbench for the stage. |
| `extension/` | The Chrome extension (toolbar window with news, apps and steps; the full site in the side panel). It reads `news.js`, `news-thumbs.js` and `apps.js` from the live site **as JSON**, so all three must stay strict JSON inside `window.SD_… = …;` (`python3 tools/check_news.py`, `python3 tools/check_apps.py`). If the web address ever changes, update `SITE` in `extension/shared.js`, raise `version` in `extension/manifest.json` and upload a new zip to the Chrome Web Store. |
| `tools/check_apps.py` | Validates `apps.js`. |
| `assets/data/tools.js` | The approved tools. **Strict JSON** inside `window.SD_TOOLS = …;`. Check with `python3 tools/check_tools.py`. |
| `assets/data/tool-icons.js`, `assets/img/tools/` | Tool icons, copied from each tool's own website by `tools/tool_icons.py`, which `.github/workflows/tool-icons.yml` runs on pushes to `main` and `tools-draft` that change `tools.js`. Written by the workflow, never by hand. Look at each new icon; if one is wrong, set the tool's `icon` to a better picture's address. A tool with no `site` or `icon` shows its initials. |
| `tools/make_icon.py`, `tools/icon-lab.html` | Make the app icons. `icon-lab.html` draws the 3D scene; `make_icon.py` adds the logo file on top and writes every size. After a change, bump `?v=` on the icons in `manifest.webmanifest` so installed apps pick it up. |

To look at the page locally: `python3 -m http.server 8000` in the repository root. The browser remembers that the steps have been shown in `localStorage` under `sd-intro-seen`; remove it (or use a private window) to see a first visit again. Add `?still` to see the version without 3D, or `?3d` to keep the stage on at full sharpness even where it draws slowly (needed when testing in a browser with no graphics chip).

## Daily job: refresh the AI Dispatch

Goal: by 7:00 am Singapore time the page shows five current AI stories, each with a real thumbnail from its source.

### 1. Pick the stories

Search the web for AI news from the last one to three days. Open every article you intend to use and check the facts and the date. Pick **five**:

- Readers are staff of a media and entertainment company in Singapore: producers, editors, designers, writers, marketers. Prefer news they can use: creative and production tools (video, audio, image, writing), the assistants they already use, how the industry is adopting AI.
- **At least one, at most two, must be a word of caution**: a data leak or security incident involving an AI tool, a misuse or scam, a legal or copyright decision, a privacy change. Prefer ones with a practical lesson for staff, and say the lesson in the summary.
- The first story is the lead. Choose the one most relevant to people who make media, with a strong picture.
- Use reputable sources, a different one for each story where possible, and the original announcement when there is one. Avoid paywalled pages.
- Skip politics, elections, share prices, funding rounds, gossip and stories that are mainly about one person's conduct.
- Nothing older than seven days, unless it is still the best word of caution (14 days at most). Keep one of yesterday's stories only if nothing better has appeared.

### 2. Write `assets/data/news.js`

Keep the exact shape that is in the file now. For each story:

- `id`: lowercase words joined by hyphens, unique, stable for the life of the story (the thumbnail is saved under this name).
- `kind`: `"update"` or `"caution"`.
- `category`: one or two words, such as "Creative tools", "Data security", "Video".
- `title`: 90 characters at most, plain and specific, no clickbait.
- `summary`: 230 characters at most, in your own words. What happened, then why it matters to staff.
- `source`, `url` (https), `date` (`YYYY-MM-DD`, the day the story was published).
- Optional: `image` (an https address, to use a different picture from the default preview image), `thumb` (`"none"` to show stage artwork instead), `credit` (replaces the default "Image: source").

Set `"updated"` to the current Singapore time, for example `2026-11-17T06:50:00+08:00`. Then run `python3 tools/check_news.py` and fix anything it reports.

### 3. Get the thumbnails on the draft branch

```
git fetch origin main
git checkout -B news-draft origin/main
# edit assets/data/news.js, run the check
git add assets/data/news.js
git -c user.name=Claude -c user.email=noreply@anthropic.com commit -m "AI Dispatch for <date>"
git -c push.negotiate=true push -f origin news-draft
```

The **News thumbnails** workflow now runs on GitHub (usually under a minute). It commits `assets/img/news/<id>.jpg` and `assets/data/news-thumbs.js` to `news-draft`. Wait for it: every 20 seconds run `git fetch origin news-draft` and look at `git log origin/news-draft -1`; stop when the newest commit is "Update news thumbnails". Give up after six minutes.

Then `git merge --ff-only origin/news-draft` and read `assets/data/news-thumbs.js`. A story whose entry has `"src": null` has no thumbnail; its `"error"` says why.

### 4. Check every thumbnail

Open each new file in `assets/img/news/` and look at it. Replace the picture or the story if the image:

- shows a recognisable public figure, or is mainly a portrait of any person;
- is violent, gory or otherwise unsuitable for an office;
- is a blank, an error page, a generic site logo or has nothing to do with the story;
- failed to download (`"src": null`).

Ways to fix, best first: choose another reputable source for the same story (change `url` and `source`), choose a different story, set `image` to a suitable picture from the original announcement, or as a last resort set `"thumb": "none"`. After any change, commit, push `news-draft` again, wait for the workflow and check again. Aim for five real thumbnails.

### 5. Publish

```
git -c push.negotiate=true push origin news-draft:main
```

This moves `main` forward to the checked commit. The **Deploy** workflow then publishes it to Firebase, usually within two minutes: check `gh run list --repo Inthemightyjungle/sodrama-ai-dashboard --workflow deploy.yml --limit 1` shows it succeeded, and say so in the report if it did not. If the push is refused because `main` has moved, run `git fetch origin main && git rebase origin/main`, push `news-draft` again (force), wait for the workflow, then publish.

If the workflow never ran, publish anyway (stories without a thumbnail show stage artwork) and say so in your report.

### 6. Report

Finish with three or four lines: the five headlines with their sources, which are words of caution, and anything that went wrong. Do not change any other file during the daily job.
