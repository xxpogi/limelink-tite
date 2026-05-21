# Smart Inventory Restock & Auto-Sorting

A quality-of-life Skript for survival servers. Players can open a GUI, enable or disable automatic hotbar restocking, and click a button to sort their main inventory once without touching their hotbar.

---

## Features

- **Per-player GUI toggle** — players can enable or disable auto-restock for themselves.
- **On consume** — eating food or drinking potions can restock the selected hotbar slot.
- **On throw** — thrown splash and lingering potions can be replaced from deeper inventory.
- **On item break** — broken tools can be replaced by matching tools.
- **On block place** — when a building stack runs out, a matching stack can move into the selected hotbar slot.
- **Manual sort button** — sorting only happens when clicked in the GUI.
- **Hotbar-safe sorting** — sorting only touches slots `9-35`; hotbar slots `0-8` are left alone.
- **No duplication** — items are moved or swapped from existing inventory slots only.

---

## Requirements

| Dependency | Minimum Version | Download |
|---|---:|---|
| [Paper](https://papermc.io/) | 1.20.1 | https://papermc.io/downloads |
| [Skript](https://github.com/SkriptLang/Skript) | 2.7.0 | https://github.com/SkriptLang/Skript/releases |
| [skript-reflect](https://github.com/SkriptLang/skript-reflect) | 2.4.0 | https://github.com/SkriptLang/skript-reflect/releases |
| [skript-gui](https://github.com/APickledWalrus/skript-gui) | latest | https://github.com/APickledWalrus/skript-gui/releases |

> **Spigot note:** Spigot may work, but Paper is recommended and is the target platform.

---

## Installation

1. Install Paper, Skript, skript-reflect, and skript-gui.
2. Start or restart the server once so Skript generates `plugins/Skript/scripts/`.
3. Copy `smart-inventory-restock.sk` into:

   ```text
   plugins/Skript/scripts/smart-inventory-restock.sk
   ```

4. Load the script:

   ```mcfunction
   /skript reload smart-inventory-restock
   ```

---

## Command

```mcfunction
/smartinventory
```

Aliases:

```mcfunction
/smartinv
/autorestock
/invsort
```

---

## Permission

```text
limelink.smartinventory
```

Players need this permission to open the GUI.

---

## GUI Actions

### Auto Restock Toggle

The toggle controls only the player who clicks it. Auto-restock is enabled by default unless the player disables it.

### Sort Main Inventory

The sort button sorts the main inventory once when clicked. It:

- reads the raw Bukkit storage array with `PlayerInventory.getStorageContents()`
- collects non-empty stacks from slots `9-35`
- alphabetically sorts them by Bukkit material name
- writes them back into slots `9-35`
- leaves slots `0-8` untouched

It does **not** run automatically after pickup, open, close, combat, movement, or restock events.

---

## Configuration

Open `smart-inventory-restock.sk` and edit the `options:` block:

```skript
options:
    gui-title: &8Smart Inventory
    permission: limelink.smartinventory
    notify-restock: true
    folia-mode: true
```

| Option | Default | Description |
|---|---|---|
| `gui-title` | `&8Smart Inventory` | Chest GUI title. |
| `permission` | `limelink.smartinventory` | Permission required to open the GUI. |
| `notify-restock` | `true` | Sends an action bar message after an automatic restock. |
| `folia-mode` | `true` | Uses delayed restock scheduling that works cleanly on Folia/Paper tick schedulers. |

Reload after changes:

```mcfunction
/skript reload smart-inventory-restock
```

---

## How Restocking Works

1. The script listens to Bukkit events through skript-reflect: `PlayerItemConsumeEvent`, `ProjectileLaunchEvent`, `PlayerItemBreakEvent`, and `BlockPlaceEvent`.
2. It waits 1 tick so the server has already consumed, thrown, broken, or placed the item.
3. It reads the player inventory with `PlayerInventory.getStorageContents()`.
4. It checks the selected hotbar slot. If that slot still contains a matching item, nothing happens.
5. It searches deeper inventory slots `9-35` for a matching stack.
6. It swaps that stack into the selected hotbar slot and sends a clean `updateInventory()` packet.

Matching uses Bukkit `ItemStack#isSimilar()` after normalizing durability damage. That keeps item type, custom name, lore, enchantments, potion metadata, and persistent item meta protected while still allowing a broken tool to be replaced by the same tool with different remaining durability.

---

## Survival Balance

This script provides quality-of-life only:

- no items are created
- no items are pulled from containers, shulkers, ender chests, or backpacks
- no automatic inventory sorting unless the GUI sort button is clicked
- no hotbar sorting ever
- no resource or combat advantage beyond removing inventory micro-management

---

## Stored Data

The script stores one Skript variable per player for the toggle:

```text
{limelink.smart_inventory.enabled::<player uuid>}
```

Delete those variables if you want every player reset to the default enabled state.

---

## Uninstallation

Delete `smart-inventory-restock.sk` from `plugins/Skript/scripts/` and run:

```mcfunction
/skript reload all
```


---

## Folia Compatibility

This script supports Folia by running restock logic one tick later with delayed scheduling (`run 1 tick later`) when `folia-mode` is enabled (default). This avoids same-tick inventory race conditions on both Paper and Folia.
