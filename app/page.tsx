"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Volume2, MoreHorizontal } from "lucide-react"
import Image from "next/image"

// Mock data for demonstration
const mockTrack = {
  id: "1",
  name: "Bohemian Rhapsody",
  artists: [{ name: "Queen" }],
  album: {
    name: "A Night at the Opera",
    images: [{ url: "/queen-a-night-at-the-opera.png" }],
    release_date: "1975",
  },
  duration_ms: 355000,
  explicit: false,
}

export default function VinylPlayer() {
  const [isDesktop, setIsDesktop] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(75)
  const [rotation, setRotation] = useState(0)
  const [tonearmAngle, setTonearmAngle] = useState(-35) // Start at rest position
  const animationRef = useRef<number>()

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
      if (isPlaying) {
        // Realistic vinyl rotation: 33 1/3 RPM = 0.556 rotations per second
        // At 60fps, that's about 3.33 degrees per frame
        setRotation((prev) => (prev + 3.33) % 360)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  // Tonearm animation based on play state and progress
  useEffect(() => {
    if (isPlaying) {
      // When playing, tonearm moves in and tracks progress
      // Starting at outer edge (-10°) to inner track (20°)
      const targetAngle = -10 + (30 * (progress / 100))
      setTonearmAngle(targetAngle)
    } else {
      // When paused, tonearm moves out to rest position (completely outside record)
      setTonearmAngle(-35)
    }
  }, [isPlaying, progress])

  // Mock progress simulation
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.1))
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const currentTime = (progress / 100) * mockTrack.duration_ms
  const remainingTime = mockTrack.duration_ms - currentTime

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
      {/* Main turntable area with padding */}
      <div className="flex-1 flex items-center justify-center p-12 lg:p-16 xl:p-20">
        <div className="w-full h-full max-w-[1600px] max-h-[800px]">
          {/* Responsive container - side by side when wide, stacked when narrow */}
          <div className="flex flex-col xl:flex-row items-center justify-center gap-8 xl:gap-16 h-full">
            {/* Album cover - scales with viewport */}
            <div className="relative flex-shrink-0 order-2 xl:order-1 w-full xl:w-auto h-[40vh] xl:h-[60vh] max-h-[500px]">
              <div className="relative h-full aspect-square mx-auto">
                <Image
                  src={mockTrack.album.images[0].url}
                  alt="Album Cover"
                  fill
                  className="object-cover rounded-lg shadow-2xl"
                  style={{
                    filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.3))",
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
                    transform: `rotate(${rotation}deg)`,
                    transition: isPlaying ? "none" : "transform 0.3s ease-out",
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
                    <div className="text-[0.7rem] lg:text-xs font-semibold text-gray-900 mb-1 truncate w-full">{mockTrack.name}</div>
                    <div className="text-[0.6rem] lg:text-[10px] text-gray-600 truncate w-full">{mockTrack.artists[0].name}</div>
                    <div className="text-[0.6rem] lg:text-[10px] text-gray-500 truncate w-full">{mockTrack.album.name}</div>
                    <div className="text-[0.5rem] lg:text-[9px] text-gray-400 mt-1">{mockTrack.album.release_date}</div>
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
                      transition: isPlaying ? "transform 0.3s ease-out" : "transform 0.8s ease-in-out",
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
          <div className="relative w-12 h-12 rounded overflow-hidden shadow-sm">
            <Image
              src={mockTrack.album.images[0].url}
              alt="Album Thumbnail"
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {mockTrack.name} • {mockTrack.artists[0].name}
            </div>
          </div>
        </div>

        {/* Center: Transport controls */}
        <div className="flex items-center gap-4 flex-1 justify-center">
          <Button variant="ghost" size="sm">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="sm">
            <SkipForward className="w-4 h-4" />
          </Button>

          {/* Progress bar */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-500 w-10 text-right">{formatTime(currentTime)}</span>
            <Slider
              value={[progress]}
              onValueChange={(value) => setProgress(value[0])}
              max={100}
              step={0.1}
              className="w-32"
            />
            <span className="text-xs text-gray-500 w-10">-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Right: Volume and settings */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <Slider value={[volume]} onValueChange={(value) => setVolume(value[0])} max={100} className="w-20" />
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}