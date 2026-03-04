export function formatMarkdown(report) {
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
