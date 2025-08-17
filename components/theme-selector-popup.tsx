import { useState } from 'react'
import { Palette, Check, Disc } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VinylDesignType, getVinylDesignPath } from '@/hooks/use-theme'
import Image from 'next/image'

interface ThemeOption {
  id: string
  name: string
  preview: () => JSX.Element
}

interface VinylDesignOption {
  id: VinylDesignType
  name: string
  imagePath: string
}

interface ThemeSelectorPopupProps {
  currentTheme: string
  onThemeChange: (theme: string) => void
  currentAlbumImage?: string
  currentVinylDesign: VinylDesignType
  onVinylDesignChange: (design: VinylDesignType) => void
}

// Theme preview skeleton components
const WhiteThemePreview = () => (
  <div className="w-full h-16 bg-white border border-gray-200 rounded-md overflow-hidden">
    <div className="h-3 bg-gray-50 border-b border-gray-100"></div>
    <div className="p-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-100 rounded"></div>
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
          <div className="h-1.5 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  </div>
)

const DarkThemePreview = () => (
  <div className="w-full h-16 rounded-md overflow-hidden" style={{ backgroundColor: '#262624', border: '1px solid #3a3a37' }}>
    <div className="h-3 border-b" style={{ backgroundColor: '#2d2d2a', borderColor: '#3a3a37' }}></div>
    <div className="p-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#333330' }}></div>
        <div className="flex-1 space-y-1">
          <div className="h-2 rounded w-3/4" style={{ backgroundColor: '#f5f5f5' }}></div>
          <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: '#b3b3b3' }}></div>
        </div>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#f5f5f5' }}></div>
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#333330' }}></div>
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#333330' }}></div>
      </div>
    </div>
  </div>
)

const AmoledThemePreview = () => (
  <div className="w-full h-16 bg-black border border-gray-800 rounded-md overflow-hidden">
    <div className="h-3 bg-black border-b border-gray-800"></div>
    <div className="p-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-900 rounded"></div>
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-gray-800 rounded w-3/4"></div>
          <div className="h-1.5 bg-gray-900 rounded w-1/2"></div>
        </div>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        <div className="w-4 h-4 bg-gray-700 rounded-full"></div>
        <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
        <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  </div>
)

const AlbumThemePreview = ({ albumImage }: { albumImage?: string }) => (
  <div className="w-full h-16 rounded-md overflow-hidden relative">
    {albumImage ? (
      <>
        <div 
          className="absolute inset-0 bg-gradient-to-br from-purple-500/80 via-pink-500/80 to-blue-500/80"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(139, 69, 19, 0.8), rgba(160, 82, 45, 0.8), rgba(210, 180, 140, 0.8))`,
          }}
        ></div>
        <div className="relative z-10 h-3 bg-black/20 border-b border-white/20"></div>
        <div className="relative z-10 p-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded border border-white/30"></div>
            <div className="flex-1 space-y-1">
              <div className="h-2 bg-white/30 rounded w-3/4"></div>
              <div className="h-1.5 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex justify-center gap-1 mt-2">
            <div className="w-4 h-4 bg-white/40 rounded-full"></div>
            <div className="w-4 h-4 bg-white/20 rounded-full"></div>
            <div className="w-4 h-4 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </>
    ) : (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500"></div>
        <div className="relative z-10 h-3 bg-black/20 border-b border-white/20"></div>
        <div className="relative z-10 p-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded border border-white/30"></div>
            <div className="flex-1 space-y-1">
              <div className="h-2 bg-white/30 rounded w-3/4"></div>
              <div className="h-1.5 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex justify-center gap-1 mt-2">
            <div className="w-4 h-4 bg-white/40 rounded-full"></div>
            <div className="w-4 h-4 bg-white/20 rounded-full"></div>
            <div className="w-4 h-4 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </>
    )}
  </div>
)

const OrangeThemePreview = () => (
  <div className="w-full h-16 rounded-md overflow-hidden" style={{ backgroundColor: '#fb8500' }}>
    <div className="h-3 border-b" style={{ backgroundColor: '#f77f00', borderColor: '#f77f00' }}></div>
    <div className="p-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ffb703' }}></div>
        <div className="flex-1 space-y-1">
          <div className="h-2 rounded w-3/4" style={{ backgroundColor: '#241E1C' }}></div>
          <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: '#3D342F' }}></div>
        </div>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#241E1C' }}></div>
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3D342F' }}></div>
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3D342F' }}></div>
      </div>
    </div>
  </div>
)

export function ThemeSelectorPopup({ currentTheme, onThemeChange, currentAlbumImage, currentVinylDesign, onVinylDesignChange }: ThemeSelectorPopupProps) {
  const [isOpen, setIsOpen] = useState(false)

  const vinylDesignOptions: VinylDesignOption[] = [
    {
      id: 'default',
      name: 'Classic',
      imagePath: getVinylDesignPath('default')
    },
    {
      id: 'design1',
      name: 'Design 1',
      imagePath: getVinylDesignPath('design1')
    },
    {
      id: 'design2',
      name: 'Design 2',
      imagePath: getVinylDesignPath('design2')
    },
    {
      id: 'design3',
      name: 'Design 3',
      imagePath: getVinylDesignPath('design3')
    },
    {
      id: 'design4',
      name: 'Design 4',
      imagePath: getVinylDesignPath('design4')
    },
    {
      id: 'design5',
      name: 'Design 5',
      imagePath: getVinylDesignPath('design5')
    },
    {
      id: 'design6',
      name: 'Design 6',
      imagePath: getVinylDesignPath('design6')
    }
  ]

  const themeOptions: ThemeOption[] = [
    {
      id: 'white',
      name: 'Light',
      preview: () => <WhiteThemePreview />
    },
    {
      id: 'dark',
      name: 'Dark',
      preview: () => <DarkThemePreview />
    },
    {
      id: 'amoled',
      name: 'AMOLED',
      preview: () => <AmoledThemePreview />
    },
    {
      id: 'album',
      name: 'Album',
      preview: () => <AlbumThemePreview albumImage={currentAlbumImage} />
    },
    {
      id: 'orange',
      name: 'Orange',
      preview: () => <OrangeThemePreview />
    }
  ]

  const handleThemeSelect = (themeId: string) => {
    onThemeChange(themeId)
    setIsOpen(false)
  }

  const handleVinylDesignSelect = (designId: VinylDesignType) => {
    onVinylDesignChange(designId)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Themes</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-2">
            <TabsTrigger value="themes" className="gap-2">
              <Palette className="w-4 h-4" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="vinyl" className="gap-2">
              <Disc className="w-4 h-4" />
              Vinyl Designs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="themes" className="p-4 pt-0">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Choose Theme</h3>
              <div className="grid grid-cols-1 gap-3">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group relative"
                  >
                    <div className="w-20 h-16 flex-shrink-0">
                      {theme.preview()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{theme.name}</p>
                        {currentTheme === theme.id && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vinyl" className="p-4 pt-0">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Choose Vinyl Design</h3>
              <div className="grid grid-cols-2 gap-3">
                {vinylDesignOptions.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => handleVinylDesignSelect(design.id)}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group relative"
                  >
                    <div className="w-12 h-12 relative flex-shrink-0">
                      <Image
                        src={design.imagePath}
                        alt={design.name}
                        fill
                        className="object-contain rounded-full"
                        style={{
                          animation: 'spin 60s linear infinite',
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <p className="text-xs font-medium">{design.name}</p>
                        {currentVinylDesign === design.id && (
                          <Check className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
