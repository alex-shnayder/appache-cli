const chalk = require('chalk')
const { next, hook, fork, toot, tootWith, preHook } = require('appache/effects')
const {
  InputError, findRootCommands, findCommandByFullName, getCommandFromEvent,
} = require('appache/common')
const { wrap } = require('./utils')
const composeHelp = require('./help')
const parseArgs = require('./parseArgs')
const modifySchema = require('./modifySchema')


function print(value, maxWidth, level = 'log') {
  if (typeof maxWidth === 'string') {
    level = maxWidth
    maxWidth = undefined
  }

  if (typeof value === 'string' && maxWidth) {
    value = wrap(value, maxWidth)
  }

  /* eslint-disable no-console */
  console[level]()
  console[level](value)
  console[level]()
}

function handleResult(command, result) {
  if (typeof result !== 'undefined') {
    let maxWidth = command.config && command.config.wrap
    print(result, maxWidth)
  }
}

function handleError(config, err, event) {
  if (!(err instanceof InputError)) {
    return print(err, 'error')
  }

  let commandConfig = findRootCommands(config, true)[0]
  let commandName

  if (err.command) {
    let command = err.command
    let { fullName, inputName } = command
    commandConfig = findCommandByFullName(config, fullName, true)
    commandName = inputName
  } else if (event) {
    let command = getCommandFromEvent(event)

    if (command.config) {
      commandName = command.inputName
      commandConfig = command.config
    } else {
      let parentName = command.fullName.slice(0, -1)
      commandConfig = findCommandByFullName(config, parentName, true)
      commandName = parentName.join(' ')
    }
  }

  let errText = wrap(chalk.red(err.message), commandConfig.wrap)

  if (commandConfig) {
    errText += '\n\n'
    errText += composeHelp(commandConfig, commandName)
  }

  print(errText, 'error')
}

module.exports = function* cliPlugin() {
  yield preHook({
    event: 'schema',
    tags: ['modifyCommandSchema', 'modifyOptionSchema'],
  }, (schema) => {
    schema = modifySchema(schema)
    return [schema]
  })

  yield preHook({
    event: 'activate',
    tags: ['interface'],
  }, function* (config) {
    yield fork('async', function* () {
      let args = process.argv.slice(2)

      try {
        let request = parseArgs(args, config)
        let result = yield yield toot('execute', request)
        let command = request[request.length - 1]
        handleResult(command, result)
      } catch (err) {
        yield tootWith('error', handleError, err)
      }
    })
  })

  yield hook('process', function* (_, command) {
    let { inputName, options, config } = command

    let isHelpAsked = options && options.some((option) => {
      return option.config && option.config.isHelpOption
    })

    if (!isHelpAsked) {
      return yield next(_, command)
    }

    if (config) {
      if (typeof config.help === 'string') {
        return config.help
      } else {
        return composeHelp(config, inputName)
      }
    }

    return `Help is unavailable for "${inputName}"`
  })
}

module.exports.interface = ['cli']
module.exports.tags = ['interface', 'cli']
