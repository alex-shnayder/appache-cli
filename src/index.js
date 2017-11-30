const chalk = require('chalk')
const { fork, toot, tootWith, preHook } = require('appache/effects')
const {
  findRootCommands, findCommandByFullName, getCommandFromEvent, populateCommand,
  InputError, Result, Help,
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

function handleResult(value, config) {
  let wrap

  if (value instanceof Result) {
    let { command } = value
    let { config: commandConfig, inputName } = command || {}

    if (value instanceof Help) {
      if (config && commandConfig) {
        commandConfig = populateCommand(config, commandConfig)
        value = composeHelp(commandConfig, inputName)
      } else {
        value = `Help is unavailable for ${inputName}`
      }
    } else {
      value = value.value
      wrap = commandConfig && commandConfig.wrap
    }
  }

  if (typeof value !== 'undefined') {
    print(value, wrap)
  }
}

function handleError(err, config, event) {
  if (!(err instanceof InputError)) {
    return print(err, 'error')
  }

  let errText = chalk.red(err.message)
  let commandConfig, commandName

  if (err.command) {
    commandConfig = err.command.config
    commandName = err.command.inputName
  } else if (event) {
    let command = getCommandFromEvent(event)

    if (command && command.config) {
      commandName = command.inputName
      commandConfig = command.config
    } else if (command) {
      let parentName = command.fullName.slice(0, -1)
      commandConfig = findCommandByFullName(config, parentName, true)
      commandName = parentName.join(' ')
    }
  } else if (config) {
    commandConfig = findRootCommands(config, true)[0]
  }

  if (commandConfig) {
    commandConfig = populateCommand(config, commandConfig)
    errText = `${wrap(errText, commandConfig.wrap)}\n\n`
    errText += composeHelp(commandConfig, commandName)
  }

  print(errText, 'error')
}

module.exports = function* cli() {
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
        let batch = parseArgs(args, config)
        let result = yield yield toot('execute', batch)
        handleResult(result, config)
      } catch (err) {
        yield tootWith('error', (config, err, event) => {
          return handleError(err, config, event)
        }, err)
      }
    })
  })
}

module.exports.composeHelp = composeHelp
module.exports.print = print
module.exports.handleResult = handleResult
module.exports.handleError = handleError
module.exports.interface = ['cli']
module.exports.tags = ['interface', 'cli']
