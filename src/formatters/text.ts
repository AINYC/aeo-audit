const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

import type { AuditReport, ScoredFactor } from '../types.js'

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
