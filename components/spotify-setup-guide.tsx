"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Copy, Check, AlertCircle } from "lucide-react"
import { useState } from "react"

interface SpotifySetupGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SpotifySetupGuide({ open, onOpenChange }: SpotifySetupGuideProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  
  const redirectUrl = 'https://vinyl.pranavkarra.me/api/auth/spotify/callback'
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(redirectUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to Get Your Spotify API Credentials</DialogTitle>
          <DialogDescription className="text-base">
            Follow these steps to create your own Spotify app and get your Client ID and Secret
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {/* Why section */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Why do I need my own credentials?
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Spotify limits development apps to 25 users. By creating your own app, you get unlimited personal use and full control over your data.
                </p>
              </div>
            </div>
          </div>
          
          {/* Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Setup Steps:</h3>
            
            {/* Step 1 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                  1
                </div>
                <h4 className="font-semibold">Go to Spotify Developer Dashboard</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                Sign in with your Spotify account (create one if needed)
              </p>
              <Button 
                variant="outline" 
                className="ml-11"
                onClick={() => window.open('https://developer.spotify.com/dashboard', '_blank')}
              >
                Open Developer Dashboard
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Step 2 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                  2
                </div>
                <h4 className="font-semibold">Create a New App</h4>
              </div>
              <ul className="text-sm text-muted-foreground ml-11 space-y-2">
                <li>• Click "Create app" button</li>
                <li>• App name: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Vinyl Player</code> (or any name you prefer)</li>
                <li>• App description: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Personal music player</code></li>
                <li>• Website: Leave blank or add your website</li>
                <li>• Redirect URI: Add this exact URL:</li>
              </ul>
              <div className="ml-11 flex items-center gap-2">
                <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-xs flex-1">
                  {redirectUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-500 ml-11">
                ⚠️ The Redirect URI must match exactly, including http/https
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                  3
                </div>
                <h4 className="font-semibold">Select APIs</h4>
              </div>
              <ul className="text-sm text-muted-foreground ml-11 space-y-2">
                <li>• Check the box for <strong>Web API</strong></li>
                <li>• Check the box for <strong>Web Playback SDK</strong> (required for Premium accounts)</li>
                <li>• Accept the Terms of Service</li>
                <li>• Click "Save"</li>
              </ul>
              <p className="text-sm text-amber-600 dark:text-amber-500 ml-11">
                ⚠️ Web Playback SDK only works with Spotify Premium accounts
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                  4
                </div>
                <h4 className="font-semibold">User Management (Important!)</h4>
              </div>
              <ul className="text-sm text-muted-foreground ml-11 space-y-2">
                <li>• Go to your app's <strong>User Management</strong> section</li>
                <li>• Add your email address if it's different from your Spotify account email</li>
                <li>• You MUST be listed as a user to access the app</li>
                <li className="text-amber-600 dark:text-amber-500">
                  <strong>Optional:</strong> You can add friends' emails to share access
                  <ul className="ml-4 mt-1 text-xs">
                    <li>- They would need your Client ID and Secret</li>
                    <li>- Not recommended for security reasons</li>
                    <li>- Maximum 25 users in development mode</li>
                  </ul>
                </li>
              </ul>
            </div>
            
            {/* Step 5 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                  5
                </div>
                <h4 className="font-semibold">Get Your Credentials</h4>
              </div>
              <ul className="text-sm text-muted-foreground ml-11 space-y-2">
                <li>• Go to your app's Settings page</li>
                <li>• Find and copy your <strong>Client ID</strong> (32 characters)</li>
                <li>• Click "View client secret" and copy your <strong>Client Secret</strong> (32 characters)</li>
                <li>• Paste them in the form on this page</li>
              </ul>
            </div>
          </div>
          
          {/* Important notes */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Important Notes:</p>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Keep your Client Secret private - never share it</li>
              <li>• Credentials are stored locally in your browser</li>
              <li>• If you clear browser data, you'll need to re-enter them</li>
              <li>• You can use the same app credentials on multiple devices</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}