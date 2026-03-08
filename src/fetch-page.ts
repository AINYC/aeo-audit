import dns from 'node:dns/promises'
import ipaddr from 'ipaddr.js'
import { AeoAuditError, isAeoAuditError } from './errors.js'
import type {
  AuxiliaryResource,
  AuxiliaryResourceState,
  AuxiliaryResources,
  FetchedPage,
  RedirectHop,
} from './types.js'

interface AuxiliarySpec {
  key: keyof AuxiliaryResources
  path: string
  kind: 'text' | 'xml'
}

interface TimedFetchOptions {
  timeoutMs: number
  headers?: HeadersInit
  redirect?: RequestRedirect
}

interface ReadBodyOptions {
  maxBytes: number
  requireHtmlSniff?: boolean
}

interface FetchWithRedirectOptions {
  timeoutMs: number
  maxRedirects?: number
}

interface RedirectFetchResult {
  response: Response
  finalUrl: string
  redirectChain: RedirectHop[]
}

const USER_AGENT = 'AINYC-AEO-Audit/1.0'
const MAIN_TIMEOUT_MS = 10_000
const AUX_TIMEOUT_MS = 5_000
const MAIN_MAX_BYTES = 5 * 1024 * 1024
const AUX_MAX_BYTES = 1024 * 1024
const MAX_REDIRECTS = 5

const AUXILIARY_SPECS: AuxiliarySpec[] = [
  { key: 'llmsTxt', path: '/llms.txt', kind: 'text' },
  { key: 'llmsFullTxt', path: '/llms-full.txt', kind: 'text' },
  { key: 'robotsTxt', path: '/robots.txt', kind: 'text' },
  { key: 'sitemapXml', path: '/sitemap.xml', kind: 'xml' },
]

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home', '.lan']

const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']
const TEXT_LIKE_CONTENT_TYPES = ['text/', 'application/json', 'application/xml', 'text/xml', 'application/xhtml+xml']
const AMBIGUOUS_CONTENT_TYPES = ['text/plain', 'application/octet-stream']

function stripPort(hostname = ''): string {
  const closingBracketIndex = hostname.indexOf(']')
  if (hostname.startsWith('[') && closingBracketIndex !== -1) {
    return hostname.slice(1, closingBracketIndex)
  }

  const segments = hostname.split(':')
  return segments.length > 2 ? hostname : segments[0]
}

export function normalizeTargetUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== 'string') {
    throw new AeoAuditError('BAD_INPUT', 'A target URL is required.')
  }

  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw new AeoAuditError('BAD_INPUT', 'A target URL is required.')
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new AeoAuditError('INVALID_URL', 'Enter a valid URL.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AeoAuditError('UNSUPPORTED_PROTOCOL', 'Only HTTP and HTTPS URLs are supported.')
  }

  parsed.hash = ''

  return parsed
}

export function isHostnameBlocked(hostname: string): boolean {
  const normalized = stripPort(hostname).toLowerCase().replace(/\.$/, '')

  if (!normalized) {
    return true
  }

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true
  }

  if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true
  }

  const isIpLiteral = ipaddr.isValid(normalized)
  if (!isIpLiteral && !normalized.includes('.')) {
    return true
  }

  return false
}

export function isPublicIpAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) {
    return false
  }

  const parsed = ipaddr.parse(ip)

  if (parsed.kind() === 'ipv6') {
    const ipv6 = parsed as { isIPv4MappedAddress(): boolean; toIPv4Address(): { toString(): string } }
    if (ipv6.isIPv4MappedAddress()) {
      return isPublicIpAddress(ipv6.toIPv4Address().toString())
    }
  }

  return parsed.range() === 'unicast'
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }

  return undefined
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message
  }

  return undefined
}

function isDnsNotFoundError(error: unknown): boolean {
  return ['ENODATA', 'ENOTFOUND', 'EAI_AGAIN', 'SERVFAIL', 'ETIMEOUT'].includes(getErrorCode(error) || '')
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
  if (ipaddr.isValid(hostname)) {
    return [hostname]
  }

  const results = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)])

  const ips = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      ips.push(...result.value)
    } else if (!isDnsNotFoundError(result.reason)) {
      throw new AeoAuditError('UNREACHABLE', `Could not resolve host "${hostname}".`, {
        details: { reason: getErrorMessage(result.reason) },
      })
    }
  }

  if (!ips.length) {
    throw new AeoAuditError('UNREACHABLE', `Could not resolve host "${hostname}".`)
  }

  return ips
}

