import test from 'node:test'
import assert from 'node:assert/strict'
import { hasProAccess } from '../src/lib/membership.js'

const now = new Date('2026-08-07T12:00:00Z').getTime()

test('free users without a membership do not receive Pro access', () => {
  assert.equal(hasProAccess(null, now), false)
})

test('active and trialing memberships receive Pro access', () => {
  assert.equal(hasProAccess({ status: 'active' }, now), true)
  assert.equal(hasProAccess({ status: 'trialing', current_period_end: '2026-08-08T12:00:00Z' }, now), true)
})

test('expired and canceled memberships do not receive Pro access', () => {
  assert.equal(hasProAccess({ status: 'active', current_period_end: '2026-08-06T12:00:00Z' }, now), false)
  assert.equal(hasProAccess({ status: 'canceled' }, now), false)
})

test('grandfathered accounts keep Pro access', () => {
  assert.equal(hasProAccess({ status: 'canceled', grandfathered: true }, now), true)
})
