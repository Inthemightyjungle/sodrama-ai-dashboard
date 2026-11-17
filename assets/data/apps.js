/*
  The apps shown under "Apps", on the site and in the Chrome extension.
  Add an object to list a new app; the filter tabs are built from the
  categories automatically.

  This is strict JSON inside window.SD_APPS = …; (double quotes, no comments
  inside, no trailing commas), because the Chrome extension reads it as data.
  Check it with: python3 tools/check_apps.py

  cover types:
  - { "type": "image", "src", "position", "pixelated" }     one image filling the cover
  - { "type": "layers", "background", "logo", "pixelated" } a background with a logo on top
*/
window.SD_APPS = [
  {
    "name": "AI Tool Declaration",
    "category": "Tools",
    "meta": "Microsoft Form",
    "description": "The form behind step 1.",
    "action": "Open form",
    "url": "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=rcy329-Y_kaUIVobvsyr0TBFYZVJ-u1FmQ3PZtT_HmlUNFlVNjJPVjcwTFJTTjVITE5IQVpZUTNYOSQlQCN0PWcu",
    "cover": {
      "type": "image",
      "src": "assets/img/posters/cover-declare.webp"
    }
  },
  {
    "name": "Dealproof",
    "category": "Tools",
    "meta": "Opens in Claude",
    "description": "Finds the cheapest price you can trust across Singapore stores, scores each seller and watches prices for you.",
    "action": "Open",
    "url": "https://claude.ai/artifact/SKMjwY78gmTy2m6M7CGs2Q",
    "cover": {
      "type": "image",
      "src": "assets/img/dealproof-cover.webp"
    }
  },
  {
    "name": "2nd Brain",
    "category": "Tools",
    "meta": "Opens in Claude",
    "description": "A 2D and 3D map of the team\u2019s inspiration posts, projects, horizon scans and calendar.",
    "action": "Open",
    "url": "https://claude.ai/artifact/WMecCroh1RazAz4sYCnQwQ",
    "cover": {
      "type": "image",
      "src": "assets/img/brain-cover.webp"
    }
  },
  {
    "name": "FinAid",
    "category": "Tools",
    "meta": "Preview in Claude",
    "description": "Answers finance questions and checks a purchase before you raise a PR: quotes, approvals and how to pay.",
    "action": "Try it",
    "url": "https://claude.ai/artifact/HER2RFzkotzUqRM6XPvTkC",
    "cover": {
      "type": "image",
      "src": "assets/img/finaid-cover.webp"
    }
  },
  {
    "name": "Pipe Rush",
    "category": "Games",
    "meta": "Plays in your browser",
    "description": "A pipe-routing puzzle with Normal, Rush, Endless and 35 Puzzle levels.",
    "action": "Play",
    "url": "https://inthemightyjungle.github.io/Pipe_Rush/",
    "cover": {
      "type": "layers",
      "background": "assets/img/piperush-backdrop.webp",
      "logo": "assets/img/piperush-logo.png",
      "pixelated": true
    }
  },
  {
    "name": "Lion Strike: F-15SG",
    "category": "Games",
    "meta": "Plays in your browser",
    "description": "A 16-bit shoot-\u2019em-up: fly RSAF jets through ten sorties over Singapore.",
    "action": "Play",
    "url": "https://inthemightyjungle.github.io/Lion-Strike/",
    "cover": {
      "type": "image",
      "src": "assets/img/lionstrike-icon.webp",
      "position": "center 40%",
      "pixelated": true
    }
  },
  {
    "name": "Haze Squad v02",
    "category": "Games",
    "meta": "Plays in your browser",
    "description": "A 16-bit game about haze in Singapore: clean the air zone by zone with Grandpa\u2019s vacuum and your squad.",
    "action": "Play",
    "url": "https://claude.ai/artifact/Hf9pbNEHTjvMk2Z3bEoRDb",
    "cover": {
      "type": "image",
      "src": "assets/img/haze-squad-cover.webp"
    }
  },
  {
    "name": "Fall In: IPPT Challenge",
    "category": "Games",
    "meta": "Plays in your browser",
    "description": "Push-ups, sit-ups and the run, with a sergeant counting you through.",
    "action": "Play",
    "url": "https://claude.ai/artifact/VGzVALhJGMuZUsKkbwQjj8",
    "cover": {
      "type": "image",
      "src": "assets/img/ippt-cover.webp"
    }
  },
  {
    "name": "My Grandmother Can Run Faster Than You!",
    "category": "Games",
    "meta": "Plays in your browser",
    "description": "Run Ah Ma down the MRT tracks: dress her up, dodge the trains, and don\u2019t let the Police Aunty catch you.",
    "action": "Play",
    "url": "https://claude.ai/artifact/12XfM12MWm13Bi8JAjDpZH",
    "cover": {
      "type": "image",
      "src": "assets/img/grandma-cover.webp"
    }
  }
];
