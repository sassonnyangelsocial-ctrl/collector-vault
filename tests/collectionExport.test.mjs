import test from 'node:test'
import assert from 'node:assert/strict'
import { collectionCsv, collectionRows, collectionText } from '../src/lib/collectionExport.js'

const figures = [{ id: '1', name: 'Rabbit, Pink', rarity: 'Secret', series: { name: 'Animal 1', brand: { name: 'Sonny Angel' } } }, { id: '2', name: 'Frog', series: { name: 'Animal 1', brand: { name: 'Sonny Angel' } } }]

test('collectionRows excludes untouched figures by default', () => {
  assert.equal(collectionRows(figures, { 1: { owned: true, quantity: 2 } }).length, 1)
})

test('collectionRows can include missing and untouched figures', () => {
  assert.equal(collectionRows(figures, {}, { includeUntracked: true }).length, 2)
})

test('collectionCsv escapes commas and includes statuses', () => {
  const csv = collectionCsv(collectionRows(figures, { 1: { owned: true, iso: true, quantity: 2 } }))
  assert.match(csv, /"Rabbit, Pink"/)
  assert.match(csv, /"Owned, ISO"/)
})

test('collectionText creates a shareable list', () => {
  const text = collectionText('My Collection', collectionRows(figures, { 1: { owned: true, quantity: 2 } }))
  assert.match(text, /Collector Vault — My Collection/)
  assert.match(text, /Qty 2/)
})
