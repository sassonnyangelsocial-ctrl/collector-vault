function escapeIcs(value) {
  return String(value || '').replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n')
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function releaseCalendarFile(alert) {
  const start = icsDate(alert.event_at)
  const end = icsDate(alert.event_end_at || new Date(new Date(alert.event_at).getTime() + 60 * 60 * 1000))
  const description = [alert.description, alert.product_url].filter(Boolean).join('\n\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Collector Vault//Release Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:collector-vault-${alert.id}@collector-vault-one.vercel.app`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(alert.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(alert.event_location || alert.region || 'Online')}`,
    `URL:${escapeIcs(alert.product_url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
