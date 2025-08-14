'use client'

import { useState, useEffect, useCallback } from 'react'

export type ThemeType = 'white' | 'dark' | 'amoled' | 'album' | 'orange'

interface UseThemeReturn {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
  albumGradient: string | null
  setAlbumGradient: (gradient: string | null) => void
  albumBackgroundUrl: string | null
  setAlbumBackgroundUrl: (url: string | null) => void
}

const THEME_STORAGE_KEY = 'vinyl-theme'
const ALBUM_GRADIENT_STORAGE_KEY = 'vinyl-album-gradient'
const ALBUM_BG_URL_STORAGE_KEY = 'vinyl-album-bg-url'

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeType>('white')
  const [albumGradient, setAlbumGradientState] = useState<string | null>(null)
  const [albumBackgroundUrl, setAlbumBackgroundUrlState] = useState<string | null>(null)

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType
      const savedGradient = localStorage.getItem(ALBUM_GRADIENT_STORAGE_KEY)
      const savedBgUrl = localStorage.getItem(ALBUM_BG_URL_STORAGE_KEY)
      
      if (savedTheme && ['white', 'dark', 'amoled', 'album', 'orange'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
      
      if (savedGradient) {
        setAlbumGradientState(savedGradient)
      }
      
      if (savedBgUrl) {
        setAlbumBackgroundUrlState(savedBgUrl)
      }
    }
  }, [])

  // Apply theme to document root
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      // Remove all theme classes
      root.classList.remove('theme-white', 'theme-dark', 'theme-amoled', 'theme-album', 'theme-orange')
      
      // Add current theme class
      root.classList.add(`theme-${theme}`)
      
      // For album theme, apply the gradient and background URL if available
      if (theme === 'album') {
        if (albumGradient) {
          root.style.setProperty('--album-gradient', albumGradient)
        }
        if (albumBackgroundUrl) {
          root.style.setProperty('--album-bg-url', albumBackgroundUrl)
        }
      }
    }
  }, [theme, albumGradient])

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    }
  }, [])

  const setAlbumGradient = useCallback((gradient: string | null) => {
    setAlbumGradientState(gradient)
    if (typeof window !== 'undefined') {
      if (gradient) {
        localStorage.setItem(ALBUM_GRADIENT_STORAGE_KEY, gradient)
      } else {
        localStorage.removeItem(ALBUM_GRADIENT_STORAGE_KEY)
      }
    }
  }, [])

  return {
    theme,
    setTheme,
    albumGradient,
    setAlbumGradient
  }
}

// Utility function to extract colors from an image and generate a gradient
export async function generateAlbumGradient(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
        return
      }
      
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      try {
        // Sample colors from different regions of the image
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Sample from corners and center
        const samples = [
          [0, 0], // top-left
          [canvas.width - 1, 0], // top-right
          [0, canvas.height - 1], // bottom-left
          [canvas.width - 1, canvas.height - 1], // bottom-right
          [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)] // center
        ]
        
        const colors = samples.map(([x, y]) => {
          const index = (y * canvas.width + x) * 4
          const r = data[index]
          const g = data[index + 1]
          const b = data[index + 2]
          return `rgb(${r}, ${g}, ${b})`
        })
        
        // Create a gradient using the extracted colors
        const gradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[4]} 50%, ${colors[3]} 100%)`
        resolve(gradient)
      } catch (error) {
        // Fallback gradient if color extraction fails
        resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
      }
    }
    
    img.onerror = () => {
      resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    }
    
    img.src = imageUrl
  })
}
