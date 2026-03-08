import assert from 'node:assert/strict'
import test from 'node:test'

import { isHostnameBlocked, isPublicIpAddress, normalizeTargetUrl } from '../src/fetch-page.js'

test('normalizeTargetUrl prepends https when scheme is missing', () => {
  const normalized = normalizeTargetUrl('example.com')
  assert.equal(normalized.toString(), 'https://example.com/')
})

test('normalizeTargetUrl rejects unsupported protocols', () => {
  assert.throws(() => normalizeTargetUrl('ftp://example.com'))
})

test('isHostnameBlocked blocks localhost-like targets', () => {
  assert.equal(isHostnameBlocked('localhost'), true)
  assert.equal(isHostnameBlocked('internal'), true)
  assert.equal(isHostnameBlocked('subdomain.local'), true)
})

test('isHostnameBlocked allows public hostnames', () => {
  assert.equal(isHostnameBlocked('example.com'), false)
})

test('isPublicIpAddress rejects private and loopback ranges', () => {
  assert.equal(isPublicIpAddress('127.0.0.1'), false)
  assert.equal(isPublicIpAddress('10.10.10.10'), false)
  assert.equal(isPublicIpAddress('192.168.1.20'), false)
})

test('isPublicIpAddress accepts routable addresses', () => {
  assert.equal(isPublicIpAddress('1.1.1.1'), true)
  assert.equal(isPublicIpAddress('8.8.8.8'), true)
})
