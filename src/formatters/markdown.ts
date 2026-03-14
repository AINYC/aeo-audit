import type { AuditReport, SitemapAuditReport } from '../types.js'

export function formatMarkdown(report: AuditReport): string {
  const lines = []

  lines.push(`# AEO Audit Report`)
  lines.push(``)
  lines.push(`**URL:** ${report.finalUrl}`)
  lines.push(`**Overall Grade:** ${report.overallGrade} (${report.overallScore}/100)`)
  lines.push(`**Audited:** ${report.auditedAt}`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(``)
  lines.push(report.summary)
  lines.push(``)
  lines.push(`## Factor Breakdown`)
  lines.push(``)
  lines.push(`| Factor | Weight | Score | Grade | Status |`)
  lines.push(`|--------|--------|-------|-------|--------|`)

  for (const factor of report.factors) {
    lines.push(`| ${factor.name} | ${factor.weight}% | ${factor.score} | ${factor.grade} | ${factor.status} |`)
  }

  lines.push(``)

  const sorted = [...report.factors].sort((a, b) => b.score - a.score)
  const strengths = sorted.slice(0, 3)
  const opportunities = sorted.slice(-3).reverse()

  lines.push(`## Strengths`)
  lines.push(``)
  for (const factor of strengths) {
    lines.push(`- **${factor.name}** (${factor.grade}): ${factor.findings.filter((f) => f.type === 'found').map((f) => f.message).join(' ')}`)
  }

  lines.push(``)
  lines.push(`## Opportunities`)
  lines.push(``)
  for (const factor of opportunities) {
    const recs = factor.recommendations.slice(0, 2)
    lines.push(`- **${factor.name}** (${factor.grade}): ${recs.join(' ')}`)
  }

  lines.push(``)
  lines.push(`## Metadata`)
  lines.push(``)
  lines.push(`- **Page Title:** ${report.metadata.pageTitle}`)
  lines.push(`- **Word Count:** ${report.metadata.wordCount}`)
  lines.push(`- **Fetch Time:** ${report.metadata.fetchTimeMs}ms`)
  lines.push(`- **llms.txt:** ${report.metadata.auxiliary.llmsTxt}`)
  lines.push(`- **llms-full.txt:** ${report.metadata.auxiliary.llmsFullTxt}`)
  lines.push(`- **robots.txt:** ${report.metadata.auxiliary.robotsTxt}`)
  lines.push(`- **sitemap.xml:** ${report.metadata.auxiliary.sitemapXml}`)

  return lines.join('\n')
}

export function formatSitemapMarkdown(report: SitemapAuditReport, topIssuesOnly = false): string {
  const lines = []

  lines.push(`# AEO Sitemap Audit Report`)
  lines.push(``)
  lines.push(`**Sitemap:** ${report.sitemapUrl}`)
  lines.push(`**Aggregate Grade:** ${report.aggregateGrade} (${report.aggregateScore}/100)`)
  lines.push(`**Pages:** ${report.pagesAudited} audited, ${report.pagesSkipped} skipped, ${report.pagesDiscovered} discovered`)
  lines.push(`**Audited:** ${report.auditedAt}`)
  lines.push(``)

  if (!topIssuesOnly) {
    lines.push(`## Per-Page Scores`)
    lines.push(``)
    lines.push(`| URL | Score | Grade | Status |`)
    lines.push(`|-----|-------|-------|--------|`)

    for (const page of report.pages) {
      const url = page.url.length > 60 ? page.url.slice(0, 57) + '...' : page.url
      if (page.status === 'error') {
        lines.push(`| ${url} | - | - | error: ${page.error} |`)
      } else {
        lines.push(`| ${url} | ${page.overallScore} | ${page.overallGrade} | ${page.status} |`)
      }
    }

    lines.push(``)
  }

  if (report.crossCuttingIssues.length > 0) {
    lines.push(`## Cross-Cutting Issues`)
    lines.push(``)
    lines.push(`| Factor | Avg Score | Avg Grade | Affected Pages |`)
    lines.push(`|--------|-----------|-----------|----------------|`)

    for (const issue of report.crossCuttingIssues) {
      const pct = Math.round((issue.affectedPages / issue.totalPages) * 100)
      lines.push(`| ${issue.factorName} | ${issue.avgScore} | ${issue.avgGrade} | ${issue.affectedPages}/${issue.totalPages} (${pct}%) |`)
    }

    lines.push(``)
  }

  if (report.prioritizedFixes.length > 0) {
    lines.push(`## Prioritized Fixes (by site-wide impact)`)
    lines.push(``)
    for (let i = 0; i < report.prioritizedFixes.length; i++) {
      lines.push(`${i + 1}. ${report.prioritizedFixes[i]}`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}
