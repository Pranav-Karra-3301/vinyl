import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // If refresh token is invalid, clear cookies and force re-auth
      if (response.status === 400 || response.status === 401) {
        const clearResponse = NextResponse.json(
          { error: 'Refresh token expired', code: 'REAUTH_REQUIRED' },
          { status: 401 }
        )
        clearResponse.cookies.delete('spotify_access_token')
        clearResponse.cookies.delete('spotify_refresh_token')
        return clearResponse
      }

      return NextResponse.json(
        { error: 'Failed to refresh token', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    const jsonResponse = NextResponse.json({ success: true })

    // Update access token
    jsonResponse.cookies.set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in
    })

    // If Spotify returns a new refresh token, update it
    if (data.refresh_token) {
      jsonResponse.cookies.set('spotify_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }

    return jsonResponse
  } catch (error) {
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
  }
}
