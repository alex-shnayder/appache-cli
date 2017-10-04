const {
  InputError, findByIds, findOneByNames, findDefaultCommand,
} = require('appache/common')


const SHORT_OPTION_FORMAT = /^[a-zA-Z0-9]$/
const CONSUME_BY_TYPE = {
  boolean: false,
}


function tokenizeArgs(args) {
  return args.reduce((results, arg) => {
    let isOption = arg.charAt(0) === '-'

    if (isOption && arg.charAt(1) === '-') {
      let body = arg.substr(2)

      if (body) {
        results.push({ kind: 'option', isLong: true, body, arg })
      } else {
        results.push({ kind: '--', body: arg, arg })
      }
    } else if (isOption) {
      let body = arg.substr(1)

      if (body) {
        body.split('').forEach((body) => {
          results.push({
            kind: 'option',
            isLong: false,
            arg: `-${body}`,
            body,
          })
        })
      }
    } else {
      results.push({ kind: 'value', body: arg, arg })
    }

    return results
  }, [])
}

function extractFromCommandConfig(commandConfig, config) {
  let commands = findByIds(config.commands, commandConfig.commands)
  let options = findByIds(config.options, commandConfig.options)
  let positionalOptions = options.filter((option) => option.positional)
  return { commands, options, positionalOptions }
}

function parseArgs(args, config) {
  let defaultCommand = findDefaultCommand(config)

  if (!defaultCommand) {
    throw new Error('No default command defined')
  }

  let {
    commands, options, positionalOptions,
  } = extractFromCommandConfig(defaultCommand, config)
  let currentResult = {
    fullName: [defaultCommand.name],
    inputName: defaultCommand.name,
    options: [],
  }
  let results = [currentResult]
  let noOptionsMode = false

  args = tokenizeArgs(args)

  for (let i = 0; i < args.length; i++) {
    let { kind, isLong, body, arg } = args[i]

    if (kind === '--') {
      noOptionsMode = true
    } else if (!noOptionsMode && kind === 'option') {
      let eqPos = body.indexOf('=')
      eqPos = eqPos === -1 ? undefined : eqPos
      let name = isLong ? body.substring(0, eqPos) : body
      let value = null

      if (!isLong && !SHORT_OPTION_FORMAT.test(name)) {
        let err = new InputError(
          'Short options may only contain letters and numbers. ' +
          `Found "${name}" in "${arg}"`
        )
        err.command = currentResult
        throw err
      }

      if (!name) {
        let err = new InputError('An option\'s name must not be empty')
        err.command = currentResult
        throw err
      }

      let optionConfig = findOneByNames(options, name)

      if (isLong && eqPos) {
        value = body.substr(eqPos + 1)
      } else if (!isLong && optionConfig) {
        let { consume, type } = optionConfig
        let nextArg = args[i + 1]

        if (typeof consume === 'undefined') {
          consume = CONSUME_BY_TYPE[type]
        }

        if (typeof consume === 'undefined') {
          consume = true
        }

        if (consume && nextArg && nextArg.kind === 'value') {
          i++
          value = nextArg.body
        }
      }

      let inputName = arg
      currentResult.options.push({ name, inputName, value })
    } else {
      let command = findOneByNames(commands, body)
      let hasPositionalOptions = Boolean(positionalOptions.length)

      if (command || !hasPositionalOptions) {
        if (command) {
          let params = extractFromCommandConfig(command, config)
          commands = params.commands
          options = params.options
          positionalOptions = params.positionalOptions
        } else {
          commands = []
          options = []
          positionalOptions = []
        }

        let fullName = currentResult.fullName.concat(body)
        currentResult = {
          fullName: fullName,
          inputName: fullName.join(' '),
          options: [],
        }
        results.push(currentResult)
      } else {
        let optionConfig = positionalOptions.shift()

        currentResult.options.push({
          name: optionConfig.name,
          inputName: optionConfig.name,
          value: body,
        })
      }
    }
  }

  return results
}

module.exports = parseArgs
