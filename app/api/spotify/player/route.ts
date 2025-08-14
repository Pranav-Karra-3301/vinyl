import { NextRequest, NextResponse } from 'next/server'

// GET current playback state
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.status === 204) {
      // No active playback
      return NextResponse.json({ is_playing: false })
    }
    
    if (response.status === 401) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch playback state')
    }
    
    const playbackData = await response.json()
    return NextResponse.json(playbackData)
  } catch (error) {
    console.error('Error fetching playback state:', error)
    return NextResponse.json({ error: 'Failed to fetch playback state' }, { status: 500 })
  }
}

// PUT play/pause
export async function PUT(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { action, device_id } = body
    
    let endpoint = ''
    if (action === 'play') {
      endpoint = 'https://api.spotify.com/v1/me/player/play'
    } else if (action === 'pause') {
      endpoint = 'https://api.spotify.com/v1/me/player/pause'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const url = device_id ? `${endpoint}?device_id=${device_id}` : endpoint
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.status === 401) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    if (response.status === 403) {
      return NextResponse.json({ 
        error: 'Premium required',
        message: 'Spotify Premium is required for playback control'
      }, { status: 403 })
    }
    
    if (response.status === 204 || response.ok) {
      return NextResponse.json({ success: true })
    }
    
    throw new Error('Failed to control playback')
  } catch (error) {
    console.error('Error controlling playback:', error)
    return NextResponse.json({ error: 'Failed to control playback' }, { status: 500 })
  }
}

// POST skip to next/previous
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { action } = body
    
    let endpoint = ''
    if (action === 'next') {
      endpoint = 'https://api.spotify.com/v1/me/player/next'
    } else if (action === 'previous') {
      endpoint = 'https://api.spotify.com/v1/me/player/previous'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.status === 401) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    if (response.status === 403) {
      return NextResponse.json({ 
        error: 'Premium required',
        message: 'Spotify Premium is required for playback control'
      }, { status: 403 })
    }
    
    if (response.status === 204 || response.ok) {
      return NextResponse.json({ success: true })
    }
    
    throw new Error('Failed to skip track')
  } catch (error) {
    console.error('Error skipping track:', error)
    return NextResponse.json({ error: 'Failed to skip track' }, { status: 500 })
  }
}