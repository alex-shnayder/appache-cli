const columnify = require('columnify')
const getStringWidth = require('columnify/width')
const { splitIntoLines } = require('columnify/utils')


const DEFAULT_CONFIG = {
  lineWidth: 80,
  padding: 0,
  gap: 4,
}


function wrap(string, width, padding) {
  width = Math.min(width || DEFAULT_CONFIG.lineWidth, process.stdout.columns)
  padding = (typeof padding === 'undefined') ? DEFAULT_CONFIG.padding : padding
  return splitIntoLines(string, width)
    .map((line) => ' '.repeat(padding) + line)
    .join('\n')
}

function formatColumns(rows, config) {
  config = config ? Object.assign({}, DEFAULT_CONFIG, config) : DEFAULT_CONFIG

  let { gap, padding, lineWidth } = config
  let columnifyConfig = {
    showHeaders: false,
    config: {},
    columnSplitter: ' '.repeat(gap),
  }
  let columnWidths = config.columnWidths || []
  let actualColumnWidths = []
  let colNum = 0
  let flexCols = 0

  for (let r = 0; r < rows.length; r++) {
    let cols = rows[r]
    let flexColsInRow = 0
    let c

    for (c = 0; c < cols.length; c++) {
      if (columnWidths[c]) {
        let width = getStringWidth(cols[c])

        if (width > columnWidths[c]) {
          // The max width of a column might change after it is wrapped
          // at word boundaries
          width = splitIntoLines(cols[c], columnWidths[c])
            .reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0)
        }

        actualColumnWidths[c] = Math.max(actualColumnWidths[c] || 0, width)
      } else {
        flexColsInRow++
      }
    }

    flexCols = Math.max(flexCols, flexColsInRow)
    colNum = Math.max(colNum, c)
  }

  lineWidth = config.lineWidth || DEFAULT_CONFIG.lineWidth
  lineWidth = Math.min(lineWidth, process.stdout.columns)

  // Flexible columns share the free space equally
  let takenWidth = actualColumnWidths.reduce((a, b) => a + b, 0)
  let flexWidth = Math.floor(
    (lineWidth - padding - takenWidth - (gap * (colNum - 1))) / flexCols
  )

  rows = rows.map((cols) => {
    return cols.reduce((row, col, i) => {
      row[i] = col
      return row
    }, {})
  })

  for (let i = 0; i < colNum; i++) {
    let minWidth = actualColumnWidths[i] || flexWidth
    let maxWidth = minWidth
    columnifyConfig.config[i] = { minWidth, maxWidth }
  }

  return columnify(rows, columnifyConfig)
    .split('\n')
    .map((line) => ' '.repeat(padding) + line)
    .join('\n')
}

module.exports = { wrap, formatColumns }
