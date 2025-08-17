import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? 'https://music.pranavkarra.me/api/auth/spotify/callback'
    : 'http://localhost:3000/api/auth/spotify/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  // Check for errors
  if (error) {
    return NextResponse.redirect(new URL('/?error=' + error, request.url))
  }
  
  // Verify state
  const storedState = request.cookies.get('spotify_auth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url))
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }
  
  // Get stored client_id and client_secret from temporary cookies
  const clientId = request.cookies.get('spotify_client_id_temp')?.value
  const clientSecret = request.cookies.get('spotify_client_secret_temp')?.value
  
  // Fallback to environment variables if not in cookies
  const CLIENT_ID = clientId || process.env.SPOTIFY_CLIENT_ID
  const CLIENT_SECRET = clientSecret || process.env.SPOTIFY_CLIENT_SECRET
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/?error=missing_credentials', request.url))
  }
  
  // Exchange code for tokens
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }
    
    const data = await response.json()
    
    // Calculate token expiry time (slightly before actual expiry for safety)
    const expiresAt = Date.now() + ((data.expires_in - 60) * 1000) // Refresh 1 minute before expiry
    
    // Create response with redirect to home
    const redirectResponse = NextResponse.redirect(new URL('/', request.url))
    
    // Set tokens in httpOnly cookies
    redirectResponse.cookies.set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in // Usually 3600 seconds (1 hour)
    })
    
    redirectResponse.cookies.set('spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    
    // Store token expiry time
    redirectResponse.cookies.set('spotify_token_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in
    })
    
    // Store credentials for token refresh
    redirectResponse.cookies.set('spotify_client_credentials', 
      Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    
    // Clear temporary cookies
    redirectResponse.cookies.delete('spotify_auth_state')
    redirectResponse.cookies.delete('spotify_client_id_temp')
    redirectResponse.cookies.delete('spotify_client_secret_temp')
    
    return redirectResponse
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
  }
}