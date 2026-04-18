const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

import type { AuditReport, ScoredFactor, SitemapAuditReport } from '../types.js'

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return GREEN
  if (grade.startsWith('B')) return YELLOW
  return RED
}

function statusIcon(status: ScoredFactor['status']): string {
  if (status === 'pass') return `${GREEN}✓${RESET}`
  if (status === 'partial') return `${YELLOW}~${RESET}`
  return `${RED}✗${RESET}`
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width)
  const color = score >= 70 ? GREEN : score >= 40 ? YELLOW : RED
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(width - filled)}${RESET}`
}

export function formatText(report: AuditReport): string {
  const lines = []

  const gc = gradeColor(report.overallGrade)
  lines.push(``)
  lines.push(`${BOLD}AEO Audit Report${RESET}`)
  lines.push(`${DIM}${report.finalUrl}${RESET}`)
  lines.push(``)
  lines.push(`  ${BOLD}Grade:${RESET} ${gc}${BOLD}${report.overallGrade}${RESET}  ${bar(report.overallScore, 30)} ${report.overallScore}/100`)
  lines.push(``)
  lines.push(`${BOLD}Factors${RESET}`)
  lines.push(`${'─'.repeat(70)}`)

  const sorted = [...report.factors].sort((a, b) => b.score - a.score)

  for (const factor of sorted) {
    const icon = statusIcon(factor.status)
    const fc = gradeColor(factor.grade)
    const name = factor.name.padEnd(30)
    lines.push(`  ${icon} ${name} ${bar(factor.score)} ${fc}${factor.grade.padEnd(3)}${RESET} ${DIM}(${factor.weight}%)${RESET}`)
  }

  lines.push(`${'─'.repeat(70)}`)
  lines.push(``)
  lines.push(`${BOLD}Summary${RESET}`)
  lines.push(`  ${report.summary}`)
  lines.push(``)

  // Show top recommendations
  const withRecs = report.factors
    .filter((f) => f.recommendations.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  if (withRecs.length) {
    lines.push(`${BOLD}Top Recommendations${RESET}`)
    for (const factor of withRecs) {
      lines.push(`  ${CYAN}${factor.name}:${RESET} ${factor.recommendations[0]}`)
    }
    lines.push(``)
  }

  lines.push(`${DIM}Fetched in ${report.metadata.fetchTimeMs}ms | ${report.metadata.wordCount} words | ${report.auditedAt}${RESET}`)

  return lines.join('\n')
}

export function formatSitemapText(report: SitemapAuditReport, topIssuesOnly = false): string {
  const lines = []

  const gc = gradeColor(report.aggregateGrade)
  lines.push(``)
  lines.push(`${BOLD}AEO Sitemap Audit Report${RESET}`)
  lines.push(`${DIM}${report.sitemapUrl}${RESET}`)
  lines.push(``)
  lines.push(`  ${BOLD}Aggregate Grade:${RESET} ${gc}${BOLD}${report.aggregateGrade}${RESET}  ${bar(report.aggregateScore, 30)} ${report.aggregateScore}/100`)
  lines.push(`  ${DIM}${report.pagesAudited} pages audited, ${report.pagesSkipped} skipped, ${report.pagesDiscovered} discovered${RESET}`)
  lines.push(``)

  if (!topIssuesOnly) {
    lines.push(`${BOLD}Per-Page Scores${RESET}`)
    lines.push(`${'─'.repeat(70)}`)

    const sorted = [...report.pages].sort((a, b) => b.overallScore - a.overallScore)
    for (const page of sorted) {
      if (page.status === 'error') {
        const url = page.url.length > 50 ? page.url.slice(0, 47) + '...' : page.url
        lines.push(`  ${RED}✗${RESET} ${url.padEnd(50)} ${RED}error${RESET}`)
      } else {
        const url = page.url.length > 50 ? page.url.slice(0, 47) + '...' : page.url
        const pgc = gradeColor(page.overallGrade)
        lines.push(`  ${statusIcon(page.overallScore >= 70 ? 'pass' : page.overallScore >= 40 ? 'partial' : 'fail')} ${url.padEnd(50)} ${bar(page.overallScore, 15)} ${pgc}${page.overallGrade.padEnd(3)}${RESET}`)
      }
    }

    lines.push(`${'─'.repeat(70)}`)
    lines.push(``)
  }

  if (report.crossCuttingIssues.length > 0) {
    lines.push(`${BOLD}Cross-Cutting Issues${RESET}`)
    lines.push(`${'─'.repeat(70)}`)

    for (const issue of report.crossCuttingIssues) {
      const pct = Math.round((issue.affectedPages / issue.totalPages) * 100)
      const igc = gradeColor(issue.avgGrade)
      lines.push(`  ${igc}${issue.avgGrade.padEnd(3)}${RESET} ${issue.factorName.padEnd(32)} ${DIM}avg ${issue.avgScore}/100, affects ${pct}% of pages${RESET}`)

      for (const detail of issue.topIssues) {
        lines.push(`      ${DIM}• ${detail.recommendation}${RESET} ${DIM}(${detail.affectedUrls.length}/${issue.totalPages} pages)${RESET}`)
        for (const url of detail.affectedUrls) {
          lines.push(`          ${DIM}- ${url}${RESET}`)
        }
      }
    }

    lines.push(`${'─'.repeat(70)}`)
    lines.push(``)
  }

  if (report.prioritizedFixes.length > 0) {
    lines.push(`${BOLD}Prioritized Fixes (by site-wide impact)${RESET}`)
    for (let i = 0; i < report.prioritizedFixes.length; i++) {
      lines.push(`  ${CYAN}${i + 1}.${RESET} ${report.prioritizedFixes[i]}`)
    }
    lines.push(``)
  }

  lines.push(`${DIM}${report.auditedAt}${RESET}`)

  return lines.join('\n')
}