async function validatePublicRequestTarget(targetUrl: URL): Promise<string[]> {
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new AeoAuditError('UNSUPPORTED_PROTOCOL', 'Only HTTP and HTTPS URLs are supported.')
  }

  if (isHostnameBlocked(targetUrl.hostname)) {
    throw new AeoAuditError('BLOCKED_HOST', 'URL points to a blocked or private hostname.')
  }

  const ips = await resolveHostAddresses(targetUrl.hostname)
  const privateIp = ips.find((ip) => !isPublicIpAddress(ip))

  if (privateIp) {
    throw new AeoAuditError('BLOCKED_IP', 'URL resolves to a blocked or private IP address.', {
      details: { ip: privateIp },
    })
  }

  return ips
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400
}

async function timedFetch(url: URL | string, options: TimedFetchOptions): Promise<Response> {
  const { timeoutMs, headers, redirect = 'manual' } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      method: 'GET',
      redirect,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        ...(headers || {}),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AeoAuditError('TIMEOUT', `Request timed out after ${timeoutMs}ms.`, { cause: error })
    }

    throw new AeoAuditError('UNREACHABLE', 'Target URL could not be reached.', { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithValidatedRedirects(startUrl: URL | string, options: FetchWithRedirectOptions): Promise<RedirectFetchResult> {
  const { timeoutMs, maxRedirects = MAX_REDIRECTS } = options

  let currentUrl = new URL(startUrl.toString())
  const redirectChain: RedirectHop[] = []

  for (;;) {
    await validatePublicRequestTarget(currentUrl)

    const response = await timedFetch(currentUrl, { timeoutMs, redirect: 'manual' })

    if (!isRedirectStatus(response.status)) {
      return {
        response,
        finalUrl: currentUrl.toString(),
        redirectChain,
      }
    }

    const location = response.headers.get('location')
    if (!location) {
      return {
        response,
        finalUrl: currentUrl.toString(),
        redirectChain,
      }
    }

    if (redirectChain.length >= maxRedirects) {
      throw new AeoAuditError('REDIRECT_LIMIT', `Too many redirects (>${maxRedirects}).`)
    }

    let nextUrl
    try {
      nextUrl = new URL(location, currentUrl)
    } catch {
      throw new AeoAuditError('UNREACHABLE', 'Redirect location is invalid.')
    }

    redirectChain.push({
      status: response.status,
      from: currentUrl.toString(),
      to: nextUrl.toString(),
    })

    currentUrl = nextUrl
  }
}

function looksLikeHtml(sample: string): boolean {
  const normalized = sample.trim().slice(0, 4096).toLowerCase()
  if (!normalized) {
    return false
  }

  return (
    normalized.includes('<!doctype html')
    || normalized.includes('<html')
    || normalized.includes('<head')
    || normalized.includes('<body')
  )
}

function isHtmlContentType(contentType = ''): boolean {
  const normalized = contentType.toLowerCase()
  return HTML_CONTENT_TYPES.some((type) => normalized.includes(type))
}

function isAmbiguousContentType(contentType = ''): boolean {
  const normalized = contentType.toLowerCase()
  return !normalized || AMBIGUOUS_CONTENT_TYPES.some((type) => normalized.includes(type))
}

function isLikelyTextContent(contentType = '', body = ''): boolean {
  const normalized = contentType.toLowerCase()
  if (!normalized) {
    return !hasDisallowedControlChars(body.slice(0, 2048))
  }

  if (TEXT_LIKE_CONTENT_TYPES.some((type) => normalized.includes(type))) {
    return true
  }

  return false
}

function hasDisallowedControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code === 9 || code === 10 || code === 13) {
      continue
    }

    if (code < 32) {
      return true
    }
  }

  return false
}

async function readBodyAsText(response: Response, options: ReadBodyOptions): Promise<string> {
  const { maxBytes, requireHtmlSniff = false } = options
  const reader = response.body?.getReader()
  if (!reader) {
    return ''
  }

  const chunks: Buffer[] = []
  let totalBytes = 0
  let sniffSample = ''
  let sniffed = false

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    const chunk = Buffer.from(value)
    totalBytes += chunk.length

    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new AeoAuditError('BODY_TOO_LARGE', `Response exceeded ${maxBytes} bytes.`)
    }

    if (requireHtmlSniff && !sniffed && sniffSample.length < 2048) {
      sniffSample += chunk.toString('utf8')
      if (sniffSample.length >= 512) {
        sniffed = true
        if (!looksLikeHtml(sniffSample)) {
          await reader.cancel()
          throw new AeoAuditError('NOT_HTML', 'Target URL did not return HTML.')
        }
      }
    }

    chunks.push(chunk)
  }

  if (requireHtmlSniff && !sniffed && !looksLikeHtml(sniffSample)) {
    throw new AeoAuditError('NOT_HTML', 'Target URL did not return HTML.')
  }

  return Buffer.concat(chunks).toString('utf8')
}

