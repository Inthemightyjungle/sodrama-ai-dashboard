# So Drama! Entertainment: AI Solutions Dashboard

One page for everything AI at So Drama!:

1. **Declare an AI tool**: the big button opens the AI tool declaration form (Microsoft Forms).
2. **How it works**: the four steps, declare → AAGB security review and approval → purchase request → acquire and use.
3. **The AI Dispatch**: a short pick of AI news, with at least one word of caution.
4. **Apps**: everything we've built, filterable by category.

Live site: https://inthemightyjungle.github.io/sodrama-ai-dashboard/

It's a plain static site (HTML, CSS and JavaScript, no build step), hosted on GitHub Pages.

## Updating the news

Edit [`assets/data/news.js`](assets/data/news.js) right here on GitHub (pencil icon → edit → commit).

- The first story is the big lead story. Keep 4 to 6 stories.
- `kind` is `"update"` for good news or `"caution"` for a risk or warning. Keep at least one caution story.
- `image` is the article's own preview image. Leave it as `""` to show a text tile instead. Don't use photos of people.
- Change `label` to the date you picked the stories.

The live site updates about a minute after you commit.

## Adding an app

Add an entry to [`assets/data/apps.js`](assets/data/apps.js). Put any cover image in `assets/img/`. The filter tabs are built from the `category` values automatically.

## Preview on your computer

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Hosting

GitHub Pages serves the `main` branch from the repository root (Settings → Pages).

To show the site inside a Microsoft Teams channel: in the channel, choose **+** (Add a tab) → **Website**, then paste the live site address.

## Credits

Fonts: Archivo, IBM Plex Mono and Instrument Serif, all under the SIL Open Font License (see `assets/fonts/`). News images belong to the publishers they link to.
