import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseCalendarFile } from '../src/lib/calendar.js'

test('releaseCalendarFile produces an importable calendar event', () => {
  const file = releaseCalendarFile({ id: 42, title: 'Cherry Drop, Wave 2', event_at: '2026-08-10T16:00:00.000Z', description: 'Verified launch', product_url: 'https://example.com/drop', event_location: 'Online' })
  assert.match(file, /BEGIN:VCALENDAR/)
  assert.match(file, /DTSTART:20260810T160000Z/)
  assert.match(file, /SUMMARY:Cherry Drop\\, Wave 2/)
  assert.match(file, /END:VCALENDAR/)
})
