export interface AeoAuditErrorOptions {
  statusCode?: number
  details?: unknown
  cause?: unknown
}

export class AeoAuditError extends Error {
  readonly code: string
  readonly statusCode?: number
  readonly details?: unknown

  constructor(code: string, message: string, options: AeoAuditErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AeoAuditError'
    this.code = code
    this.statusCode = options.statusCode
    this.details = options.details
  }
}

export function isAeoAuditError(error: unknown): error is AeoAuditError {
  return error instanceof AeoAuditError
}
