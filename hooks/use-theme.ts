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
      
      // For album theme, apply the gradient and determine text color
      if (theme === 'album') {
        if (albumGradient) {
          root.style.setProperty('--album-gradient', albumGradient)
          
          // Extract the first color from the gradient to determine text color
          const firstColorMatch = albumGradient.match(/rgb\(\d+,\s*\d+,\s*\d+\)/)
          if (firstColorMatch) {
            const contrastColor = getContrastColor(firstColorMatch[0])
            root.style.setProperty('--album-text-color', contrastColor === 'light' ? '#ffffff' : '#000000')
            root.style.setProperty('--album-bg-color', contrastColor === 'light' ? '#000000' : '#ffffff')
          } else {
            root.style.setProperty('--album-text-color', '#ffffff')
            root.style.setProperty('--album-bg-color', '#000000')
          }
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

  const setAlbumBackgroundUrl = useCallback((url: string | null) => {
    setAlbumBackgroundUrlState(url)
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem(ALBUM_BG_URL_STORAGE_KEY, url)
      } else {
        localStorage.removeItem(ALBUM_BG_URL_STORAGE_KEY)
      }
    }
  }, [])

  return {
    theme,
    setTheme,
    albumGradient,
    setAlbumGradient,
    albumBackgroundUrl,
    setAlbumBackgroundUrl
  }
}

// Utility function to extract dominant colors from an image and generate a gradient
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
      
      // Scale down for performance while maintaining quality
      const maxSize = 100
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Extract all pixels and group by color similarity
        const colorMap = new Map()
        const step = 4 // Sample every 4th pixel for performance
        
        for (let i = 0; i < data.length; i += step * 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          
          // Skip transparent pixels
          if (a < 128) continue
          
          // Group similar colors together (reduce precision)
          const bucket = `${Math.floor(r/20)*20},${Math.floor(g/20)*20},${Math.floor(b/20)*20}`
          colorMap.set(bucket, (colorMap.get(bucket) || 0) + 1)
        }
        
        // Sort colors by frequency and get top colors
        const sortedColors = Array.from(colorMap.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number)
            return { r, g, b }
          })
        
        if (sortedColors.length === 0) {
          resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
          return
        }
        
        // Enhance saturation and create more vibrant colors
        const enhancedColors = sortedColors.map(({r, g, b}) => {
          // Convert to HSL for better color manipulation
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const diff = max - min
          const sum = max + min
          const lightness = sum / 2
          
          // Boost saturation and adjust lightness for better gradients
          let newR = r, newG = g, newB = b
          
          if (diff > 0) {
            const saturation = diff / (sum > 255 ? 2 - sum / 255 : sum / 255)
            const boostedSat = Math.min(saturation * 1.4, 1)
            
            // Enhance the most prominent color channel
            if (r >= g && r >= b) {
              newR = Math.min(255, r * 1.2)
            } else if (g >= r && g >= b) {
              newG = Math.min(255, g * 1.2)
            } else {
              newB = Math.min(255, b * 1.2)
            }
          }
          
          return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`
        })
        
        // Create a multi-stop gradient with the extracted colors
        let gradient
        if (enhancedColors.length >= 3) {
          gradient = `linear-gradient(135deg, ${enhancedColors[0]} 0%, ${enhancedColors[1]} 40%, ${enhancedColors[2]} 100%)`
        } else if (enhancedColors.length === 2) {
          gradient = `linear-gradient(135deg, ${enhancedColors[0]} 0%, ${enhancedColors[1]} 100%)`
        } else {
          gradient = `linear-gradient(135deg, ${enhancedColors[0]} 0%, ${enhancedColors[0]} 100%)`
        }
        
        resolve(gradient)
      } catch (error) {
        console.error('Error extracting colors:', error)
        resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
      }
    }
    
    img.onerror = () => {
      resolve('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    }
    
    img.src = imageUrl
  })
}

// Utility function to determine if a color is light or dark
export function getContrastColor(backgroundColor: string): 'light' | 'dark' {
  // Extract RGB values from various color formats
  let r, g, b
  
  if (backgroundColor.startsWith('rgb')) {
    const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      r = parseInt(match[1])
      g = parseInt(match[2])
      b = parseInt(match[3])
    }
  } else if (backgroundColor.startsWith('#')) {
    const hex = backgroundColor.slice(1)
    r = parseInt(hex.substr(0, 2), 16)
    g = parseInt(hex.substr(2, 2), 16)
    b = parseInt(hex.substr(4, 2), 16)
  }
  
  if (r === undefined || g === undefined || b === undefined) {
    return 'dark' // Default to dark text
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'dark' : 'light'
}
