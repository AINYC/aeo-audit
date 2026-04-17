import { test, expect } from 'vitest'

import { isHostnameBlocked, isPublicIpAddress, normalizeTargetUrl } from '../src/fetch-page.js'

test('normalizeTargetUrl prepends https when scheme is missing', () => {
  const normalized = normalizeTargetUrl('example.com')
  expect(normalized.toString()).toBe('https://example.com/')
})

test('normalizeTargetUrl rejects unsupported protocols', () => {
  expect(() => normalizeTargetUrl('ftp://example.com')).toThrow()
})

test('isHostnameBlocked blocks localhost-like targets', () => {
  expect(isHostnameBlocked('localhost')).toBe(true)
  expect(isHostnameBlocked('internal')).toBe(true)
  expect(isHostnameBlocked('subdomain.local')).toBe(true)
})

test('isHostnameBlocked allows public hostnames', () => {
  expect(isHostnameBlocked('example.com')).toBe(false)
})

test('isPublicIpAddress rejects private and loopback ranges', () => {
  expect(isPublicIpAddress('127.0.0.1')).toBe(false)
  expect(isPublicIpAddress('10.10.10.10')).toBe(false)
  expect(isPublicIpAddress('192.168.1.20')).toBe(false)
})

test('isPublicIpAddress accepts routable addresses', () => {
  expect(isPublicIpAddress('1.1.1.1')).toBe(true)
  expect(isPublicIpAddress('8.8.8.8')).toBe(true)
})
