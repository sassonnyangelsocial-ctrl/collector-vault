const productionOrigin = 'https://collector-vault-one.vercel.app'

export const isNativeApp = typeof window !== 'undefined' && ['capacitor:', 'ionic:'].includes(window.location.protocol)

export function apiUrl(path) {
  return `${isNativeApp ? productionOrigin : ''}${path}`
}
