const chalk = require('chalk')
const {
  findRootCommands, findCommandByFullName, getCommandFromEvent,
  populateCommand, InputError, Result, Help,
} = require('appache/common')
const { wrap } = require('./utils')
const composeHelp = require('./help')


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


module.exports = { print, handleResult, handleError }
