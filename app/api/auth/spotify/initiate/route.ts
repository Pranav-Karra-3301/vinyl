import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? 'https://music.pranavkarra.me/api/auth/spotify/callback'
    : 'http://localhost:3000/api/auth/spotify/callback'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientSecret } = body
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      )
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
    
    // Create response with auth URL
    const response = NextResponse.json({ authUrl })
    
    // Store credentials temporarily in secure cookies for the callback
    response.cookies.set('spotify_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    response.cookies.set('spotify_client_id_temp', clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    response.cookies.set('spotify_client_secret_temp', clientSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    return response
  } catch (error) {
    console.error('Error initiating auth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    )
  }
}