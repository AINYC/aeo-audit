import { runAeoAudit } from './index.js'
import { isAeoAuditError } from './errors.js'
import { formatJson } from './formatters/json.js'
import { formatMarkdown } from './formatters/markdown.js'
import { formatText } from './formatters/text.js'
import type { AuditReport, RunAeoAuditOptions } from './types.js'

const FORMATTERS = {
  json: formatJson,
  markdown: formatMarkdown,
  text: formatText,
}

type FormatterName = keyof typeof FORMATTERS

interface ParsedArgs {
  url: string | null
  format: string
  factors: string[] | null
  includeGeo: boolean
  help: boolean
}

function isFormatterName(value: string): value is FormatterName {
  return value in FORMATTERS
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const result: ParsedArgs = { url: null, format: 'text', factors: null, includeGeo: false, help: false }

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--format' && args[i + 1]) {
      result.format = args[i + 1]
      i += 1
    } else if (args[i] === '--factors' && args[i + 1]) {
      result.factors = args[i + 1].split(',').map((factor) => factor.trim())
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

export async function main(argv: string[] = process.argv): Promise<number> {
  const args = parseArgs(argv)

  if (args.help) {
    printHelp()
    return 0
  }

  if (!args.url) {
    console.error('Error: URL is required. Run with --help for usage.')
    return 1
  }

  if (!isFormatterName(args.format)) {
    console.error(`Error: Unknown format "${args.format}". Use: text, json, markdown`)
    return 1
  }

  const formatter = FORMATTERS[args.format]

  try {
    const options: RunAeoAuditOptions = {
      factors: args.factors,
      includeGeo: args.includeGeo,
    }

    const report = await runAeoAudit(args.url, options)

    console.log(formatter(report))
    return report.overallScore >= 70 ? 0 : 1
  } catch (error) {
    if (isAeoAuditError(error)) {
      console.error(`Error [${error.code}]: ${error.message}`)
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(`Error: ${String(error)}`)
    }

    return 1
  }
}
