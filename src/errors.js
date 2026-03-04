export class AeoAuditError extends Error {
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'AeoAuditError'
    this.code = code
    this.statusCode = options.statusCode
    this.details = options.details
    this.cause = options.cause
  }
}

export function isAeoAuditError(error) {
  return error instanceof AeoAuditError
}
