import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value
  const credentials = request.cookies.get('spotify_client_credentials')?.value
  
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token available' }, { status: 401 })
  }
  
  // Get credentials from cookie or fall back to environment variables
  let authHeader: string
  if (credentials) {
    authHeader = `Basic ${credentials}`
  } else {
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 })
    }
    
    authHeader = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
  }
  
  try {
    // Request new access token using refresh token
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to refresh token:', errorData)
      
      // If refresh token is invalid, clear cookies and require re-authentication
      if (response.status === 400 || response.status === 401) {
        const clearResponse = NextResponse.json({ error: 'Refresh token invalid' }, { status: 401 })
        clearResponse.cookies.delete('spotify_access_token')
        clearResponse.cookies.delete('spotify_refresh_token')
        clearResponse.cookies.delete('spotify_token_expires_at')
        return clearResponse
      }
      
      throw new Error('Failed to refresh token')
    }
    
    const data = await response.json()
    
    // Calculate token expiry time (slightly before actual expiry for safety)
    const expiresAt = Date.now() + ((data.expires_in - 60) * 1000) // Refresh 1 minute before expiry
    
    // Create response
    const successResponse = NextResponse.json({ 
      success: true,
      expires_at: expiresAt
    })
    
    // Update access token cookie
    successResponse.cookies.set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in
    })
    
    // Store token expiry time
    successResponse.cookies.set('spotify_token_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in
    })
    
    // If Spotify provides a new refresh token, update it
    if (data.refresh_token) {
      successResponse.cookies.set('spotify_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }
    
    return successResponse
  } catch (error) {
    console.error('Error refreshing token:', error)
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
  }
}

// GET endpoint to check if refresh is needed
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value
  const expiresAt = request.cookies.get('spotify_token_expires_at')?.value
  
  // Check if we have tokens
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ needsRefresh: false, needsLogin: true })
  }
  
  // Check if token is expired or about to expire
  const now = Date.now()
  const expiry = expiresAt ? parseInt(expiresAt) : 0
  const needsRefresh = expiry <= now
  
  return NextResponse.json({ 
    needsRefresh,
    needsLogin: false,
    expiresAt: expiry,
    currentTime: now
  })
}