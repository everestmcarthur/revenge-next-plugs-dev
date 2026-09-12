# Revenge Next Plugins

A premier collection of high-performance, modular plugins for **Discord Android** built on the **Revenge Next** framework. 

Designed specifically for Discord's modern mobile redesign, this repository delivers enhanced navigation, power-user utilities, intelligent notification management, and deep visual customization — combining native Android Kotlin runtimes with React Native TypeScript patches.

---

## 📦 Featured Plugins

| Plugin | ID | Language | Description |
| :--- | :--- | :--- | :--- |
| **BetterInbox** | `dev.everestmcarthur.better-inbox` | TS / React Native | Advanced notification management center with categorized tabs, sub-filters, quick action menus, in-app banner blocking, and YouBar+ integration. |
| **YouBar+** | `dev.everestmcarthur.you-bar-plus` | Kotlin + TS | Complete customization for the bottom navigation bar with Direct Messages, Settings shortcuts, position swapping, compacting, and server list decluttering. |
| **Split Messages** | `dev.everestmcarthur.split-messages` | TS / React Native | Automatically splits messages exceeding Discord's character limit (2,000 / 4,000) into seamless sequential messages. |
| **More Alts!** | `dev.everestmcarthur.more-alts` | TS / React Native | Manage multiple Discord accounts and unlock Discord's native multi-account switcher sheet. |
| **Staff Tags** | `dev.everestmcarthur.staff-tags` | TS / React Native | Adds customizable permission badges (OWNER, ADMIN, STAFF, MOD) next to members in chat and member lists. |
| **Radial Status** | `dev.everestmcarthur.radial-status` | Kotlin + TS | Replaces standard avatar presence dots with customizable colored radial rings with thickness controls. |
| **Themeify** | `dev.everest.themeify` | TS / React Native | Native redesign theme manager with custom color palettes and styling. |
| **Everest Library** | `dev.everestmcarthur.lib` | Kotlin + TS | Shared utility modules, Discord finders, navigators, and native helpers for Everest plugins. |

---

## 🌟 Highlight: BetterInbox

**BetterInbox** completely revamps how you interact with notifications on Discord Android. Instead of an unorganized stream of alerts, BetterInbox captures incoming events via Discord's internal Flux Dispatcher and categorizes them into dedicated, interactive feeds.

### ✨ Key Features

- **Categorized Inbox Feeds**:
  - 🔔 **Mentions**: Filter by **People**, **Roles**, or **Bots** to cut through noise during server raids or high-traffic announcements.
  - 💬 **Replies**: Isolate direct replies to your messages across all guilds and direct messages.
  - ❤️ **Reactions**: Track emoji reactions placed on your messages in real time.
  - 👥 **Friend Requests**: View incoming friend requests and accepted requests in one unified feed.
  - 🧵 **Threads**: Track thread additions and thread member updates without losing context.
  - ⚡ **Friend Activity**: Optional tracking of status and activity changes from your close friends.
- **Interactive Action Sheet & Context Menu**:
  - Long-press any notification card (or tap the `···` options button) to open the native bottom sheet:
    - **Jump to Channel / Message**: Instantly transitions navigation straight to the referenced channel and message.
    - **Jump to Server**: Opens the server home view directly.
    - **View User Profile**: Opens the native Discord user profile modal.
    - **Quick Copying**: One-tap copy for **User ID**, **Message ID**, **Channel ID**, **Server ID**, and **Message Content** with instant toast feedback.
    - **Remove from Inbox**: Dismiss individual notifications cleanly.
- **In-App Heads-Up Banner Blocker**:
  - Suppress intrusive in-app notification toasts and sound alerts while actively using Discord. Notifications continue to be recorded cleanly in your BetterInbox without interrupting your flow.
- **100% Seamless YouBar+ Compatibility**:
  - When used alongside **YouBar+**, BetterInbox automatically replaces the YouBar notification bell action without conflicting with YouBar+'s DM button, Settings button, button reordering, or compacting modes.

---

## 🧭 Highlight: YouBar+

Customize Discord Android's bottom navigation bar ("YouBar"):

- **Direct Messages Shortcut**: Adds a dedicated DM button directly into your bottom bar. Includes an intelligent **Double-Tap Return** feature: double-tap the DM icon while in direct messages to immediately jump back to your previously active server and channel.
- **User Settings Shortcut**: One-tap access to your account and Discord settings.
- **Custom Button Ordering**: Arrange your buttons in any order (`Left`, `Middle`, `Right`) with interactive position swapping in the plugin settings.
- **Declutter Server List**: Toggle **Hide Built-in DM Button** to remove Discord's duplicate top direct message button in the guild drawer.
- **Compacting Modes**: Shrink your profile avatar, hide presence status text on the YouBar pill, and reduce vertical bar padding for maximum chat screen real estate.

