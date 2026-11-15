/*
  The AI Dispatch: stories shown in section 02.

  How to update:
  - The first story is the big lead story. Keep 4 to 6 stories in total.
  - kind: "update" for good news, "caution" for a risk or warning (shown with a red tag).
    Try to keep at least one "caution" story.
  - image: the article's own preview image (its og:image). Leave it as "" to show a text tile.
    Don't use photos of people.
  - imageCredit: only needed when the image licence asks for credit; it shows on the lead story.
*/
window.SD_NEWS = {
  label: 'Picked 15 Nov 2026',
  stories: [
    {
      kind: 'update',
      category: 'Film & studios',
      date: '9 Nov 2026',
      source: 'The Next Web',
      url: 'https://thenextweb.com/news/adobe-disney-ai-alliance-firefly-foundry',
      image: 'https://media.thenextweb.com/2026/11/walt-disney-studios-burbank-entrance-arch.jpg',
      imageCredit: 'Photo: Coolcaesar, CC BY-SA 4.0, via Wikimedia Commons',
      title: 'Disney names Adobe its official AI partner',
      summary: 'A multi-year deal to build custom AI models around Disney’s own characters, worlds and styles, starting with post-production and VFX work.'
    },
    {
      kind: 'update',
      category: 'Creative tools',
      date: '10 Nov 2026',
      source: 'Digital Production',
      url: 'https://digitalproduction.com/2026/11/10/adobe-max-2026-ai-video-audio-premiere-creative-agent/',
      image: 'https://media.digitalproduction.download/2026/11/ff-imageediting-rotateobject-no-logo-2.jpg',
      title: 'Premiere gets AI video, music and sound generation',
      summary: 'Adobe MAX also brought AI audio clean-up and an early look at agent workflows across Creative Cloud.'
    },
    {
      kind: 'caution',
      category: 'Data security',
      date: '26 Oct 2026',
      source: 'eSecurity Planet',
      url: 'https://www.esecurityplanet.com/threats/news-302-ai-data-leak-private-chats/',
      image: 'https://cdn.esecurityplanet.com/claudio-schwarz-fyeOxvYvIyY-unsplash.jpg',
      title: 'An AI chatbot hub left 17.6 million files open',
      summary: '302.ai’s exposed storage held private chat logs and company documents. The lesson: know which AI tools staff use, and what goes into them.'
    },
    {
      kind: 'update',
      category: 'Models',
      date: '10 Nov 2026',
      source: 'Digital Trends',
      url: 'https://www.digitaltrends.com/computing/google-gemini-4-carbon-is-now-available-for-complex-ai-tasks/',
      image: 'https://i0.wp.com/cdn.dtmg.xyz/uploads/2026/11/Gemini-carbon-feature.jpg?resize=1200%2C630&ssl=1',
      title: 'Google widens access to Gemini 4 Carbon',
      summary: 'After two weeks with cybersecurity defenders only, it’s open to developers, businesses, scientists and AI Ultra subscribers.'
    },
    {
      kind: 'caution',
      category: 'Cyber threat',
      date: '3 Nov 2026',
      source: 'NCSC',
      url: 'https://www.ncsc.gov.uk/collection/annual-review-2026/understanding-threat/ai-impact-cyber-threat',
      image: 'https://www.ncsc.gov.uk/sites/default/files/styles/uncropped_lg/public/2026-10/AR26-Chapter-1-impact-ai_0.png?itok=_rJRA_B9',
      title: 'UK cyber agency: AI is speeding up attacks',
      summary: 'Its annual review judges AI almost certain to act as a force multiplier, helping attackers work faster and at greater scale.'
    }
  ]
};
