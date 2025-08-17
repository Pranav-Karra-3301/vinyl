// Simple obfuscation for credentials in localStorage
// Not meant for high security, just to prevent casual viewing

const STORAGE_KEY = 'spotify_api_credentials'
const XOR_KEY = 'vinyl-player-2024'

// Simple XOR obfuscation
function obfuscate(text: string): string {
  const key = XOR_KEY.repeat(Math.ceil(text.length / XOR_KEY.length))
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i))
  }
  return btoa(result) // Base64 encode after XOR
}

function deobfuscate(encoded: string): string {
  try {
    const text = atob(encoded) // Base64 decode first
    const key = XOR_KEY.repeat(Math.ceil(text.length / XOR_KEY.length))
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i))
    }
    return result
  } catch {
    return ''
  }
}

export interface SpotifyCredentials {
  clientId: string
  clientSecret: string
  timestamp: number
}

export function saveCredentials(clientId: string, clientSecret: string): void {
  const credentials: SpotifyCredentials = {
    clientId,
    clientSecret,
    timestamp: Date.now()
  }
  
  const obfuscated = obfuscate(JSON.stringify(credentials))
  localStorage.setItem(STORAGE_KEY, obfuscated)
  
  // Also store them temporarily in sessionStorage for immediate use
  sessionStorage.setItem('spotify_client_id', clientId)
  sessionStorage.setItem('spotify_client_secret', clientSecret)
}

export function getCredentials(): SpotifyCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const deobfuscated = deobfuscate(stored)
    if (!deobfuscated) return null
    
    const credentials = JSON.parse(deobfuscated) as SpotifyCredentials
    
    // Also update sessionStorage for API use
    sessionStorage.setItem('spotify_client_id', credentials.clientId)
    sessionStorage.setItem('spotify_client_secret', credentials.clientSecret)
    
    return credentials
  } catch {
    return null
  }
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem('spotify_client_id')
  sessionStorage.removeItem('spotify_client_secret')
}

export function hasStoredCredentials(): boolean {
  return !!localStorage.getItem(STORAGE_KEY)
}

// Validate that credentials have the right format
export function validateCredentials(clientId: string, clientSecret: string): boolean {
  // Spotify Client ID is typically 32 characters
  // Client Secret is typically 32 characters
  const clientIdRegex = /^[a-z0-9]{32}$/i
  const clientSecretRegex = /^[a-z0-9]{32}$/i
  
  return clientIdRegex.test(clientId) && clientSecretRegex.test(clientSecret)
}