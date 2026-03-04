import { runAeoAudit } from './index.js'
import { isAeoAuditError } from './errors.js'
import { formatJson } from './formatters/json.js'
import { formatMarkdown } from './formatters/markdown.js'
import { formatText } from './formatters/text.js'

const FORMATTERS = {
  json: formatJson,
  markdown: formatMarkdown,
  text: formatText,
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const result = { url: null, format: 'text', factors: null, includeGeo: false }

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--format' && args[i + 1]) {
      result.format = args[i + 1]
      i += 1
    } else if (args[i] === '--factors' && args[i + 1]) {
      result.factors = args[i + 1].split(',').map((f) => f.trim())
      i += 1
    } else if (args[i] === '--include-geo') {
      result.includeGeo = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      result.help = true
    } else if (!args[i].startsWith('-')) {
      result.url = args[i]
    }
  }

  return result
}

function printHelp() {
  console.log(`
Usage: aeo-audit <url> [options]

Options:
  --format <type>     Output format: text (default), json, markdown
  --factors <list>    Comma-separated factor IDs to run (runs all if omitted)
  --include-geo       Include optional geographic signals factor
  -h, --help          Show this help message

Examples:
  aeo-audit https://example.com
  aeo-audit https://example.com --format json
  aeo-audit https://example.com --factors structured-data,faq-content
  aeo-audit https://example.com --include-geo
`)
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv)

  if (args.help) {
    printHelp()
    return 0
  }

  if (!args.url) {
    console.error('Error: URL is required. Run with --help for usage.')
    return 1
  }

  const formatter = FORMATTERS[args.format]
  if (!formatter) {
    console.error(`Error: Unknown format "${args.format}". Use: text, json, markdown`)
    return 1
  }

  try {
    const report = await runAeoAudit(args.url, {
      factors: args.factors,
      includeGeo: args.includeGeo,
    })

    console.log(formatter(report))
    return report.overallScore >= 70 ? 0 : 1
  } catch (error) {
    if (isAeoAuditError(error)) {
      console.error(`Error [${error.code}]: ${error.message}`)
    } else {
      console.error(`Error: ${error.message}`)
    }

    return 1
  }
}