---

## 🚀 Installation

### In Revenge Next (Android)

1. Open Discord and go to **User Settings** -> **Revenge** -> **Plugins**.
2. Tap the **Repositories** tab (or **Add Repository**).
3. Add the official repository URL:
   ```
   https://next.jarviscli.dev
   ```
4. Switch to the **Browse** tab to search, install, and update plugins with one tap.

---

## 🛠️ Architecture & Tech Stack

Revenge Next plugins follow a hybrid architecture:

```
plugins/
├── better-inbox/              # JS-only React Native plugin
│   ├── manifest.json          # Plugin metadata & dependencies
│   └── js/                    # TypeScript source (compiled to index.js)
│       ├── index.ts           # Plugin lifecycle (start, cleanup, storage)
│       ├── lib/               # Flux tracker, navigation router, data models
│       ├── patches/           # YouBar integration & in-app banner interception
│       └── ui/                # Notification center, cards, context menu, settings
├── you-bar-plus/              # Hybrid Native Kotlin + React Native plugin
│   ├── manifest.json
│   ├── src/main/kotlin/       # Native DEX JAR (runs early before JS bundle)
│   └── js/                    # React Native UI & Metro button hook
└── shared/
    └── discord-modules.ts     # Automated Discord Metro module ID dictionary
```

- **Android Native (Kotlin)**: Pre-compiled to DEX bytecode (`plugin.jar`) loaded by `DexClassLoader`. Executes before JS initialization for early native hooks and background tasks.
- **JavaScript / React Native (TypeScript)**: Hermes-optimized bundles (`index.js`) using Revenge's `patcher` (`before`, `after`, `instead`), `discord.flux` store integration, React Native components, and Discord's design system.
- **Zero-Dependency Architecture**: Plugins declare only reserved dependencies (`revenge.api` and `discord`) to guarantee reliable startup and prevent dependency cycle deadlocks.

---

## 🔄 Automated Discord Module ID Sync

Discord mobile updates frequently change Metro internal module IDs. To prevent breakage across Discord builds, this repository features an automated synchronization pipeline:

- **`scripts/update-discord-module-ids.mjs`**: Fetches the latest module paths and IDs from [`lvwmwm/decord`](https://github.com/lvwmwm/decord) (`data` branch), updates `plugins/shared/discord-modules.ts`, and automatically bumps the version numbers of dependent plugins.

To sync with the newest Discord release:

```bash
bun scripts/update-discord-module-ids.mjs
```

---

## 💻 Development & Building

### Prerequisites

- **Bun** (v1.2+) or **Node.js** (v22+)
- **JDK 21+** and **Android SDK** (Build-Tools & Platform 35/36)
- Local clone of [`revenge-xposed`](https://github.com/revenge-mod/revenge-xposed) with `./gradlew :api:publishToMavenLocal` (only if building native Kotlin plugins).

### Build Commands

```bash
# Install dependencies
bun install

# Build JavaScript bundles for all plugins
bun run build

# Build a single plugin's JS bundle
bun node_modules/@revenge-mod/plugin-cli/src/main.ts build <plugin-name>

# Build native Kotlin JARs and package all plugin ZIPs
./gradlew packageAllPlugins

# Package a specific plugin
./gradlew packageYouBarPlus
```

### Local Development Server

Test your builds directly on your physical Android device over LAN:

```bash
# Serve dist directory and auto-regenerate repository index
bun node_modules/@revenge-mod/plugin-cli/src/main.ts serve --dist build/dist --port 8080 --host 0.0.0.0 --base-url http://<YOUR_LAN_IP>:8080/
```

Add `http://<YOUR_LAN_IP>:8080/` as a repository in Revenge on your device. Any rebuild will immediately be served to your phone.

---

## 📜 Credits & Acknowledgements

- **[fshinz](https://github.com/fshinz)** — Original author of [BetterInbox](https://github.com/fshinz/Revenge-Plugins/tree/master/plugins/BetterInbox) for Classic Revenge.
- **[Rosie](https://github.com/everestmcarthur)** — Creator and maintainer of the Revenge Next ports and Everest plugin suite.
- **[Kmio (kmmiio99o)](https://github.com/kmmiio99o)** ([kmmiio99o.dev](https://kmmiio99o.dev)) — Creator of the Discord Metro module ID tracking workflow from [`kmmiio-revenge-next-plugins`](https://github.com/kmmiio99o/revenge-next-plugins).
- **[lvwmwm/decord](https://github.com/lvwmwm/decord)** — Maintaining continuous Discord Android Metro module mapping.
- **[Revenge Mod](https://github.com/revenge-mod)** — For the Revenge Next framework and modern mobile modding toolchain.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
