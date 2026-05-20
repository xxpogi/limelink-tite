# LimeLink Skript Library

A curated collection of production-quality [Skript](https://github.com/SkriptLang/Skript) scripts for Minecraft Paper servers — built to enhance vanilla survival gameplay with zero client-side mods required.

---

## Projects

| Folder | Description | Addon Required |
|--------|-------------|----------------|
| [`smart-inventory-restock`](./smart-inventory-restock/) | Auto-restocks the active hotbar slot when items are consumed, broken, or thrown | skript-reflect |

---

## Quick Start

1. **Install [Paper](https://papermc.io/)** (1.20.1 or newer recommended).
2. **Install [Skript](https://github.com/SkriptLang/Skript/releases)** — drop `Skript.jar` into your `plugins/` folder.
3. **Install any addons** listed in the project's Requirements table (e.g. `skript-reflect.jar`).
4. **Start or restart** your server once so Skript generates its folder structure.
5. **Copy the `.sk` file** from the project folder into:
   ```
   plugins/Skript/scripts/
   ```
6. **Reload without a restart:**
   ```
   /skript reload <filename>
   ```

Each project's own `README.md` contains full installation steps, configuration options, and compatibility notes.

---

## Repository Structure

```
limelink-tite/
└── <project-name>/
    ├── README.md        ← installation guide, dependencies, configuration
    └── <project>.sk     ← the Skript script file
```

One folder per project. Every folder is self-contained — you only copy the files you need.

---

## Compatibility

All scripts target **Paper 1.20–1.21** unless noted otherwise in the project README. Spigot may work for scripts that don't use Paper-specific APIs, but is not officially tested.

---

## Contributing

Pull requests are welcome. Please follow the existing structure:

- One folder per project.
- A `README.md` inside the folder covering: description, requirements, installation, configuration, and known limitations.
- A single `.sk` file named after the project.
- Scripts must not grant any combat, resource, or economy advantage beyond their documented purpose.
