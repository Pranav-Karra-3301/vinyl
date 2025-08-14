"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Volume2, MoreHorizontal, LogOut, Music } from "lucide-react"
import Image from "next/image"
import { useSpotify } from "@/hooks/use-spotify"
import { useWebPlayback } from "@/hooks/use-web-playback"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { RecentItemsPopup } from "@/components/recent-items-popup"
import { ThemeSelectorPopup } from "@/components/theme-selector-popup"
import { SpotifyConnect } from "@/components/spotify-connect"
import { useTheme, generateAlbumGradient } from "@/hooks/use-theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function VinylPlayer() {
  const [isDesktop, setIsDesktop] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [tonearmAngle, setTonearmAngle] = useState(-35)
  const [localVolume, setLocalVolume] = useState(75)
  const animationRef = useRef<number>()
  const [isDraggingNeedle, setIsDraggingNeedle] = useState(false)
  const [albumHover, setAlbumHover] = useState(false)
  
  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'lifting' | 'retracting' | 'fading-out' | 'fading-in' | 'extending' | 'lowering' | 'complete'>('idle')
  const [nextTrackData, setNextTrackData] = useState<any>(null)
  const [previousTrackId, setPreviousTrackId] = useState<string | null>(null)
  const [recordPosition, setRecordPosition] = useState(0) // 0 = normal, -100 = retracted
  const [albumOpacity, setAlbumOpacity] = useState(1)
  const [displayedTrack, setDisplayedTrack] = useState<any>(null)

  const {
    user,
    playbackState,
    queue,
    devices,
    isLoading,
    error,
    accessToken,
    isAuthenticated,
    isPremium,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    setVolume: setSpotifyVolume,
    transferPlayback,
    logout
  } = useSpotify()

  // Web Playback SDK for premium users
  const { playUri, isReady: isWebPlaybackReady, setVolume: setWebVolume, volume: webVolume } = useWebPlayback(accessToken, isPremium)

  // Theme management
  const { theme, setTheme, albumGradient, setAlbumGradient } = useTheme()
  
  // System status checks
  const getSystemStatus = () => {
    // Check environment variables (these will be available on Vercel deployment)
    const hasClientId = typeof window !== 'undefined' 
      ? (!!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || 
         localStorage.getItem('spotify_client_id') !== null)
      : !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      
    const hasClientSecret = typeof window !== 'undefined'
      ? (!!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET || 
         localStorage.getItem('spotify_client_secret') !== null)
      : true // Assume it's on server/Vercel if not in browser
    
    const checks = {
      spotifyClientId: hasClientId,
      spotifyClientSecret: hasClientSecret,
      authenticated: isAuthenticated,
      themeCache: typeof window !== 'undefined' && !!localStorage.getItem('vinyl-theme'),
      webPlayback: isPremium && isWebPlaybackReady,
    }
    
    // Determine overall status
    const critical = !checks.spotifyClientId || !checks.spotifyClientSecret
    const warnings = !checks.authenticated || (isPremium && !checks.webPlayback)
    
    return {
      checks,
      overall: critical ? 'error' : warnings ? 'warning' : 'success'
    }
  }

  // Dynamic title and favicon based on current track
  useDynamicTitle({
    currentTrack: playbackState?.item || null,
    isPlaying: playbackState?.is_playing || false
  })

  // Check if desktop on mount
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  // Animation loop for vinyl rotation
  useEffect(() => {
    const animate = () => {
      if (playbackState?.is_playing && !isTransitioning) {
        // Slower rotation: 20 RPM = 0.333 rotations per second
        // At 60fps, that's about 2 degrees per frame
        setRotation((prev) => (prev + 2) % 360)
      } else if (isTransitioning) {
        // Keep spinning slowly during transition
        setRotation((prev) => (prev + 1) % 360)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [playbackState?.is_playing, isTransitioning])

  // Tonearm animation based on play state and progress
  useEffect(() => {
    // Don't update tonearm during transitions - let runTrackTransition control it
    if (isTransitioning) return
    
    if (playbackState?.is_playing && playbackState.item) {
      // Calculate progress percentage
      const progress = (playbackState.progress_ms / playbackState.item.duration_ms) * 100
      // When playing, tonearm moves in and tracks progress
      // Starting at outer edge (-10°) to inner track (20°)
      const targetAngle = -10 + (30 * (progress / 100))
      setTonearmAngle(targetAngle)
    } else if (!isTransitioning) {
      // When paused (and not transitioning), tonearm moves out to rest position
      setTonearmAngle(-35)
    }
  }, [playbackState, isTransitioning])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Check if animations are enabled via environment variable
  const animationsEnabled = process.env.NEXT_PUBLIC_ANIMATION !== 'FALSE'

  // Animation sequence for track transitions
  const runTrackTransition = useCallback(async (skipAction: () => Promise<boolean>) => {
    if (isTransitioning) return
    
    // If animations are disabled, just skip immediately
    if (!animationsEnabled) {
      const success = await skipAction()
      return
    }
    
    setIsTransitioning(true)
    
    // First, pause the current playback to stop music immediately
    await pause()
    
    // Phase 1: Lift tonearm OFF the record first (800ms for smoother motion)
    setAnimationPhase('lifting')
    setTonearmAngle(-35) // Move to rest position
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Phase 2: Retract record COMPLETELY under album FAST (300ms)
    setAnimationPhase('retracting')
    setRecordPosition(-150) // Move further to be completely hidden
    await new Promise(resolve => setTimeout(resolve, 350))
    
    // Phase 3: Fade out album ONLY AFTER record is completely hidden (600ms)
    setAnimationPhase('fading-out')
    setAlbumOpacity(0)
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Phase 4: Fade in new album FIRST (600ms)
    setAnimationPhase('fading-in')
    setAlbumOpacity(1)
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Phase 5: Extend record from COMPLETELY under album FAST (300ms)
    setAnimationPhase('extending')
    setRecordPosition(0)
    await new Promise(resolve => setTimeout(resolve, 350))
    
    // Phase 6: Lower tonearm AFTER record is in position (800ms)
    setAnimationPhase('lowering')
    setTonearmAngle(-10) // Move to start of record
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Phase 7: Wait 10 SECONDS before changing track for dramatic effect
    setAnimationPhase('complete')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // NOW execute the skip action after all animation is complete
    const success = await skipAction()
    if (!success) {
      // Reset if skip failed
      setAlbumOpacity(1)
      setRecordPosition(0)
      setTonearmAngle(-35)
      setIsTransitioning(false)
      setAnimationPhase('idle')
      return
    }
    
    // Wait for new track data to fully load (800ms)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Resume playback with the new track
    await play()
    
    setIsTransitioning(false)
    setAnimationPhase('idle')
  }, [isTransitioning, play, pause, animationsEnabled])

  const handlePlayPause = async () => {
    if (isTransitioning) return
    
    if (playbackState?.is_playing) {
      await pause()
    } else {
      await play()
    }
  }

  // Volume control handler
  const handleVolumeChange = useCallback(async (newVolume: number[]) => {
    const volumeValue = newVolume[0]
    setLocalVolume(volumeValue)
    
    // Try Web Playback SDK first if available and active
    if (isPremium && isWebPlaybackReady && setWebVolume) {
      const success = await setWebVolume(volumeValue)
      if (success) return
    }
    
    // Fallback to Spotify API
    if (setSpotifyVolume) {
      await setSpotifyVolume(volumeValue)
    }
  }, [isPremium, isWebPlaybackReady, setWebVolume, setSpotifyVolume])

  // Sync volume from external changes (keyboard/buttons)
  useEffect(() => {
    if (playbackState?.device?.volume_percent !== undefined) {
      setLocalVolume(playbackState.device.volume_percent)
    } else if (webVolume !== undefined) {
      setLocalVolume(webVolume)
    }
  }, [playbackState?.device?.volume_percent, webVolume])

  // Poll volume more frequently to catch external changes (keyboard, physical buttons)
  useEffect(() => {
    if (!isAuthenticated || !isPremium) return

    const pollVolume = async () => {
      // Only poll if we have a valid playback state
      if (playbackState?.device?.id) {
        // This will trigger a refresh of playback state which includes volume
        // The volume update will be handled by the useEffect above
      }
    }

    // Poll every 2 seconds when active to catch external volume changes
    const interval = setInterval(pollVolume, 2000)
    return () => clearInterval(interval)
  }, [isAuthenticated, isPremium, playbackState?.device?.id])

  const handleSkipNext = useCallback(() => {
    runTrackTransition(skipToNext)
  }, [runTrackTransition, skipToNext])

  const handleSkipPrevious = useCallback(() => {
    runTrackTransition(skipToPrevious)
  }, [runTrackTransition, skipToPrevious])
  
  // Handle needle dragging for play/pause
  const handleNeedleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingNeedle(true)
  }
  
  const handleNeedleDragEnd = useCallback(async (e: MouseEvent) => {
    if (!isDraggingNeedle) return
    
    setIsDraggingNeedle(false)
    
    // Get the record element position
    const recordElement = document.getElementById('vinyl-record')
    if (!recordElement) return
    
    const rect = recordElement.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate distance from cursor to record center
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + 
      Math.pow(e.clientY - centerY, 2)
    )
    
    // If needle is on the record (within radius), play; otherwise pause
    const recordRadius = rect.width / 2
    const onRecord = distance < recordRadius * 0.9 // 90% of radius to account for edge
    
    if (onRecord && !playbackState?.is_playing) {
      await play()
    } else if (!onRecord && playbackState?.is_playing) {
      await pause()
    }
  }, [isDraggingNeedle, playbackState?.is_playing, play, pause])
  
  const handleNeedleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingNeedle) return
    
    // Calculate angle based on mouse position
    const tonearmElement = document.getElementById('tonearm-container')
    if (!tonearmElement) return
    
    const rect = tonearmElement.getBoundingClientRect()
    const pivotX = rect.left + rect.width * 0.635 // Pivot at 63.5%
    const pivotY = rect.top + rect.height * 0.224 // Pivot at 22.4%
    
    const angle = Math.atan2(e.clientY - pivotY, e.clientX - pivotX) * (180 / Math.PI)
    
    // Constrain angle between -35 (rest) and 20 (inner)
    const constrainedAngle = Math.max(-35, Math.min(20, angle - 90))
    setTonearmAngle(constrainedAngle)
  }, [isDraggingNeedle])
  
  // Add drag event listeners
  useEffect(() => {
    if (isDraggingNeedle) {
      document.addEventListener('mousemove', handleNeedleMouseMove)
      document.addEventListener('mouseup', handleNeedleDragEnd)
      return () => {
        document.removeEventListener('mousemove', handleNeedleMouseMove)
        document.removeEventListener('mouseup', handleNeedleDragEnd)
      }
    }
  }, [isDraggingNeedle, handleNeedleMouseMove, handleNeedleDragEnd])

  const currentTrack = playbackState?.item || null
  const progress = currentTrack ? (playbackState.progress_ms / currentTrack.duration_ms) * 100 : 0

  // Update displayed track (for animations)
  useEffect(() => {
    if (!isTransitioning && currentTrack) {
      setDisplayedTrack(currentTrack)
    }
  }, [currentTrack, isTransitioning])

  // Detect automatic track changes
  useEffect(() => {
    if (currentTrack && previousTrackId && currentTrack.id !== previousTrackId && !isTransitioning) {
      // Track changed automatically (song ended)
      runTrackTransition(async () => {
        // Just wait for the new track to be ready
        return true
      })
    }
    if (currentTrack) {
      setPreviousTrackId(currentTrack.id)
    }
  }, [currentTrack, previousTrackId, isTransitioning, runTrackTransition])

  // Generate album gradient when theme is 'album' and track changes
  useEffect(() => {
    if (theme === 'album' && currentTrack?.album?.images?.[0]?.url) {
      generateAlbumGradient(currentTrack.album.images[0].url)
        .then(gradient => {
          setAlbumGradient(gradient)
        })
        .catch(() => {
          // Fallback gradient on error
          setAlbumGradient('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
        })
    }
  }, [theme, currentTrack?.album?.images, setAlbumGradient])

  // Show loading state when checking for playback
  if (isLoading && isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--vinyl-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Spotify...</p>
        </div>
      </div>
    )
  }

  if (!isDesktop) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Open on desktop.</h1>
          <p className="text-muted-foreground text-lg">I have a life. No mobile optimization here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--vinyl-bg)' }}>
      {/* Spotify Connect Device Selector */}
      {isAuthenticated && playbackState && (
        <SpotifyConnect
          devices={devices}
          currentDevice={playbackState.device}
          onTransferPlayback={transferPlayback}
          isPremium={isPremium}
        />
      )}
      
      {/* Header with Spotify Auth */}
      <div className="absolute top-4 right-4 z-50">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user?.images?.[0]?.url} />
                  <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{user?.display_name}</span>
                {isPremium && (
                  <Badge variant="secondary" className="text-xs">Premium</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {/* System Status Section */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">System Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      getSystemStatus().overall === 'success' ? 'status-dot-success' :
                      getSystemStatus().overall === 'warning' ? 'status-dot-warning' :
                      'status-dot-error'
                    }`} />
                    <span className="text-xs text-muted-foreground font-medium">
                      {getSystemStatus().overall === 'success' ? 'All systems go' :
                       getSystemStatus().overall === 'warning' ? 'Minor issues' :
                       'Critical error'}
                    </span>
                  </div>
                </div>
                
                {/* Individual status checks */}
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Spotify Client ID</span>
                    <div className={`w-2 h-2 rounded-full ${
                      getSystemStatus().checks.spotifyClientId ? 'status-dot-success' : 'status-dot-error'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Spotify Client Secret</span>
                    <div className={`w-2 h-2 rounded-full ${
                      getSystemStatus().checks.spotifyClientSecret ? 'status-dot-success' : 'status-dot-error'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Authentication</span>
                    <div className={`w-2 h-2 rounded-full ${
                      getSystemStatus().checks.authenticated ? 'status-dot-success' : 'status-dot-warning'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Theme Cache</span>
                    <div className={`w-2 h-2 rounded-full ${
                      getSystemStatus().checks.themeCache ? 'status-dot-success' : 'status-dot-warning'
                    }`} />
                  </div>
                  {isPremium && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Web Playback SDK</span>
                      <div className={`w-2 h-2 rounded-full ${
                        getSystemStatus().checks.webPlayback ? 'status-dot-success' : 'status-dot-warning'
                      }`} />
                    </div>
                  )}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              {!isPremium && (
                <>
                  <DropdownMenuItem disabled className="text-xs">
                    <Music className="mr-2 h-3 w-3" />
                    Free Account - Playback Limited
                  </DropdownMenuItem>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Control playback from Spotify app
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            asChild 
            className="bg-black hover:bg-gray-900 text-white px-6 py-2"
          >
            <a href="/api/auth/spotify/login" className="flex items-center gap-3">
              <Image
                src="/Spotify_Primary_Logo_RGB_Green.png"
                alt="Spotify"
                width={20}
                height={20}
                className="object-contain"
              />
              <span>Sign in with Spotify</span>
            </a>
          </Button>
        )}
      </div>

      {/* Main turntable area with padding */}
      <div className="flex-1 flex items-center justify-center p-12 lg:p-16 xl:p-20">
        <div className="w-full h-full max-w-[1600px] max-h-[800px] relative">
          {/* Responsive container - side by side when wide, stacked when narrow */}
          <div className="flex flex-col xl:flex-row items-center justify-center gap-8 xl:gap-16 h-full relative z-10">
            {/* Album cover - scales with viewport */}
            <div className="relative flex-shrink-0 order-2 xl:order-1 w-full xl:w-auto h-[40vh] xl:h-[60vh] max-h-[500px]">
              <div 
                className="relative h-full aspect-square mx-auto overflow-hidden cursor-pointer"
                onMouseEnter={() => setAlbumHover(true)}
                onMouseLeave={() => setAlbumHover(false)}
                style={{
                  transform: albumHover ? 'translateY(-10px) rotateX(5deg) rotateY(-5deg)' : 'none',
                  transition: 'transform 0.3s ease-out',
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <Image
                  src={displayedTrack?.album.images[0]?.url || currentTrack?.album.images[0]?.url || "/placeholder_album.png"}
                  alt="Album Cover"
                  fill
                  className="object-cover rounded-lg"
                  style={{
                    boxShadow: albumHover 
                      ? '0 30px 60px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.2)' 
                      : '0 25px 50px rgba(0,0,0,0.3)',
                    opacity: albumOpacity,
                    transition: 'opacity 0.5s ease-in-out, box-shadow 0.3s ease-out',
                  }}
                  priority
                />
              </div>
            </div>

            {/* Vinyl record and tonearm container - scales with viewport */}
            <div className="relative flex-shrink-0 order-1 xl:order-2 w-full xl:w-auto h-[40vh] xl:h-[60vh] max-h-[500px]">
              <div className="relative h-full aspect-square mx-auto">
                {/* Vinyl record using record.svg */}
                <div
                  id="vinyl-record"
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(${recordPosition}%) rotate(${rotation}deg)`,
                    transition: isTransitioning 
                      ? `transform 0.35s cubic-bezier(0.4, 0, 0.6, 1)` 
                      : playbackState?.is_playing 
                        ? "none" 
                        : "transform 0.3s ease-out",
                  }}
                >
                  <Image
                    src="/record.svg"
                    alt="Vinyl Record"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                  
                  {/* Center label overlay - blurred dark album cover with curved text */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32%] h-[32%] rounded-full shadow-lg overflow-hidden">
                    {displayedTrack || currentTrack ? (
                      <>
                        {/* Blurred dark album cover background */}
                        <div className="absolute inset-0">
                          <Image
                            src={(displayedTrack || currentTrack).album.images[0]?.url || "/placeholder_album.png"}
                            alt=""
                            fill
                            className="object-cover"
                            style={{
                              filter: "blur(8px) brightness(0.3)",
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40" />
                        </div>
                        
                        {/* Content overlay */}
                        <div className="relative h-full w-full flex items-center justify-center">
                          {/* Curved song title text */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                            <defs>
                              <path
                                id="circle-path"
                                d="M 50,50 m -35,0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                              />
                            </defs>
                            <text className="fill-white uppercase" style={{ fontSize: "5px", letterSpacing: "0.5px", fontWeight: "600" }}>
                              <textPath href="#circle-path" startOffset="50%" textAnchor="middle">
                                {(() => {
                                  const title = (displayedTrack || currentTrack).name.toUpperCase();
                                  // If title is too long, truncate and add ellipsis
                                  return title.length > 40 ? title.substring(0, 37) + "..." : title;
                                })()}
                              </textPath>
                            </text>
                          </svg>
                          
                          {/* Center content - Artist and Year */}
                          <div className="text-center z-10">
                            <div className="text-[0.6rem] lg:text-[10px] font-semibold text-white uppercase tracking-wider">
                              {(displayedTrack || currentTrack).artists[0].name}
                            </div>
                            <div className="text-[0.5rem] lg:text-[9px] text-white/80 uppercase mt-0.5">
                              {(displayedTrack || currentTrack).album.release_date?.split('-')[0]}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-800 h-full w-full flex items-center justify-center">
                        <div className="text-[0.6rem] lg:text-[10px] text-gray-400">
                          {isAuthenticated ? "No track playing" : "Sign in to play"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tonearm container - fixed position */}
                <div 
                  id="tonearm-container"
                  className="absolute"
                  style={{
                    right: "-30%",
                    top: "0",
                    width: "70%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  {/* Tonearm SVG with rotation around pivot */}
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${tonearmAngle}deg)`,
                      // Pivot point at 63.5% from left, 22.4% from top (based on SVG pivot element position)
                      transformOrigin: "63.5% 22.4%",
                      transition: isDraggingNeedle ? "none" : isTransitioning ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : playbackState?.is_playing ? "transform 0.3s ease-out" : "transform 0.8s ease-in-out",
                    }}
                  >
                    <Image
                      src="/tonearm.svg"
                      alt="Tonearm"
                      fill
                      className="object-contain drop-shadow-lg"
                      style={{
                        objectPosition: "center",
                      }}
                      priority
                    />
                    {/* Draggable needle area */}
                    <div
                      className="absolute"
                      style={{
                        left: '8%',
                        top: '75%',
                        width: '15%',
                        height: '15%',
                        cursor: isDraggingNeedle ? 'grabbing' : 'grab',
                        pointerEvents: 'auto',
                        zIndex: 10,
                      }}
                      onMouseDown={handleNeedleDragStart}
                      title="Drag needle to play/pause"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="fixed bottom-0 left-0 right-0 h-18 px-6 flex items-center justify-between" style={{
        backgroundColor: theme === 'album' ? 'rgba(255, 255, 255, 0.95)' : 'var(--card)',
        borderTop: theme === 'album' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid var(--border)',
        color: theme === 'album' ? '#000' : (theme === 'dark' || theme === 'amoled') ? '#fff' : 'var(--card-foreground)',
        backdropFilter: 'none',
        opacity: 1
      }}>
        {/* Left: Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {currentTrack ? (
            <>
              <div className="relative w-12 h-12 rounded overflow-hidden shadow-sm">
                <Image
                  src={currentTrack.album.images[0]?.url || "/placeholder_album.png"}
                  alt="Album Thumbnail"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{
                  color: theme === 'album' ? '#000' : (theme === 'dark' || theme === 'amoled') ? '#fff' : undefined
                }}>
                  {currentTrack.name} • {currentTrack.artists.map((a: any) => a.name).join(", ")}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-12 h-12 rounded overflow-hidden shadow-sm">
                <Image
                  src="/placeholder_album.png"
                  alt="Album Placeholder"
                  fill
                  className="object-cover opacity-50"
                />
              </div>
              <div className="text-sm text-gray-500">
                {isAuthenticated ? "No track playing" : "Sign in to see what's playing"}
              </div>
            </>
          )}
        </div>

        {/* Center: Transport controls */}
        <div className="flex items-center gap-4 flex-1 justify-center">
          {/* Previous track info */}
          {queue?.previous && (
            <div className="hidden lg:flex items-center gap-2 mr-4 opacity-60">
              <Image
                src={queue.previous.album.images[0]?.url || "/placeholder_album.png"}
                alt="Previous"
                width={32}
                height={32}
                className="rounded"
              />
              <div className="text-xs text-gray-600 max-w-[100px]">
                <p className="truncate font-medium">{queue.previous.name}</p>
                <p className="truncate opacity-75">{queue.previous.artists[0].name}</p>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipPrevious}
            disabled={!isAuthenticated || (!isPremium && !playbackState?.is_playing) || isTransitioning}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePlayPause} 
            className="w-10 h-10 rounded-full"
            disabled={!isAuthenticated || (!isPremium && !playbackState?.item) || isTransitioning}
          >
            {playbackState?.is_playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipNext}
            disabled={!isAuthenticated || (!isPremium && !playbackState?.is_playing) || isTransitioning}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          
          {/* Next track info */}
          {queue?.next && (
            <div className="hidden lg:flex items-center gap-2 ml-4 opacity-60">
              <Image
                src={queue.next.album.images[0]?.url || "/placeholder_album.png"}
                alt="Next"
                width={32}
                height={32}
                className="rounded"
              />
              <div className="text-xs text-gray-600 max-w-[100px]">
                <p className="truncate font-medium">{queue.next.name}</p>
                <p className="truncate opacity-75">{queue.next.artists[0].name}</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {currentTrack && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs w-10 text-right" style={{
                color: theme === 'album' ? 'rgba(0,0,0,0.6)' : (theme === 'dark' || theme === 'amoled') ? 'rgba(255,255,255,0.6)' : undefined
              }}>
                {formatTime(playbackState?.progress_ms || 0)}
              </span>
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                className="w-32"
                disabled
              />
              <span className="text-xs w-10" style={{
                color: theme === 'album' ? 'rgba(0,0,0,0.6)' : (theme === 'dark' || theme === 'amoled') ? 'rgba(255,255,255,0.6)' : undefined
              }}>
                -{formatTime((currentTrack.duration_ms - (playbackState?.progress_ms || 0)))}
              </span>
            </div>
          )}
        </div>

        {/* Right: Volume and settings */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {playbackState?.device && (
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" style={{
                color: theme === 'album' ? 'rgba(0,0,0,0.6)' : (theme === 'dark' || theme === 'amoled') ? 'rgba(255,255,255,0.6)' : undefined
              }} />
              <Slider 
                value={[localVolume]} 
                max={100} 
                className="w-20"
                disabled={!isPremium}
                onValueChange={handleVolumeChange}
              />
              <span className="text-xs w-8 text-center" style={{
                color: theme === 'album' ? 'rgba(0,0,0,0.6)' : (theme === 'dark' || theme === 'amoled') ? 'rgba(255,255,255,0.6)' : undefined
              }}>
                {Math.round(localVolume)}
              </span>
            </div>
          )}
          {isPremium && isWebPlaybackReady && (
            <RecentItemsPopup onPlay={playUri} isPremium={isPremium} />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-3">Choose Theme</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'white', name: 'Light', preview: () => (
                      <div className="w-full h-12 bg-white border border-gray-200 rounded-md overflow-hidden">
                        <div className="h-2 bg-gray-50 border-b border-gray-100"></div>
                        <div className="p-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-gray-100 rounded"></div>
                            <div className="flex-1 space-y-0.5">
                              <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-1 bg-gray-100 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="flex justify-center gap-0.5 mt-1">
                            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                            <div className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
                            <div className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    )},
                    { id: 'dark', name: 'Dark', preview: () => (
                      <div className="w-full h-12 rounded-md overflow-hidden" style={{ backgroundColor: '#262624', border: '1px solid #3a3a37' }}>
                        <div className="h-2 border-b" style={{ backgroundColor: '#2d2d2a', borderColor: '#3a3a37' }}></div>
                        <div className="p-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#333330' }}></div>
                            <div className="flex-1 space-y-0.5">
                              <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: '#f5f5f5' }}></div>
                              <div className="h-1 rounded w-1/2" style={{ backgroundColor: '#b3b3b3' }}></div>
                            </div>
                          </div>
                          <div className="flex justify-center gap-0.5 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f5f5f5' }}></div>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#333330' }}></div>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#333330' }}></div>
                          </div>
                        </div>
                      </div>
                    )},
                    { id: 'amoled', name: 'AMOLED', preview: () => (
                      <div className="w-full h-12 bg-black border border-gray-800 rounded-md overflow-hidden">
                        <div className="h-2 bg-black border-b border-gray-800"></div>
                        <div className="p-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-gray-900 rounded"></div>
                            <div className="flex-1 space-y-0.5">
                              <div className="h-1.5 bg-gray-800 rounded w-3/4"></div>
                              <div className="h-1 bg-gray-900 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="flex justify-center gap-0.5 mt-1">
                            <div className="w-2.5 h-2.5 bg-gray-700 rounded-full"></div>
                            <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                            <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    )},
                    { id: 'album', name: 'Album', preview: () => (
                      <div className="w-full h-12 rounded-md overflow-hidden relative">
                        {currentTrack?.album?.images?.[0]?.url ? (
                          <>
                            <div 
                              className="absolute inset-0 bg-gradient-to-br from-purple-500/80 via-pink-500/80 to-blue-500/80"
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(139, 69, 19, 0.8), rgba(160, 82, 45, 0.8), rgba(210, 180, 140, 0.8))`,
                              }}
                            ></div>
                            <div className="relative z-10 h-2 bg-black/20 border-b border-white/20"></div>
                            <div className="relative z-10 p-1.5 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 bg-white/20 rounded border border-white/30"></div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-1.5 bg-white/30 rounded w-3/4"></div>
                                  <div className="h-1 bg-white/20 rounded w-1/2"></div>
                                </div>
                              </div>
                              <div className="flex justify-center gap-0.5 mt-1">
                                <div className="w-2.5 h-2.5 bg-white/40 rounded-full"></div>
                                <div className="w-2.5 h-2.5 bg-white/20 rounded-full"></div>
                                <div className="w-2.5 h-2.5 bg-white/20 rounded-full"></div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500"></div>
                            <div className="relative z-10 h-2 bg-black/20 border-b border-white/20"></div>
                            <div className="relative z-10 p-1.5 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 bg-white/20 rounded border border-white/30"></div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-1.5 bg-white/30 rounded w-3/4"></div>
                                  <div className="h-1 bg-white/20 rounded w-1/2"></div>
                                </div>
                              </div>
                              <div className="flex justify-center gap-0.5 mt-1">
                                <div className="w-2.5 h-2.5 bg-white/40 rounded-full"></div>
                                <div className="w-2.5 h-2.5 bg-white/20 rounded-full"></div>
                                <div className="w-2.5 h-2.5 bg-white/20 rounded-full"></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )},
                    { id: 'orange', name: 'Orange', preview: () => (
                      <div className="w-full h-12 rounded-md overflow-hidden" style={{ backgroundColor: '#fb8500' }}>
                        <div className="h-2 border-b" style={{ backgroundColor: '#f77f00', borderColor: '#f77f00' }}></div>
                        <div className="p-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffb703' }}></div>
                            <div className="flex-1 space-y-0.5">
                              <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: '#241E1C' }}></div>
                              <div className="h-1 rounded w-1/2" style={{ backgroundColor: '#3D342F' }}></div>
                            </div>
                          </div>
                          <div className="flex justify-center gap-0.5 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#241E1C' }}></div>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3D342F' }}></div>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3D342F' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id as any)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group relative"
                    >
                      <div className="w-16 h-12 flex-shrink-0">
                        {themeOption.preview()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{themeOption.name}</p>
                          {theme === themeOption.id && (
                            <div className="w-4 h-4 text-green-600">✓</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error/Info Messages */}
      {error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      
      {isAuthenticated && !isPremium && !error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          Free account: Play music in Spotify app to see it here
        </div>
      )}
    </div>
  )
}