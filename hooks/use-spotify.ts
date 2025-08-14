import { useState, useEffect, useCallback } from 'react'

interface SpotifyUser {
  display_name: string
  email: string
  product: 'free' | 'premium'
  images: Array<{ url: string }>
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
    release_date: string
  }
  duration_ms: number
  explicit: boolean
}

interface SpotifyPlaybackState {
  is_playing: boolean
  progress_ms: number
  item: SpotifyTrack | null
  device: {
    id: string
    name: string
    type: string
    volume_percent: number
  } | null
}

interface SpotifyQueue {
  next: SpotifyTrack | null
  previous: SpotifyTrack | null
  fullQueue: SpotifyTrack[]
}

export function useSpotify() {
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null)
  const [queue, setQueue] = useState<SpotifyQueue>({ next: null, previous: null, fullQueue: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/queue')
      if (response.ok) {
        const queueData = await response.json()
        setQueue(queueData)
        return queueData
      }
    } catch (err) {
      console.error('Error fetching queue:', err)
    }
    return null
  }, [])

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        return userData
      } else if (response.status === 401) {
        setUser(null)
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setError('Failed to fetch user data')
    }
    return null
  }, [])

  // Fetch playback state
  const fetchPlaybackState = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player')
      if (response.ok) {
        const data = await response.json()
        setPlaybackState(data)
        // Fetch queue whenever playback state changes
        await fetchQueue()
        return data
      }
    } catch (err) {
      console.error('Error fetching playback state:', err)
    }
    return null
  }, [fetchQueue])

  // Control playback
  const play = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play' })
      })
      
      if (response.status === 403) {
        const data = await response.json()
        setError(data.message)
        return false
      }
      
      if (response.ok) {
        await fetchPlaybackState()
        return true
      }
    } catch (err) {
      console.error('Error playing:', err)
      setError('Failed to play')
    }
    return false
  }, [fetchPlaybackState])

  const pause = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      })
      
      if (response.status === 403) {
        const data = await response.json()
        setError(data.message)
        return false
      }
      
      if (response.ok) {
        await fetchPlaybackState()
        return true
      }
    } catch (err) {
      console.error('Error pausing:', err)
      setError('Failed to pause')
    }
    return false
  }, [fetchPlaybackState])

  const skipToNext = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next' })
      })
      
      if (response.status === 403) {
        const data = await response.json()
        setError(data.message)
        return false
      }
      
      if (response.ok) {
        // Wait a bit for the track to change
        setTimeout(() => fetchPlaybackState(), 500)
        return true
      }
    } catch (err) {
      console.error('Error skipping to next:', err)
      setError('Failed to skip')
    }
    return false
  }, [fetchPlaybackState])

  const skipToPrevious = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'previous' })
      })
      
      if (response.status === 403) {
        const data = await response.json()
        setError(data.message)
        return false
      }
      
      if (response.ok) {
        // Wait a bit for the track to change
        setTimeout(() => fetchPlaybackState(), 500)
        return true
      }
    } catch (err) {
      console.error('Error skipping to previous:', err)
      setError('Failed to skip')
    }
    return false
  }, [fetchPlaybackState])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/spotify/logout', { method: 'POST' })
      setUser(null)
      setPlaybackState(null)
      window.location.reload()
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }, [])

  // Initial load - immediately check if something is playing
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const userData = await fetchUser()
      if (userData) {
        // Immediately fetch playback state when user is authenticated
        const playback = await fetchPlaybackState()
        // If nothing is playing but user just signed in, give them a moment to start playing
        if (!playback?.is_playing) {
          // Check again after 2 seconds in case they just opened Spotify
          setTimeout(async () => {
            await fetchPlaybackState()
          }, 2000)
        }
      }
      setIsLoading(false)
    }
    init()
  }, [fetchUser, fetchPlaybackState])

  // Poll for playback state updates (every 1 second when playing, every 5 seconds when not)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(
      fetchPlaybackState,
      playbackState?.is_playing ? 1000 : 5000
    )

    return () => clearInterval(interval)
  }, [user, playbackState?.is_playing, fetchPlaybackState])

  return {
    user,
    playbackState,
    queue,
    isLoading,
    error,
    isAuthenticated: !!user,
    isPremium: user?.product === 'premium',
    play,
    pause,
    skipToNext,
    skipToPrevious,
    logout,
    refreshPlayback: fetchPlaybackState
  }
}