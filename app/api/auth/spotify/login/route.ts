import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const REDIRECT_URI = 'https://vinyl.pranavkarra.me/api/auth/spotify/callback'

// Scopes needed for playback control and reading user data
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-playback-position',
  'user-read-email',
  'user-read-private',
  'streaming',
  'app-remote-control'
].join(' ')

export async function GET(request: NextRequest) {
  // Get client ID from query params (passed from frontend)
  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  
  if (!clientId) {
    return NextResponse.redirect(new URL('/?error=missing_client_id', request.url))
  }
  
  // Generate random state for security
  const state = Math.random().toString(36).substring(7)
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state,
    show_dialog: 'true'
  })

  const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`
  
  // Set state and client_id in cookies for verification and use in callback
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  })
  
  // Store client_id temporarily for the callback to use
  response.cookies.set('spotify_client_id_temp', clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  })
  
  return response
}