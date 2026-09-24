# Client Utils — Slash Command API Guide

`dev.everestmcarthur.client-utils` provides a client-side slash command engine and component builder suite for Revenge. Third-party plugins can declare `Client Utils` as a dependency to register custom slash commands directly into Discord's native slash command autocomplete picker and build rich Responses with Embeds, Buttons, Select Menus, and Components V2.

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

### API Methods & Utilities:
- `clientUtils.registerCommand(commandDef, pluginMeta?)`: Register a new slash command.
- `clientUtils.unregisterCommand(commandName)`: Unregister a command by name.
- `clientUtils.getCommands()`: Returns an array of all registered commands.
- `clientUtils.sendReply(channelId, replyOptions, pluginName?, cmdName?, pluginMeta?)`: Helper to send an ephemeral or public message.
- `clientUtils.responseFormatOption`: Pre-made slash command option for `format` (`text`, `embed`, `cv2`).
- `clientUtils.builders`: Object containing builder classes and enums (`EmbedBuilder`, `ButtonBuilder`, `ActionRowBuilder`, `SectionBuilder`, `ContainerBuilder`, `SeparatorBuilder`, `MessageBuilder`, `ComponentType`, `ButtonStyle`, `parseColor`).

---

## 3. Registering a Slash Command

Register commands inside your plugin's `start` lifecycle and remove them in `cleanup`:

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
            type: 6, // User picker
            name: 'user',
            displayName: 'user',
            description: 'The user to greet',
            required: false,
          },
          // Reusable response format option: Text, Embed, or Components V2
          clientUtils.responseFormatOption,
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

          if (args.format === 'embed') {
            const { EmbedBuilder } = clientUtils.builders
            const embed = new EmbedBuilder()
              .setTitle('Greetings!')
              .setDescription(`👋 Hello, **${targetName}**!`)
              .setColor('#5865F2')
              .setTimestamp()

            return ctx.reply({
              ephemeral: isEphemeral,
              embed,
            })
          }

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
        icon: 'https://example.com/icon.png', // Optional icon URL
      }
    )

    cleanup(() => {
      clientUtils.unregisterCommand('hello')
    })
  },
})
```

---

## 4. Option Types Reference

| Type ID | Type          | Description                       |
| ------- | ------------- | --------------------------------- |
| `3`     | `STRING`      | Text string (supports `choices`)  |
| `4`     | `INTEGER`     | Whole numbers                     |
| `5`     | `BOOLEAN`     | True or False toggle              |
| `6`     | `USER`        | User picker                       |
| `7`     | `CHANNEL`     | Channel picker                    |
| `8`     | `ROLE`        | Role picker                       |
| `9`     | `MENTIONABLE` | User or role                      |
| `10`    | `NUMBER`      | Floating point number             |

---

## 5. Execution Context (`ctx`) & Replying

The `execute` function receives `(args, ctx)`:
- `args`: Key-value object of parsed options passed by the user (automatically parsed from all Discord option formats).
- `ctx`:
  - `ctx.channelId`: Current channel ID.
  - `ctx.channel`: Discord channel record.
  - `ctx.guildId`: Current guild ID (if in a server).
  - `ctx.currentUser`: Current logged-in user record.
  - `ctx.reply(options)`: Response helper.

#### `ctx.reply(options)` Reference:
```typescript
ctx.reply({
  // true = only visible to local user (client-side ephemeral message)
  // false = sends as an actual message to the channel
  ephemeral: true,

  content: 'Command output message',

  // Optional: Bot author name and avatar override for ephemeral messages
  authorName: 'My Plugin Bot',
  authorIcon: 'https://example.com/avatar.png',

  // Optional: Image attachment URL
  imageUrl: 'https://example.com/image.png',

  // Single embed or array of embeds (accepts EmbedBuilder or raw object)
  embed: embedBuilderInstance,
  // embeds: [embed1, embed2],

  // Interactive Components (Buttons, Action Rows, Components V2)
  components: [actionRowInstance],
})
```

---

## 6. Component & Embed Builders Reference (`clientUtils.builders`)

Client Utils bundles a Discord.js-style builder library accessible via `clientUtils.builders`:

### `EmbedBuilder`
```typescript
const { EmbedBuilder } = clientUtils.builders

const embed = new EmbedBuilder()
  .setTitle('Server Statistics')
  .setDescription('Current server overview')
  .setColor('#57F287') // Hex string or integer color
  .setAuthor('System', 'https://example.com/sys-icon.png')
  .setThumbnail('https://example.com/thumb.png')
  .setImage('https://example.com/banner.png')
  .addFields(
    { name: 'Online Members', value: '142', inline: true },
    { name: 'Ping', value: '19ms', inline: true },
  )
  .setFooter('Generated via Client Utils', 'https://example.com/bot.png')
  .setTimestamp()
```

### `ButtonBuilder` & `ActionRowBuilder`
```typescript
const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = clientUtils.builders

const linkBtn = new ButtonBuilder()
  .setLabel('Visit Website')
  .setStyle(ButtonStyle.LINK)
  .setUrl('https://example.com')
  .setEmoji('🌐')

const actionRow = new ActionRowBuilder()
  .addComponents(linkBtn)

ctx.reply({
  content: 'Check out our link:',
  components: [actionRow],
})
```

### `ContainerBuilder` & `SectionBuilder` (Components V2)
```typescript
const { ContainerBuilder, SectionBuilder, SeparatorBuilder } = clientUtils.builders

const section = new SectionBuilder()
  .addComponents({
    type: 10, // TEXT_DISPLAY
    content: '**Important Notice:** Scheduled maintenance tonight.',
  })

const container = new ContainerBuilder()
  .setAccentColor('#ED4245')
  .addComponents(section, new SeparatorBuilder().setDivider(true))

ctx.reply({
  components: [container],
})
```
