# Working on the AI Solutions Dashboard

This is So Drama! Entertainment's internal AI page, hosted on GitHub Pages from `main`.
Live: https://inthemightyjungle.github.io/sodrama-ai-dashboard/

## Ground rules

- **No build step.** Plain HTML, CSS and JavaScript. Do not add frameworks, bundlers or package files.
- **Nothing from other servers.** Fonts, three.js and news thumbnails are all in this repository. Never hotlink an image, script or font.
- **Commits:** author `Claude <noreply@anthropic.com>`. Never put the repository owner's personal email in a commit, a file or a request to another service.
- **Pictures of people:** never use a photo of a public figure (politician, executive, celebrity, presenter) as a thumbnail or anywhere else on the site.
- **Words:** plain, short sentences for staff who are not technical. Summaries are written in our own words, never copied from the source.
- **Keep it smooth.** The owner asked for the page to be less laggy, and it was tuned on their laptop. Before adding an effect, check these still hold:
  - Nothing compiles or uploads while the reader scrolls: the stage loads every shader, shape and picture before its first frame (`rehearse()` in `stage3d.js`).
  - `update()` in `site.js` runs on every scroll frame. It must not read the layout (`getBoundingClientRect`, `offsetTop` and friends belong in `measure()`), and it must not set a CSS variable on `<html>` or `<body>`: either one makes the browser re-work the whole page on every frame.
  - Animate only `transform` and `opacity`. No `backdrop-filter` or `mix-blend-mode` on anything that sits over the 3D stage, apart from the top bar.
  - New lights, or materials of a new kind, in one bay only mean a second set of shaders: add them to the rehearsal.
- Only `main` is published. `news-draft` is a scratch branch for the daily news job and gets overwritten.

## What the owner has asked for (keep to these)

- The look is a theatre with the house lights down: a real 3D revolving stage, velvet curtains, warm spotlight. Flat, hard-edged vector drawings were rejected as looking "like MS Paint".
- Scrolling must be obvious: the stage turns, the progress bar and the rail on the right move, the big type bands slide.
- It must not feel laggy: the stage follows the scroll closely (`FOLLOW` in `stage3d.js`) and never stutters when a new set arrives.
- The AI Dispatch always shows real thumbnails from the stories' own sources, and always includes at least one word of caution.
- The purchase step is worded "Request the purchase with AAGB approval".

## Map

| Path | What it is |
| --- | --- |
| `index.html` | The page. |
| `assets/css/site.css` | All styles. |
| `assets/js/site.js` | News and app lists, scroll indicators, starts the stage. |
| `assets/js/stage3d.js` | The 3D revolving stage (three.js). `stage-boot.js` loads it. |
| `assets/js/pace.js` | Softens the stage on devices that cannot keep up, and asks for still pictures if that is not enough. Tested by `node tools/test_pace.mjs`. |
| `assets/data/news.js` | The five stories. **Strict JSON** inside `window.SD_NEWS = …;`. |
| `assets/data/news-thumbs.js`, `assets/img/news/` | Thumbnails. Written by the workflow, never by hand. |
| `assets/data/apps.js` | The apps list. |
| `assets/img/posters/` | Still pictures of the stage (fallback and cover art). Made by `tools/make_posters.py`. |
| `tools/check_news.py` | Validates `news.js`. |
| `tools/news_thumbs.py` | Downloads thumbnails. Run by `.github/workflows/news-thumbs.yml` on pushes to `main` and `news-draft`. |
| `tools/stage-lab.html` | Workbench for the stage. |

To look at the page locally: `python3 -m http.server 8000` in the repository root. Add `?still` to see the version without 3D, or `?3d` to keep the stage on at full sharpness even where it draws slowly (needed when testing in a browser with no graphics chip).

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

This moves `main` forward to the checked commit and GitHub Pages rebuilds within a minute or two. If the push is refused because `main` has moved, run `git fetch origin main && git rebase origin/main`, push `news-draft` again (force), wait for the workflow, then publish.

If the workflow never ran, publish anyway (stories without a thumbnail show stage artwork) and say so in your report.

### 6. Report

Finish with three or four lines: the five headlines with their sources, which are words of caution, and anything that went wrong. Do not change any other file during the daily job.
