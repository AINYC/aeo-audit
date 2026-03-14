import type { AuditReport, SitemapAuditReport } from '../types.js'

export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2)
}

export function formatSitemapJson(report: SitemapAuditReport): string {
  return JSON.stringify(report, null, 2)
}
