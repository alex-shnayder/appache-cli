const { wrap: wrapText, formatColumns } = require('./utils')


const PADDING = 2
const DEFAULT_COLUMNS_CONFIG = {
  padding: PADDING,
  columnWidths: [30],
}


let texts = {}

function makeUsageText(commandConfig, commandName) {
  let { options, commands, description, wrap } = commandConfig
  let text = commandName

  if (options && options.length) {
    text += ' [options]'

    options.forEach(({ name, positional, required }) => {
      if (positional) {
        text += required ? ` <${name}>` : ` [${name}]`
      }
    })
  }

  if (commands && commands.length) {
    text += ' [command]'
  }

  text = `Usage:\n${wrapText(text, wrap, PADDING)}`

  if (description) {
    text = `${wrapText(description, wrap)}\n\n${text}`
  }

  return text
}

function makeCommandsText(commandConfig, commands) {
  let rows = commands.map((command) => {
    let { name, aliases, description } = command
    let names = aliases ? [name].concat(aliases) : [name]
    return [names.join(', '), description || '']
  })
  let lineWidth = commandConfig.wrap
  let columnsConfig = Object.assign({}, DEFAULT_COLUMNS_CONFIG, { lineWidth })
  let rowsText = formatColumns(rows, columnsConfig)

  return `Commands:\n${rowsText}`
}

function makeOptionsText(commandConfig, options) {
  let rows = options
    .sort((option) => {
      return option.isHelpOption ? 1 : 0
    })
    .map((option) => {
      let { name, aliases, description } = option
      let names = aliases ? [name].concat(aliases) : [name]

      let namesText = names
        .sort((a, b) => a.length - b.length)
        .map((name) => {
          return (name.length === 1) ? `-${name}` : `--${name}`
        })
        .join(', ')

      return [namesText, description]
    })

  let lineWidth = commandConfig.wrap
  let columnsConfig = Object.assign({}, DEFAULT_COLUMNS_CONFIG, { lineWidth })
  let rowsText = formatColumns(rows, columnsConfig)
  return `Options:\n${rowsText}`
}


module.exports = function composeHelp(commandConfig, commandName) {
  commandName = commandName || commandConfig.name

  if (texts[commandConfig.id]) {
    return texts[commandConfig.id]
  }

  let { options, commands } = commandConfig
  let text = makeUsageText(commandConfig, commandName)

  if (commands && commands.length) {
    text += `\n\n${makeCommandsText(commandConfig, commands)}`
  }

  if (options && options.length) {
    text += `\n\n${makeOptionsText(commandConfig, options)}`
  }

  texts[commandConfig.id] = text
  return text
}