function classifyAuxiliaryState(spec: AuxiliarySpec, response: Response, bodyText: string): AuxiliaryResourceState {
  const contentType = response.headers.get('content-type') || ''

  if (!response.ok) {
    if (response.status === 404) {
      return 'missing'
    }

    return 'unreachable'
  }

  if (spec.kind === 'text') {
    return isLikelyTextContent(contentType, bodyText) ? 'ok' : 'not-html'
  }

  if (spec.kind === 'xml') {
    if (contentType.toLowerCase().includes('xml')) {
      return 'ok'
    }

    return bodyText.trim().startsWith('<') ? 'ok' : 'not-html'
  }

  return 'ok'
}

async function fetchAuxiliaryFile(origin: string, spec: AuxiliarySpec): Promise<AuxiliaryResource> {
  const startedAt = Date.now()
  const targetUrl = new URL(spec.path, origin)

  try {
    const { response, finalUrl, redirectChain } = await fetchWithValidatedRedirects(targetUrl, {
      timeoutMs: AUX_TIMEOUT_MS,
      maxRedirects: MAX_REDIRECTS,
    })

    const body = response.ok
      ? await readBodyAsText(response, { maxBytes: AUX_MAX_BYTES, requireHtmlSniff: false })
      : ''

    const state = classifyAuxiliaryState(spec, response, body)

    return {
      state,
      url: finalUrl,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || '',
      body,
      redirectChain,
      timingMs: Date.now() - startedAt,
    }
  } catch (error) {
    const knownError = isAeoAuditError(error)
      ? error
      : new AeoAuditError('UNREACHABLE', 'Failed to fetch auxiliary file.', { cause: error })

    if (knownError.code === 'TIMEOUT') {
      return {
        state: 'timeout',
        url: targetUrl.toString(),
        statusCode: null,
        contentType: '',
        body: '',
        redirectChain: [],
        timingMs: Date.now() - startedAt,
      }
    }

    return {
      state: 'unreachable',
      url: targetUrl.toString(),
      statusCode: null,
      contentType: '',
      body: '',
      redirectChain: [],
      timingMs: Date.now() - startedAt,
      errorCode: knownError.code,
    }
  }
}

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  const startedAt = Date.now()
  const normalizedUrl = normalizeTargetUrl(rawUrl)

  const { response, finalUrl, redirectChain } = await fetchWithValidatedRedirects(normalizedUrl, {
    timeoutMs: MAIN_TIMEOUT_MS,
    maxRedirects: MAX_REDIRECTS,
  })

  const contentType = response.headers.get('content-type') || ''
  const htmlByHeader = isHtmlContentType(contentType)
  const requireHtmlSniff = !htmlByHeader || isAmbiguousContentType(contentType)

  if (!htmlByHeader && !isAmbiguousContentType(contentType)) {
    throw new AeoAuditError('NOT_HTML', 'Target URL did not return HTML.', {
      details: { contentType },
    })
  }

  const html = await readBodyAsText(response, {
    maxBytes: MAIN_MAX_BYTES,
    requireHtmlSniff,
  })

  if (!looksLikeHtml(html)) {
    throw new AeoAuditError('NOT_HTML', 'Target URL did not return HTML.', {
      details: { contentType },
    })
  }

  const auxiliaryFetchStartedAt = Date.now()
  const origin = new URL(finalUrl).origin
  const auxiliaryEntries = await Promise.all(
    AUXILIARY_SPECS.map(async (spec): Promise<[keyof AuxiliaryResources, AuxiliaryResource]> => {
      const result = await fetchAuxiliaryFile(origin, spec)
      return [spec.key, result]
    }),
  )

  return {
    inputUrl: normalizedUrl.toString(),
    finalUrl,
    html,
    headers: Object.fromEntries(response.headers.entries()),
    redirectChain,
    auxiliary: Object.fromEntries(auxiliaryEntries) as Record<string, AuxiliaryResource>,
    timings: {
      fetchTimeMs: Date.now() - startedAt,
      mainFetchMs: auxiliaryFetchStartedAt - startedAt,
      auxiliaryFetchMs: Date.now() - auxiliaryFetchStartedAt,
    },
  }
}
