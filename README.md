# LPIO

A login-gated project hub: dashboard, API reference material and
prototypes, organised as modules around a central dashboard.

This repository holds the static shell (structure, styling and rendering
logic). All content and accounts live in a Supabase backend protected by
Row Level Security.

It is also the governance layer for the roadmap and knowledge system that
content sits in. The roadmap, the platform knowledge base and the typed
links between them are data, edited by an AI assistant with database
access rather than through a UI - so the rules that keep that data
trustworthy have to live somewhere, and they live here: the intake
protocol, the link vocabulary, the confidence bands, and the mechanical
gates in tests/checks/ that stop any of them drifting. The repo cannot
change the content, but it defines how the content may be changed.

- Setup and day-to-day use: docs/SETUP.md
- Architecture: docs/ARCHITECTURE.md
- Security model: docs/SECURITY.md
- Why the knowledge model is shaped as it is: docs/KNOWLEDGE-MODEL.md
- Roadmap: docs/ROADMAP-PLAYBOOK.md (model), docs/ROADMAP-INTAKE.md
  (placing new work), docs/ROADMAP-REVIEW.md (the review ritual)
- File map (generated): docs/CODEMAP.md

Working in this repo with Claude Code? Read CLAUDE.md first; it is
binding.
