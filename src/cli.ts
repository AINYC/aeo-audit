import { runAeoAudit } from './index.js'
import { runSitemapAudit } from './sitemap.js'
import { isAeoAuditError } from './errors.js'
import { formatJson } from './formatters/json.js'
import { formatSitemapJson } from './formatters/json.js'
import { formatMarkdown, formatSitemapMarkdown } from './formatters/markdown.js'
import { formatText, formatSitemapText } from './formatters/text.js'
import type { AuditReport, SitemapAuditReport, SitemapAuditOptions } from './types.js'

const FORMATTERS = {
  json: formatJson,
  markdown: formatMarkdown,
  text: formatText,
}

const SITEMAP_FORMATTERS = {
  json: (report: SitemapAuditReport, _topIssuesOnly: boolean) => formatSitemapJson(report),
  markdown: (report: SitemapAuditReport, topIssuesOnly: boolean) => formatSitemapMarkdown(report, topIssuesOnly),
  text: (report: SitemapAuditReport, topIssuesOnly: boolean) => formatSitemapText(report, topIssuesOnly),
}

type FormatterName = keyof typeof FORMATTERS

interface ParsedArgs {
  url: string | null
  format: string
  factors: string[] | null
  includeGeo: boolean
  includeAgentSkills: boolean
  help: boolean
  sitemap: boolean
  sitemapUrl: string | null
  limit: number | null
  topIssues: boolean
}

function isFormatterName(value: string): value is FormatterName {
  return value in FORMATTERS
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const result: ParsedArgs = {
    url: null,
    format: 'text',
    factors: null,
    includeGeo: false,
    includeAgentSkills: false,
    help: false,
    sitemap: false,
    sitemapUrl: null,
    limit: null,
    topIssues: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--format' && args[i + 1]) {
      result.format = args[i + 1]
      i += 1
    } else if (args[i] === '--factors' && args[i + 1]) {
      result.factors = args[i + 1].split(',').map((factor) => factor.trim())
      i += 1
    } else if (args[i] === '--include-geo') {
      result.includeGeo = true
    } else if (args[i] === '--include-agent-skills') {
      result.includeAgentSkills = true
    } else if (args[i] === '--sitemap') {
      result.sitemap = true
      // Check if the next arg is an explicit sitemap URL (not another flag)
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.sitemapUrl = args[i + 1]
        i += 1
      }
    } else if (args[i] === '--limit' && args[i + 1]) {
      const num = parseInt(args[i + 1], 10)
      if (Number.isFinite(num) && num > 0) {
        result.limit = num
      }
      i += 1
    } else if (args[i] === '--top-issues') {
      result.topIssues = true
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
  --include-agent-skills  Include optional agent skill exposure factor (Schema.org Action, MCP, form affordances)
  --sitemap [url]     Audit all pages from sitemap (auto-discovers /sitemap.xml or use explicit URL)
  --limit <n>         Max pages to audit in sitemap mode (default 200, sorted by sitemap priority)
  --top-issues        In sitemap mode, skip per-page output and show only cross-cutting issues
  -h, --help          Show this help message

Examples:
  aeo-audit https://example.com
  aeo-audit https://example.com --format json
  aeo-audit https://example.com --factors structured-data,faq-content
  aeo-audit https://example.com --include-geo
  aeo-audit https://example.com --sitemap
  aeo-audit https://example.com --sitemap https://example.com/sitemap.xml
  aeo-audit https://example.com --sitemap --limit 10
  aeo-audit https://example.com --sitemap --top-issues
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

  try {
    if (args.sitemap) {
      const options: SitemapAuditOptions = {
        factors: args.factors,
        includeGeo: args.includeGeo,
        includeAgentSkills: args.includeAgentSkills,
        sitemapUrl: args.sitemapUrl ?? undefined,
        limit: args.limit ?? undefined,
        topIssuesOnly: args.topIssues,
        onPlan: (plan) => {
          if (plan.truncated > 0) {
            console.error(
              `Notice: sitemap has ${plan.discovered} URLs; auditing top ${plan.willAudit} by priority (--limit ${plan.effectiveLimit}). ${plan.truncated} pages skipped. Pass --limit ${Math.max(plan.discovered, 9999)} to audit all.`,
            )
          }
        },
      }

      const report = await runSitemapAudit(args.url, options)
      const sitemapFormatter = SITEMAP_FORMATTERS[args.format]
      console.log(sitemapFormatter(report, args.topIssues))
      return report.aggregateScore >= 70 ? 0 : 1
    }

    const formatter = FORMATTERS[args.format]
    const report = await runAeoAudit(args.url, {
      factors: args.factors,
      includeGeo: args.includeGeo,
      includeAgentSkills: args.includeAgentSkills,
    })

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
