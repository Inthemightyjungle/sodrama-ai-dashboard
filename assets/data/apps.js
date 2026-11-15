/*
  Apps shown in section 03. Add an object to list a new app; the filter tabs
  are built from the categories automatically.

  cover types:
  - { type: 'image', src, position, pixelated }    one image filling the cover
  - { type: 'layers', background, logo, pixelated } a background with a logo on top
  - { type: 'declare' }                             the built-in declaration cover art
*/
window.SD_APPS = [
  {
    name: 'AI Tool Declaration',
    category: 'Tools',
    meta: 'Microsoft Form',
    description: 'The form behind step 1.',
    action: 'Open form',
    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=rcy329-Y_kaUIVobvsyr0TBFYZVJ-u1FmQ3PZtT_HmlUNFlVNjJPVjcwTFJTTjVITE5IQVpZUTNYOSQlQCN0PWcu',
    cover: { type: 'declare' }
  },
  {
    name: 'Pipe Rush',
    category: 'Games',
    meta: 'Plays in your browser',
    description: 'A pipe-routing puzzle with Normal, Rush, Endless and 35 Puzzle levels.',
    action: 'Play',
    url: 'https://inthemightyjungle.github.io/Pipe_Rush/',
    cover: { type: 'layers', background: 'assets/img/piperush-backdrop.webp', logo: 'assets/img/piperush-logo.png', pixelated: true }
  },
  {
    name: 'Lion Strike: F-15SG',
    category: 'Games',
    meta: 'Plays in your browser',
    description: 'A 16-bit shoot-’em-up: fly RSAF jets through ten sorties over Singapore.',
    action: 'Play',
    url: 'https://inthemightyjungle.github.io/Lion-Strike/',
    cover: { type: 'image', src: 'assets/img/lionstrike-icon.webp', position: 'center 40%', pixelated: true }
  }
];
