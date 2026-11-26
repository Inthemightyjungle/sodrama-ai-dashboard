/*
  The approved AI tools, shown under "Approved tools".

  Built on 26 Nov 2026 from the AI Tool Register (the declarations staff make
  with the AI tool form). Each tool appears once, however many people declared
  it. Never put anyone's name or email address here: this file is public.

  "groups" sets the order and names of the groups on the page.

  Each tool:
  - "id"     lowercase words joined by hyphens; the icon is saved under this name
  - "name"   the tool's full name
  - "by"     the company behind it, when that is not obvious from the name (optional)
  - "for"    what it is for, in a few plain words
  - "group"  the id of one of the groups
  - "use"    how it is used in the register: "company" (on a company licence),
             "personal" (on someone's own account) or "both"
  - "site"   the tool's own website; its icon is copied from there (optional)
  - "icon"   the address of a better picture to use as the icon (optional)

  Icons are copied into the site by tools/tool_icons.py, which GitHub runs
  whenever this file changes (.github/workflows/tool-icons.yml).

  This is strict JSON inside window.SD_TOOLS = …; (double quotes, no comments
  inside, no trailing commas). Check it with: python3 tools/check_tools.py
*/
window.SD_TOOLS = {
  "checked": "2026-11-26",
  "groups": [
    {"id": "chat", "name": "Chat and research"},
    {"id": "images", "name": "Images and design"},
    {"id": "video", "name": "Video"},
    {"id": "voice", "name": "Voice and audio"},
    {"id": "build", "name": "Building with AI"}
  ],
  "tools": [
    {"id": "chatgpt", "name": "ChatGPT", "by": "OpenAI", "for": "Chat assistant for writing, research and ideas", "group": "chat", "use": "both", "site": "https://chatgpt.com/"},
    {"id": "claude", "name": "Claude", "by": "Anthropic", "for": "Chat assistant for writing, research and building tools", "group": "chat", "use": "both", "site": "https://claude.ai/"},
    {"id": "microsoft-copilot", "name": "Microsoft Copilot", "for": "Chat assistant, also built into Microsoft 365 apps", "group": "chat", "use": "both", "site": "https://copilot.microsoft.com/"},
    {"id": "gemini", "name": "Gemini", "by": "Google", "for": "Chat assistant for writing, research and images", "group": "chat", "use": "personal", "site": "https://gemini.google.com/"},
    {"id": "perplexity", "name": "Perplexity", "for": "Research answers with their sources", "group": "chat", "use": "personal", "site": "https://www.perplexity.ai/"},
    {"id": "deepseek", "name": "DeepSeek", "for": "Chat assistant and AI models", "group": "chat", "use": "personal", "site": "https://www.deepseek.com/"},
    {"id": "qwen", "name": "Qwen", "by": "Alibaba", "for": "Chat assistant and AI models", "group": "chat", "use": "personal", "site": "https://chat.qwen.ai/"},

    {"id": "adobe-firefly", "name": "Adobe Firefly", "for": "AI images and edits in Adobe Creative Cloud apps", "group": "images", "use": "company", "site": "https://firefly.adobe.com/"},
    {"id": "magnific", "name": "Magnific", "for": "Image upscaling, AI images and stock (formerly Freepik)", "group": "images", "use": "company", "site": "https://www.magnific.com/"},
    {"id": "midjourney", "name": "Midjourney", "for": "Image generation", "group": "images", "use": "personal", "site": "https://www.midjourney.com/"},
    {"id": "beautiful-ai", "name": "Beautiful.ai", "for": "Presentations designed with AI", "group": "images", "use": "personal", "site": "https://www.beautiful.ai/"},

    {"id": "higgsfield", "name": "Higgsfield AI", "for": "Image and video generation", "group": "video", "use": "both", "site": "https://higgsfield.ai/"},
    {"id": "lumina", "name": "Lumina AI", "by": "BytePlus", "for": "All-in-one image and video studio", "group": "video", "use": "company", "site": "https://ai.byteplus.com/lumina/"},
    {"id": "wonderclip", "name": "WonderClip", "by": "Alibaba Cloud", "for": "Video creation from script to final cut", "group": "video", "use": "company", "site": "https://www.wonderclip.ai/"},
    {"id": "runway", "name": "Runway", "for": "Video generation and editing", "group": "video", "use": "personal", "site": "https://runwayml.com/"},
    {"id": "beeble", "name": "Beeble", "for": "Relighting video footage for VFX", "group": "video", "use": "personal", "site": "https://beeble.ai/"},

    {"id": "elevenlabs", "name": "ElevenLabs", "for": "Voice generation, voice changing and cloning", "group": "voice", "use": "personal", "site": "https://elevenlabs.io/"},

    {"id": "alibaba-cloud-api", "name": "Alibaba Cloud API", "for": "AI models for building agents, paid by credits", "group": "build", "use": "company", "site": "https://www.alibabacloud.com/"},
    {"id": "google-ai-studio", "name": "Google AI Studio", "by": "Google", "for": "Try Google's AI models and build with them", "group": "build", "use": "personal", "site": "https://aistudio.google.com/"}
  ]
};
