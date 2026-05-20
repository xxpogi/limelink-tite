# Smart Inventory Restock & Auto-Sorting

A quality-of-life Skript that eliminates hotbar micro-management during building, terraforming, and survival play. When you consume food or potions, throw a splash/lingering potion, or break a tool from durability, the script instantly moves a matching item from your deeper inventory into your active hand — no manual digging required.

---

## Features

- **On consume** — eating food or drinking potions auto-restocks the hand slot.
- **On item break** — tool runs out of durability? The next matching tool slides in automatically.
- **On throw** — last splash or lingering potion thrown? A fresh one from your inventory replaces it.
- **Priority order** — main inventory (slots 9–35) is always searched before other hotbar slots.
- **Configurable matching** — loose mode (material type only) or strict mode (type + meta/enchants/potion effect).
- **Silent or notified** — optional action bar message when a restock occurs.
- **Zero gameplay advantage** — passive quality-of-life only; no duplication, no combat benefit.

---

## Requirements

| Dependency | Minimum Version | Download |
|---|---|---|
| [Paper](https://papermc.io/) | 1.20.1 | https://papermc.io/downloads |
| [Skript](https://github.com/SkriptLang/Skript) | 2.7.0 | https://github.com/SkriptLang/Skript/releases |
| [skript-reflect](https://github.com/SkriptLang/skript-reflect) | 2.4.0 | https://github.com/SkriptLang/skript-reflect/releases |

> **Spigot note:** Spigot may work, but Paper is required for full event compatibility. Untested on Spigot.

---

## Installation

### Step 1 — Install Paper

Download the Paper jar for your Minecraft version from https://papermc.io/downloads and use it as your server jar.

### Step 2 — Install Skript

1. Download `Skript.jar` from https://github.com/SkriptLang/Skript/releases  
2. Place it in your server's `plugins/` folder.

### Step 3 — Install skript-reflect

1. Download `skript-reflect.jar` from https://github.com/SkriptLang/skript-reflect/releases  
2. Place it in your server's `plugins/` folder.

### Step 4 — First server start

Start (or restart) your server. Skript will generate the `plugins/Skript/scripts/` directory.

### Step 5 — Install the script

Copy `smart-inventory-restock.sk` from this folder into:

```
plugins/Skript/scripts/smart-inventory-restock.sk
```

### Step 6 — Load the script

Run this command in-game or from the server console (no restart needed):

```
/skript reload smart-inventory-restock
```

Skript will confirm the script loaded without errors. If there are errors, check the `options:` block matches your Skript version.

---

## Configuration

Open `smart-inventory-restock.sk` and edit the `options:` block at the top of the file:

```skript
options:
    # true  → match item type AND metadata (enchants, potion type, custom name…)
    # false → match material type only (recommended for tools)
    strict-match: false

    # Show an action bar message when a slot is restocked
    notify-restock: true

    # Also search other hotbar slots (0–8) as a secondary fallback
    # Main inventory (slots 9–35) is always checked first
    search-hotbar: true
```

Reload after any change: `/skript reload smart-inventory-restock`

### Option Reference

| Option | Default | Description |
|---|---|---|
| `strict-match` | `false` | `false` — any diamond pickaxe replaces a broken diamond pickaxe, regardless of enchants. `true` — item metadata must also match (useful for strict potion-type restocking). |
| `notify-restock` | `true` | Displays a subtle action bar message on each restock. Set to `false` for a fully silent experience. |
| `search-hotbar` | `true` | After exhausting slots 9–35, also checks other hotbar slots (0–8, excluding the active slot) as a last resort. |

---

## How It Works

1. **Event capture** — Listens for `on consume:` (food/potions), `on item break:` (tool durability), and `on throw:` (splash/lingering potions).
2. **Post-event check** — Waits 1 server tick (50 ms) for the server to remove the item, then checks if the active hand slot is now empty.
3. **Inventory scan** — Uses `skript-reflect` to call `PlayerInventory.getStorageContents()`, obtaining a direct reference to the raw 36-slot inventory array.
4. **Match & move** — Iterates the array looking for a material-type match (or full meta match in strict mode), then calls `PlayerInventory.setItem()` to atomically swap the item into the hotbar slot and clear the source slot.
5. **No duplication** — The source slot is cleared with `setItem(slot, null)` in the same tick as the hotbar write. No window exists where the item appears in both slots.

---

## Survival Balance

This script provides **zero gameplay advantage**:

- No items are created, duplicated, or modified.
- No combat-speed improvement — it only fires after the item is already gone from the hotbar.
- All inventory changes go through standard Bukkit API calls, so anti-cheat plugins see a normal server-side inventory update.
- Purely a workflow improvement for large-scale builds and terraforming sessions.

---

## Known Limitations

- **Stacked items**: Restock only triggers when the **last** item in a stack is consumed. Eating 1 steak from a stack of 3 leaves 2 behind — no restock needed, and none occurs.
- **Custom durability plugins**: Tools managed by third-party plugins that don't fire the standard `PlayerItemBreakEvent` will not trigger the `on item break:` handler.
- **Potion matching in loose mode**: With `strict-match: false`, *any* splash potion will refill the slot of a thrown splash potion, regardless of potion effect. Enable `strict-match: true` if effect-specific matching is required.
- **Full inventory**: If all 36 slots are already occupied and the target slot has an item (edge case from other plugins), the restock check (`if player's tool is air`) will simply not fire — no data loss occurs.

---

## Uninstallation

Delete `smart-inventory-restock.sk` from `plugins/Skript/scripts/` and run:

```
/skript reload all
```

No data is stored permanently by this script (no variables, files, or database entries).
