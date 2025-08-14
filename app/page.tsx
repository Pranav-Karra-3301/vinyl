"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Volume2, MoreHorizontal, LogOut, Music } from "lucide-react"
import Image from "next/image"
import { useSpotify } from "@/hooks/use-spotify"
import { useWebPlayback } from "@/hooks/use-web-playback"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { RecentItemsPopup } from "@/components/recent-items-popup"
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
    isLoading,
    error,
    accessToken,
    isAuthenticated,
    isPremium,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    logout
  } = useSpotify()

  // Web Playback SDK for premium users
  const { playUri, isReady: isWebPlaybackReady } = useWebPlayback(accessToken, isPremium)

  // Dynamic title and favicon based on current track
  useDynamicTitle({
    currentTrack: currentTrack,
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
    if (isTransitioning) {
      // During transition, tonearm position is controlled by animation phase
      if (animationPhase === 'lifting' || animationPhase === 'retracting' || 
          animationPhase === 'fading-out' || animationPhase === 'fading-in' || 
          animationPhase === 'extending') {
        setTonearmAngle(-35) // Rest position
      } else if (animationPhase === 'lowering') {
        setTonearmAngle(-10) // Start of record
      }
    } else if (playbackState?.is_playing && playbackState.item) {
      // Calculate progress percentage
      const progress = (playbackState.progress_ms / playbackState.item.duration_ms) * 100
      // When playing, tonearm moves in and tracks progress
      // Starting at outer edge (-10°) to inner track (20°)
      const targetAngle = -10 + (30 * (progress / 100))
      setTonearmAngle(targetAngle)
    } else {
      // When paused, tonearm moves out to rest position
      setTonearmAngle(-35)
    }
  }, [playbackState, isTransitioning, animationPhase])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Animation sequence for track transitions
  const runTrackTransition = useCallback(async (skipAction: () => Promise<boolean>) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    
    // Phase 1: Lift tonearm (500ms)
    setAnimationPhase('lifting')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Phase 2: Retract record into album (800ms)
    setAnimationPhase('retracting')
    setRecordPosition(-100)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Phase 3: Fade out album (500ms)
    setAnimationPhase('fading-out')
    setAlbumOpacity(0)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Execute the skip action during fade
    const success = await skipAction()
    if (!success) {
      // Reset if skip failed
      setAlbumOpacity(1)
      setRecordPosition(0)
      setIsTransitioning(false)
      setAnimationPhase('idle')
      return
    }
    
    // Wait for new track data to load
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Phase 4: Fade in new album (500ms)
    setAnimationPhase('fading-in')
    setAlbumOpacity(1)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Phase 5: Extend record from album (800ms)
    setAnimationPhase('extending')
    setRecordPosition(0)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Phase 6: Lower tonearm (500ms)
    setAnimationPhase('lowering')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Phase 7: Complete and start playback (1000ms delay)
    setAnimationPhase('complete')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Resume playback
    await play()
    
    setIsTransitioning(false)
    setAnimationPhase('idle')
  }, [isTransitioning, play])

  const handlePlayPause = async () => {
    if (isTransitioning) return
    
    if (playbackState?.is_playing) {
      await pause()
    } else {
      await play()
    }
  }

  const handleSkipNext = useCallback(() => {
    runTrackTransition(skipToNext)
  }, [runTrackTransition, skipToNext])

  const handleSkipPrevious = useCallback(() => {
    runTrackTransition(skipToPrevious)
  }, [runTrackTransition, skipToPrevious])

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

  // Show loading state when checking for playback
  if (isLoading && isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col">
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user?.email}
              </DropdownMenuItem>
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
              <div className="relative h-full aspect-square mx-auto overflow-hidden">
                <Image
                  src={displayedTrack?.album.images[0]?.url || currentTrack?.album.images[0]?.url || "/placeholder_album.png"}
                  alt="Album Cover"
                  fill
                  className="object-cover rounded-lg shadow-2xl"
                  style={{
                    filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.3))",
                    opacity: albumOpacity,
                    transition: "opacity 0.5s ease-in-out",
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
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(${recordPosition}%) rotate(${rotation}deg)`,
                    transition: isTransitioning 
                      ? `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)` 
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
                  
                  {/* Center label overlay - scales proportionally */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32%] h-[32%] rounded-full bg-white shadow-lg flex flex-col items-center justify-center text-center p-2">
                    {displayedTrack || currentTrack ? (
                      <>
                        <div className="text-[0.7rem] lg:text-xs font-semibold text-gray-900 mb-1 truncate w-full">
                          {(displayedTrack || currentTrack).name}
                        </div>
                        <div className="text-[0.6rem] lg:text-[10px] text-gray-600 truncate w-full">
                          {(displayedTrack || currentTrack).artists[0].name}
                        </div>
                        <div className="text-[0.6rem] lg:text-[10px] text-gray-500 truncate w-full">
                          {(displayedTrack || currentTrack).album.name}
                        </div>
                        <div className="text-[0.5rem] lg:text-[9px] text-gray-400 mt-1">
                          {(displayedTrack || currentTrack).album.release_date?.split('-')[0]}
                        </div>
                      </>
                    ) : (
                      <div className="text-[0.6rem] lg:text-[10px] text-gray-400">
                        {isAuthenticated ? "No track playing" : "Sign in to play"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tonearm container - fixed position */}
                <div 
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
                      transition: isTransitioning ? "transform 0.5s ease-in-out" : playbackState?.is_playing ? "transform 0.3s ease-out" : "transform 0.8s ease-in-out",
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="fixed bottom-0 left-0 right-0 h-18 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 flex items-center justify-between">
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
                <div className="text-sm font-medium text-gray-900 truncate">
                  {currentTrack.name} • {currentTrack.artists.map(a => a.name).join(", ")}
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
              <span className="text-xs text-gray-500 w-10 text-right">
                {formatTime(playbackState?.progress_ms || 0)}
              </span>
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                className="w-32"
                disabled
              />
              <span className="text-xs text-gray-500 w-10">
                -{formatTime((currentTrack.duration_ms - (playbackState?.progress_ms || 0)))}
              </span>
            </div>
          )}
        </div>

        {/* Right: Volume and settings */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {playbackState?.device && (
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-600" />
              <Slider 
                value={[playbackState.device.volume_percent || localVolume]} 
                max={100} 
                className="w-20"
                disabled={!isPremium}
              />
            </div>
          )}
          {isPremium && isWebPlaybackReady && (
            <RecentItemsPopup onPlay={playUri} isPremium={isPremium} />
          )}
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
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