const { assign, push } = require('appache/common')


const COMMAND_PROPERTIES = {
  wrap: {
    type: 'number',
    minimum: 50,
    default: 80,
  },
}
const OPTION_PROPERTIES = {
  positional: {
    type: 'boolean',
    default: false,
  },
  consume: {
    type: 'boolean',
    default: true,
  },
}


module.exports = function modifySchema(schema) {
  schema = assign(schema, 'definitions.command.properties', COMMAND_PROPERTIES)
  schema = assign(schema, 'definitions.option.properties', OPTION_PROPERTIES)
  schema = push(schema, 'definitions.command.properties.inheritableSettings.default', 'wrap')
  return schema
}
