import { httpClient } from '@/api/httpClient'
import { SubsonicResponse } from '@/types/responses/subsonicResponse'

async function pingInfo() {
  // Prevent a stalled Navidrome/Tailscale request from blocking initial routing.
  // AbortController works in iOS Safari and installed PWAs.
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 5000)
  try {
    const response = await httpClient<SubsonicResponse>('/ping.view', {
      method: 'GET',
      signal: controller.signal,
    })
    return response?.data
  } finally {
    window.clearTimeout(timer)
  }
}

async function pingView() {
  try {
    const info = await pingInfo()

    return info?.status === 'ok'
  } catch (error) {
    console.error(error)
    return false
  }
}

export const ping = {
  pingInfo,
  pingView,
}
