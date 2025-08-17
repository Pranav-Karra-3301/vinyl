import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

async function refreshAccessToken(refreshToken: string, credentials?: string) {
  // Get credentials from parameter or fall back to environment variables
  let authHeader: string
  if (credentials) {
    authHeader = `Basic ${credentials}`
  } else {
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return null
    }
    
    authHeader = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
  }
  
  try {
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
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Middleware: Error refreshing token:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  // Only handle Spotify API routes (excluding auth routes)
  if (request.nextUrl.pathname.startsWith('/api/spotify/') && 
      !request.nextUrl.pathname.startsWith('/api/auth/')) {
    
    const accessToken = request.cookies.get('spotify_access_token')?.value
    const refreshToken = request.cookies.get('spotify_refresh_token')?.value
    const expiresAt = request.cookies.get('spotify_token_expires_at')?.value
    const credentials = request.cookies.get('spotify_client_credentials')?.value
    
    // If no tokens at all, let the API route handle the 401
    if (!accessToken && !refreshToken) {
      return NextResponse.next()
    }
    
    // Check if token needs refresh
    const now = Date.now()
    const expiry = expiresAt ? parseInt(expiresAt) : 0
    const needsRefresh = !accessToken || expiry <= now
    
    if (needsRefresh && refreshToken) {
      console.log('Middleware: Token expired or missing, attempting refresh...')
      
      // Attempt to refresh the token
      const tokenData = await refreshAccessToken(refreshToken, credentials)
      
      if (tokenData) {
        console.log('Middleware: Token refreshed successfully')
        
        // Calculate new expiry time
        const newExpiresAt = Date.now() + ((tokenData.expires_in - 60) * 1000)
        
        // Clone the request with new cookies
        const response = NextResponse.next()
        
        // Set new access token
        response.cookies.set('spotify_access_token', tokenData.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenData.expires_in
        })
        
        // Set expiry time
        response.cookies.set('spotify_token_expires_at', newExpiresAt.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenData.expires_in
        })
        
        // Update refresh token if provided
        if (tokenData.refresh_token) {
          response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30
          })
        }
        
        // Modify the request headers to include the new token
        const modifiedHeaders = new Headers(request.headers)
        modifiedHeaders.set('x-spotify-access-token', tokenData.access_token)
        
        // Create new request with modified headers
        const modifiedRequest = new NextRequest(request.url, {
          headers: modifiedHeaders,
          method: request.method,
          body: request.body,
        })
        
        // Continue with the modified request
        return NextResponse.next({
          request: modifiedRequest
        })
      } else {
        console.log('Middleware: Token refresh failed')
        // If refresh failed, clear all cookies and let API return 401
        const response = NextResponse.next()
        response.cookies.delete('spotify_access_token')
        response.cookies.delete('spotify_refresh_token')
        response.cookies.delete('spotify_token_expires_at')
        return response
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/spotify/:path*'
}