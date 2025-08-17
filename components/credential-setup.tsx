"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { SpotifySetupGuide } from "./spotify-setup-guide"
import { saveCredentials, validateCredentials, clearCredentials, hasStoredCredentials } from "@/lib/credential-storage"
import { Eye, EyeOff, HelpCircle, AlertCircle, Check, Music, Key, Shield } from "lucide-react"
import Image from "next/image"

interface CredentialSetupProps {
  onCredentialsSaved: () => void
  showReset?: boolean
}

export function CredentialSetup({ onCredentialsSaved, showReset = false }: CredentialSetupProps) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [error, setError] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [understand, setUnderstand] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Validate format
    if (!validateCredentials(clientId, clientSecret)) {
      setError("Invalid credentials format. Both Client ID and Secret should be 32 characters long.")
      return
    }
    
    if (!understand) {
      setError("Please acknowledge that you understand how credentials are stored.")
      return
    }
    
    setIsValidating(true)
    
    try {
      // Save credentials to localStorage
      saveCredentials(clientId, clientSecret)
      
      // Test the credentials with Spotify API
      const response = await fetch('/api/auth/spotify/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId, clientSecret })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid credentials')
      }
      
      setSaved(true)
      setTimeout(() => {
        onCredentialsSaved()
      }, 1500)
    } catch (err: any) {
      clearCredentials()
      setError(err.message || "Failed to validate credentials. Please check and try again.")
    } finally {
      setIsValidating(false)
    }
  }
  
  const handleReset = () => {
    clearCredentials()
    setClientId("")
    setClientSecret("")
    setSaved(false)
    setError("")
    window.location.reload()
  }
  
  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--vinyl-bg)' }}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Credentials Saved!</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your Spotify API credentials have been saved successfully. Redirecting...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--vinyl-bg)' }}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image
                src="/record.svg"
                alt="Vinyl"
                fill
                className="object-contain animate-spin-slow"
              />
            </div>
            <CardTitle className="text-2xl">
              {showReset ? "Update Your Spotify Credentials" : "Welcome to Vinyl Player"}
            </CardTitle>
          </div>
          <CardDescription className="text-base space-y-2">
            <p>
              To use Vinyl Player, you need to provide your own Spotify API credentials.
            </p>
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Why?</strong> Spotify limits development apps to 25 users. By using your own credentials, 
                you get unlimited personal use with full control over your data.
              </AlertDescription>
            </Alert>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Client ID
              </Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Enter your Spotify Client ID (32 characters)"
                value={clientId}
                onChange={(e) => setClientId(e.target.value.trim())}
                required
                maxLength={32}
                pattern="[a-zA-Z0-9]{32}"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {clientId.length}/32 characters
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientSecret" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Client Secret
              </Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter your Spotify Client Secret (32 characters)"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value.trim())}
                  required
                  maxLength={32}
                  pattern="[a-zA-Z0-9]{32}"
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {clientSecret.length}/32 characters
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="understand"
                  checked={understand}
                  onCheckedChange={(checked) => setUnderstand(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="understand" className="text-sm font-medium cursor-pointer">
                    I understand and acknowledge:
                  </Label>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Credentials are stored locally in your browser only
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Clearing browser data will require re-entering credentials
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Your Client Secret should never be shared with anyone
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGuide(true)}
                className="flex-1"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How to Get Credentials
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isValidating || !clientId || !clientSecret || !understand}
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4 mr-2" />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        
        {showReset && (
          <CardFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="w-full"
            >
              Reset Credentials
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <SpotifySetupGuide open={showGuide} onOpenChange={setShowGuide} />
    </div>
  )
}