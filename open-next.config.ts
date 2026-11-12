import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Pages are prerendered at build time and nothing revalidates (Spotify data is
// fetched per request by the API routes), so the read-only static assets cache
// is enough (no R2/KV bindings needed).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
