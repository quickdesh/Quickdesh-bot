const DiscordCommand = require('../../contracts/DiscordCommand')

const { version } = require('../../../package.json')

function chunkLines(title, lines) {
  const fields = []
  let current = []
  let length = 0

  for (const line of lines) {
    if (current.length && length + line.length + 1 > 1024) {
      fields.push(current)
      current = []
      length = 0
    }
    current.push(line)
    length += line.length + 1
  }
  if (current.length) fields.push(current)

  return fields.map((group, i) => ({ name: i === 0 ? title : '​', value: group.join('\n') }))
}

class HelpCommand extends DiscordCommand {
  constructor(discord) {
    super(discord)

    this.name = 'help'
    this.aliases = ['h', 'info']
    this.description = 'Shows this help menu. `help <command>` shows full details for one command'
    this.isAdminCommand = false
  }

  help(prefix) {
    return {
      usage: `${prefix}help [command]`,
      sections: [
        {
          name: 'How it works',
          lines: [
            `\`${prefix}help\` lists every command.`,
            `\`${prefix}help <command>\` shows usage, options and examples for one command. Aliases work too, e.g. \`${prefix}help al\`.`
          ]
        }
      ],
      examples: [`${prefix}help`, `${prefix}help activelist`]
    }
  }

  onCommand(message) {
    const prefix = this.discord.app.config.discord.prefix
    const commands = this.discord.messageHandler.command.commands
    const query = this.getArgs(message)[0]?.toLowerCase().replace(prefix, '')

    if (query) {
      const command = commands.get(query) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(query))

      if (!command) {
        message.channel.send({ embeds: [{ color: 0xDC143C, description: `There's no command called \`${query}\`. Type \`${prefix}help\` to see them all.` }] })
        return
      }

      message.channel.send({ embeds: [this.commandEmbed(command, prefix)] })
      return
    }

    const line = command => {
      const aliases = command.aliases?.length ? ` (${command.aliases.map(a => `\`${a}\``).join(', ')})` : ''
      return `\`${prefix}${command.name}\`${aliases}: ${command.description}`
    }
    const everyone = [...commands.values()].filter(command => !command.isAdminCommand).map(line)
    const commanders = [...commands.values()].filter(command => command.isAdminCommand).map(line)

    message.channel.send({
      embeds: [
        {
          title: 'Help',
          description: [
            '`< >` = Required arguments',
            '`[ ]` = Optional arguments',
            '',
            `Type \`${prefix}help <command>\` for full details, options and examples.`
          ].join('\n'),
          fields: [
            ...chunkLines('Commands', everyone),
            ...(commanders.length ? chunkLines('Commander Commands', commanders) : []),
            {
              name: `Info`,
              value: [
                `Prefix: \`${prefix}\``,
                `Guild Channel: <#${this.discord.app.config.discord.gcchannel}>`,
                `Officer Channel: <#${this.discord.app.config.discord.occhannel}>`,
                `Version: \`${version}\``
              ].join('\n'),
            }
          ],
          color: 0xFFFFFF,
          footer: {
            text: 'Made by Quickdev/Indian'
          },
          timestamp: new Date()
        }
      ]
    })
  }

  commandEmbed(command, prefix) {
    const help = typeof command.help === 'function' ? command.help(prefix) : null
    const fields = []

    fields.push({ name: 'Usage', value: `\`${help?.usage ?? `${prefix}${command.name}`}\`` })

    if (command.aliases?.length) {
      fields.push({ name: 'Aliases', value: command.aliases.map(a => `\`${prefix}${a}\``).join(', '), inline: true })
    }

    fields.push({ name: 'Who can use it', value: command.isAdminCommand ? 'Commanders and the owner' : 'Everyone', inline: true })

    for (const section of help?.sections ?? []) {
      fields.push(...chunkLines(section.name, section.lines))
    }

    if (help?.examples?.length) {
      fields.push(...chunkLines('Examples', help.examples.map(e => `\`${e}\``)))
    }

    return {
      title: `${prefix}${command.name}`,
      description: command.description,
      fields,
      color: 0xFFFFFF,
      footer: { text: `Type ${prefix}help to see every command` },
      timestamp: new Date()
    }
  }
}

module.exports = HelpCommand

/**const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show the Help menu')}**/
