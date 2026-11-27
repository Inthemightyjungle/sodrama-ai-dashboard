# So Drama! Entertainment: AI Solutions Dashboard

**Open the dashboard: <https://PROJECT_ID.web.app/>**

The dashboard is private. Sign in with your email address and password; the first time, choose **First time here? Set your password**. If it says you are not on the list, ask the dashboard owner to add you.

Everything AI at So Drama!, in four tabs:

1. **AI news** (The AI Dispatch): five AI stories, refreshed every morning, with at least one word of caution.
2. **Apps**: everything we've built, filterable by type.
3. **How it works**: four steps on a 3D revolving stage. Declare → AAGB security review and approval → purchase request with AAGB approval → acquire and use. The big button opens the AI tool declaration form (Microsoft Forms).
4. **Approved tools**: the approved AI tools from the AI Tool Register, grouped by what they do (chat and research, images and design, video, voice and audio, building with AI). Each shows its icon, its full name and how it is used: **Company** (on a company licence), **Personal** (on your own account) or **Both**. Search by name, maker or what a tool does ("video", "voice"), or filter by Company and Personal.

The first time someone opens the site, **How it works** is the front page. From their second visit on, the site opens on **AI news**. A "Declare a tool" button stays in the top bar on every tab.

Each tab has its own address: add `#news`, `#apps`, `#how` or `#tools` to the link (`#step-2` goes straight to step 2).

It is a plain static site (HTML, CSS and JavaScript, no build step), hosted on Firebase. Nothing is loaded from other servers: fonts, the 3D library, the sign-in library and news thumbnails all live in this repository. The page talks only to Google's Firebase sign-in and database services.

## Sign-in and who can see it

- Until someone is signed in, has confirmed their email address and is on the list, the page shows only the sign-in screen. The news, apps, approved tools and form links are not in the published files at all: they are kept in the database, and only people on the list can read them ([`firestore.rules`](firestore.rules)).
- **People** (in the account menu, top right, for admins): add someone as Staff or Admin, switch someone to Admin and back, send a link to choose a new password, or remove someone. After adding someone, the page gives you a short message to send them.
- The **owner** is the address in the `OWNER_EMAIL` secret. The owner is always an admin and cannot be removed or demoted, so the list can never lock its owner out.
- What is still public: the page's design, the "How it works" words and the pictures (thumbnails, tool icons, posters). There are no names, links or lists in them.

## Install it as an app

The dashboard can sit on a computer or phone like an app, with its own icon and window.

- **Chrome or Edge, on a computer or Android:** click **Install app** in the top bar (or at the bottom of any page), or use the install icon in the address bar.
- **iPhone or iPad:** open the link in Safari, tap **Share**, then **Add to Home Screen**.

Once installed it opens like an app and stays signed in. It needs a connection to show the news, apps and tools, which are never stored on the device.

How it works: [`manifest.webmanifest`](manifest.webmanifest) names the app and its icons (`assets/img/app/`), and [`sw.js`](sw.js) keeps a copy of the site for offline use. Neither needs touching when the news or apps change.

## Chrome extension

[`extension/`](extension/) is a Chrome extension version of the dashboard.

- **Toolbar button:** opens a small window with today's AI news, the apps, the four steps and a **Declare an AI tool** button. It shows **NEW** when a fresh edition of the news is out.
- **Side panel:** **Open in side panel** shows the full dashboard beside whatever page you are on.

It reads the news and the apps from the live site, so it never needs updating when they change. It collects no data and asks for no access to the pages you visit.

**To give it to staff:** zip the `extension` folder and upload it in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (a one-time US$5 registration). Publish it as *Unlisted* (only people with the link can find it) or, with Google Workspace, *Private* to the company.

**To try it on your own computer:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `extension` folder.

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

## Changing the approved tools

Edit [`assets/data/tools.js`](assets/data/tools.js): each tool has a full name, what it is for, its `"group"`, `"use": "company"`, `"personal"` or `"both"`, and its website. List each tool once, however many people declared it, and never copy names or email addresses from the register: this site is public. Run `python3 tools/check_tools.py` (it refuses any email address). When the change reaches GitHub, the **Tool icons** workflow copies each tool's own icon from its website into `assets/img/tools/`. Look at the new icons; if one is wrong, give that tool an `"icon"` with the address of a better picture. A tool with no website shows its initials.

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

Then open http://localhost:8000. Signing in needs `assets/js/firebase-config.js`, which the deploy writes and which is not in the repository: copy it from the live site (`/assets/js/firebase-config.js`) into `assets/js/`. Git ignores it. `localhost` is allowed to sign in by default.

The sign-in screens and the People page are tested against the Firebase emulators by `.github/workflows/test-signin.yml` (`tests/rules.test.mjs`, `tests/e2e_emulator.py`).

## Hosting

Every push to `main` runs the **Deploy** workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). It publishes the page's own files to Firebase Hosting, copies the content from `assets/data/` into the database, deploys `firestore.rules`, and keeps the owner on the list. It needs two repository secrets (Settings → Secrets and variables → Actions):

- `FIREBASE_SERVICE_ACCOUNT`: the key file from Firebase (Project settings → Service accounts → Generate new private key), pasted whole. Never commit it or send it to anyone.
- `OWNER_EMAIL`: the owner's email address.

If the deploy says it is not allowed to do something, give the `firebase-adminsdk` service account the role **Firebase Admin** in the Google Cloud console (IAM).

The site refuses to be shown inside other websites (only Chrome extensions may), so a Microsoft Teams **Website** tab will not display it. Post the link in the channel instead.

## Credits

- Fonts: Bodoni Moda and Archivo, under the SIL Open Font License (see `assets/fonts/`).
- 3D: three.js, MIT licence (see `assets/vendor/three/`).
- News thumbnails are the publishers' own preview images and link to their stories.
