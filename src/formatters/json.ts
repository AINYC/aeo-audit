import type {
  AuditReport,
  BatchPlatformDetectionReport,
  PlatformDetectionReport,
  SitemapAuditReport,
} from '../types.js'

export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2)
}

export function formatSitemapJson(report: SitemapAuditReport): string {
  return JSON.stringify(report, null, 2)
}

export function formatPlatformJson(report: PlatformDetectionReport): string {
  return JSON.stringify(report, null, 2)
}

export function formatBatchPlatformJson(report: BatchPlatformDetectionReport): string {
  return JSON.stringify(report, null, 2)
}
