/*
  The AI tools AAGB has approved, shown under "Approved tools".

  First built on 20 Nov 2026 from CapDev's approved purchase requests
  (buylist, Oct 2025 to Nov 2026). Correct it here when AAGB approves,
  renews or drops a tool, and change "checked" to the day you checked.

  Each tool:
  - "id"    lowercase words joined by hyphens; the icon is saved under this name
  - "name"  the tool's full name, as staff know it
  - "by"    the company behind it, when that is not obvious from the name (optional)
  - "for"   what it is for, in a few plain words
  - "plan"  "annual" (a subscription renewed each year) or "once" (bought one time: credits or a fixed-term licence)
  - "site"  the tool's own website; its icon is copied from there (optional)
  - "icon"  the address of a better picture to use as the icon (optional)

  Icons are copied into the site by tools/tool_icons.py, which GitHub runs
  whenever this file changes (.github/workflows/tool-icons.yml).

  This is strict JSON inside window.SD_TOOLS = …; (double quotes, no comments
  inside, no trailing commas). Check it with: python3 tools/check_tools.py
*/
window.SD_TOOLS = {
  "checked": "2026-11-20",
  "tools": [
    {"id": "chatgpt-pro", "name": "ChatGPT Pro", "by": "OpenAI", "for": "Chat assistant for writing, research and ideas", "plan": "annual", "site": "https://chatgpt.com/"},
    {"id": "claude-max", "name": "Claude Max", "by": "Anthropic", "for": "Chat assistant for writing, research and building tools", "plan": "annual", "site": "https://claude.ai/"},
    {"id": "canva-pro", "name": "Canva Pro", "for": "Design, presentations and AI images", "plan": "annual", "site": "https://www.canva.com/"},
    {"id": "deep-live-cam", "name": "Deep-Live-Cam Ultimate", "for": "Live face swap for video", "plan": "once", "site": "https://deeplivecam.net/"},
    {"id": "dramagic", "name": "Dramagic", "by": "BytePlus", "for": "Short-drama production from script to video, paid by credits", "plan": "once", "site": "https://www.byteplus.com/en"},
    {"id": "elevenlabs", "name": "ElevenLabs Creator", "for": "Voice generation, voice changing and cloning", "plan": "annual", "site": "https://elevenlabs.io/"},
    {"id": "freepik", "name": "Freepik Premium+", "for": "AI images and video, plus stock", "plan": "annual", "site": "https://www.freepik.com/"},
    {"id": "genera-studio", "name": "Genera Studio Pro", "by": "Genera Labs", "for": "Clothing for 3D and MetaHuman characters", "plan": "annual", "site": "https://www.generalabs.app/"},
    {"id": "google-ai-ultra", "name": "Google AI Ultra", "by": "Google", "for": "Images and video with Gemini and Flow", "plan": "annual", "site": "https://gemini.google.com/"},
    {"id": "heygen-pro", "name": "HeyGen Pro", "for": "Videos with AI presenters", "plan": "annual", "site": "https://www.heygen.com/"},
    {"id": "higgsfield", "name": "Higgsfield AI", "for": "Image and video generation", "plan": "annual", "site": "https://higgsfield.ai/"},
    {"id": "lumina", "name": "Lumina AI", "by": "BytePlus", "for": "All-in-one image and video studio", "plan": "annual", "site": "https://ai.byteplus.com/lumina/"},
    {"id": "openrouter", "name": "OpenRouter", "for": "Many AI models in one place, paid by credits", "plan": "once", "site": "https://openrouter.ai/"},
    {"id": "postshot", "name": "Postshot Studio", "by": "Jawset", "for": "3D scenes from photos and video", "plan": "annual", "site": "https://www.jawset.com/"},
    {"id": "realitytransform", "name": "RealityTransform", "by": "SFX Corporation", "for": "Licence for VR and AR experiences", "plan": "once"},
    {"id": "replicate", "name": "Replicate", "for": "AI models run in the cloud, paid by credits", "plan": "once", "site": "https://replicate.com/"},
    {"id": "reve-pro", "name": "Reve Pro", "for": "Image generation and editing", "plan": "annual", "site": "https://reve.com/"},
    {"id": "runpod", "name": "Runpod", "for": "Cloud graphics computers, paid by credits", "plan": "once", "site": "https://www.runpod.io/"},
    {"id": "vgent", "name": "VGENT", "for": "AI storytelling model, paid by credits", "plan": "once"}
  ]
};
