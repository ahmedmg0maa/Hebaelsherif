import 'server-only'

// Capture time once at a server-render boundary so all availability decisions
// in that render use the same instant.
export function serverNowEpochMs() {
  return Date.now()
}

