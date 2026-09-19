# Client Utils — Slash Command API Guide

`dev.everestmcarthur.client-utils` provides a client-side slash command engine for Revenge. Third-party plugins can declare `Client Utils` as a dependency to register custom slash commands directly into Discord's native slash command autocomplete picker.

---

## 1. Add Client Utils as a Dependency

In your plugin's `manifest.json`, declare `dev.everestmcarthur.client-utils` under `dependencies`:

```json
{
  "format": 1,
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "dependencies": {
    "revenge.api": {
      "version": ">=1 <2"
    },
    "discord": {
      "version": "*"
    },
    "dev.everestmcarthur.client-utils": {
      "version": ">=1.0.0"
    }
  },
  "dist": {
    "script": "index.js"
  }
}
```

---

## 2. Access the Client Utils API

Client Utils exposes its API globally through `revenge.plugins.clientUtils` as well as `(globalThis as any).__c_utils`:

```typescript
const clientUtils = (revenge as any)?.plugins?.clientUtils ?? (globalThis as any).__c_utils
```

### API Methods:
- `clientUtils.registerCommand(commandDef, pluginMeta?)`: Register a new slash command.
- `clientUtils.unregisterCommand(commandName)`: Unregister a command by name.
- `clientUtils.getCommands()`: Returns an array of all registered commands.
- `clientUtils.sendReply(channelId, replyOptions)`: Helper to send an ephemeral or public message.

---

## 3. Registering a Slash Command

Register commands inside your plugin's `start` lifecycle. Be sure to unregister them in `cleanup` so commands are removed cleanly when your plugin is disabled or reloaded.

```typescript
import { plugin } from 'revenge.api'

export default plugin({
  start({ cleanup, logger }) {
    const clientUtils = (revenge as any)?.plugins?.clientUtils ?? (globalThis as any).__c_utils

    if (!clientUtils) {
      logger.error('Client Utils is not loaded!')
      return
    }

    clientUtils.registerCommand(
      {
        name: 'hello',
        displayName: 'hello',
        description: 'Says hello to someone!',
        options: [
          {
            type: 6, // User
            name: 'user',
            displayName: 'user',
            description: 'The user to greet',
            required: false,
          },
          {
            type: 3, // String
            name: 'ephemeral',
            displayName: 'ephemeral',
            description: 'Show response only to you (default: yes)',
            required: false,
            choices: [
              { name: 'yes', displayName: 'Yes', value: 'yes' },
              { name: 'no', displayName: 'No', value: 'no' },
            ],
          },
        ],
        execute: async (args: any, ctx: any) => {
          const isEphemeral = args.ephemeral !== 'no'
          const target = args.user ? (ctx.getUser?.(args.user?.id || args.user) || ctx.currentUser) : ctx.currentUser
          const targetName = target?.globalName || target?.username || 'friend'

          ctx.reply({
            ephemeral: isEphemeral,
            content: `👋 Hello, **${targetName}**!`,
          })
        },
      },
      // Optional: Custom section metadata to group your commands in Discord's picker
      {
        id: 'com.example.my-plugin',
        name: 'My Plugin',
        description: 'Commands provided by My Plugin',
      }
    )

    cleanup(() => {
      clientUtils.unregisterCommand('hello')
    })
  },
})
```

---

## 4. Command Options Reference

Discord option types:
| Type ID | Type | Description |
|---|---|---|
| `3` | `STRING` | Text string (supports `choices`) |
| `4` | `INTEGER` | Whole numbers |
| `5` | `BOOLEAN` | True or False toggle |
| `6` | `USER` | User picker |
| `7` | `CHANNEL` | Channel picker |
| `8` | `ROLE` | Role picker |
| `9` | `MENTIONABLE` | User or role |
| `10` | `NUMBER` | Floating point number |

### Option Schema:
```typescript
{
  type: 3,
  name: 'format',
  displayName: 'format',
  description: 'Choose output format',
  required: false,
  choices: [
    { name: 'compact', displayName: 'Compact', value: 'compact' },
    { name: 'detailed', displayName: 'Detailed', value: 'detailed' }
  ]
}
```

---

## 5. Execution Context (`ctx`) & Replying

The `execute` function receives `(args, ctx)`:
- `args`: Key-value object of parsed options passed by the user (e.g., `args.user`, `args.format`).
- `ctx`:
  - `ctx.channelId`: ID of the channel where the command was run.
  - `ctx.channel`: Discord channel record.
  - `ctx.currentUser`: Current logged-in user record.
  - `ctx.reply(options)`: Helper to reply to the command.

### `ctx.reply(options)` Options:

```typescript
ctx.reply({
  // true = only visible to local user (client-side ephemeral message)
  // false = sends as an actual message to the channel for everyone to see
  ephemeral: true,

  // Text content
  content: 'Here is your result:',

  // Optional: Bot author name override for ephemeral messages
  authorName: 'My Plugin Bot',

  // Optional image attachment
  imageUrl: 'https://example.com/photo.png',

  // Rich embed (supported in both ephemeral and standard modes)
  embed: {
    type: 'rich',
    title: 'Command Result',
    description: 'Detailed explanation of what happened.',
    color: 0x5865F2, // Discord Blurple
    fields: [
      { name: 'Status', value: 'Online', inline: true },
      { name: 'Latency', value: '24ms', inline: true },
    ],
    footer: {
      text: 'Powered by Client Utils',
    },
  },
})
```

---

## 6. Full Minimal Plugin Example

```typescript
import { plugin } from 'revenge.api'

export default plugin({
  start({ cleanup, logger }) {
    const clientUtils = (revenge as any)?.plugins?.clientUtils ?? (globalThis as any).__c_utils
    if (!clientUtils) return

    clientUtils.registerCommand(
      {
        name: 'ping',
        description: 'Check bot and client status',
        execute: async (args: any, ctx: any) => {
          ctx.reply({
            ephemeral: true,
            embed: {
              type: 'rich',
              title: 'Pong! 🏓',
              description: `Client is responsive in <#${ctx.channelId}>.`,
              color: 0x57F287,
            },
          })
        },
      },
      {
        id: 'com.example.pingplugin',
        name: 'Ping Plugin',
      }
    )

    cleanup(() => {
      clientUtils.unregisterCommand('ping')
    })
  },
})
```
