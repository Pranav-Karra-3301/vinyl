import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

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
    
    // Test the credentials by requesting a client credentials token
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify validation error:', error)
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your Client ID and Secret.' },
        { status: 401 }
      )
    }
    
    const data = await response.json()
    
    // If we got a token, the credentials are valid
    if (data.access_token) {
      return NextResponse.json({ valid: true })
    }
    
    return NextResponse.json(
      { error: 'Could not validate credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate credentials' },
      { status: 500 }
    )
  }
}