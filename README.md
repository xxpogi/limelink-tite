# LimeLink Skript Scripts Library

A curated collection of production-quality [Skript](https://github.com/SkriptLang/Skript) scripts for Minecraft Paper/Folia servers — built to enhance vanilla survival gameplay with zero client-side mods required.

---

## Projects

| Folder | Description | Addon Required |
|--------|-------------|----------------|
| [`smart-inventory-restock`](./smart-inventory-restock/) | Auto-restocks the active hotbar slot, adds a per-player toggle GUI, and sorts the main inventory on button click | skript-reflect, skript-gui |
| [`survival-idea-board`](./survival-idea-board/) | Gives players random survival build/progression ideas and allows admins to add more ideas in-game | None |
| [`sleep-vote-lite`](./sleep-vote-lite/) | Skips night when enough players are sleeping, with simple vote progress broadcasts | None |
| [`welcome-guide-book`](./welcome-guide-book/) | Adds a `/guide` command with practical survival starter tips and first-join reminder | None |
| [`auto-replant-lite`](./auto-replant-lite/) | Replants common crops automatically after harvesting (sneak to disable) | None |
| [`backpack-lite`](./backpack-lite/) | Adds a simple persistent personal backpack inventory via command | None |
| [`chunk-reminder-lite`](./chunk-reminder-lite/) | Saves current chunk coordinates and lets players check them later | None |
| [`daily-kit-lite`](./daily-kit-lite/) | Gives a basic once-per-day survival supply kit | None |
| [`death-coords-lite`](./death-coords-lite/) | Saves and shows the player's latest death coordinates | None |
| [`homes-lite`](./homes-lite/) | Lightweight named home set/teleport commands | None |
| [`treecap-lite`](./treecap-lite/) | Breaks nearby same-type logs for faster tree chopping | None |

---

## Quick Start

1. **Install [Paper](https://papermc.io/) or [Folia](https://papermc.io/software/folia)** (1.20.1 or newer recommended).
2. **Install [Skript](https://github.com/SkriptLang/Skript/releases)** — drop `Skript.jar` into your `plugins/` folder.
3. **Install any addons** listed in the project's Requirements table (e.g. `skript-reflect.jar`, `skript-gui.jar`).
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
skript-scripts-library/  # (suggested repository name)
└── <project-name>/
    ├── README.md        ← installation guide, dependencies, configuration
    └── <project>.sk     ← the Skript script file
```

One folder per project. Every folder is self-contained — you only copy the files you need.

---

## Compatibility

All scripts target **Paper/Folia 1.20–1.21** unless noted otherwise in the project README. Spigot may work for scripts that don't use Paper-specific APIs, but is not officially tested.

---

## Contributing

Pull requests are welcome. Please follow the existing structure:

- One folder per project.
- A `README.md` inside the folder covering: description, requirements, installation, configuration, and known limitations.
- A single `.sk` file named after the project.
- Scripts must not grant any combat, resource, or economy advantage beyond their documented purpose.
