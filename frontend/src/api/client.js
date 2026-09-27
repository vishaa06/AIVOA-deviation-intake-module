import axios from 'axios'

// Relative base URL — Vite's dev proxy (see vite.config.js) forwards /api
// to the FastAPI backend. In production, serve the frontend behind the
// same domain/reverse-proxy as the API, or set VITE_API_BASE.
const baseURL = import.meta.env.VITE_API_BASE || '/api'

export const api = axios.create({ baseURL })

export const extractFromText = (text) => api.post('/ai/extract', { text }).then((r) => r.data)

export const extractFromFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/ai/extract-file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const askAssistant = (message, context) =>
  api.post('/ai/chat', { message, context }).then((r) => r.data)

export const saveDeviation = (payload) => api.post('/deviations', payload).then((r) => r.data)

/**
 * BUG FIX: FastAPI validation errors (422s) come back as `detail` being an
 * ARRAY of {loc, msg, type} objects, not a plain string. Code that did
 * `err.response.data.detail` and rendered it directly as a React child
 * crashed the whole app with "Objects are not valid as a React child" —
 * which is what showed up as a blank white screen after clicking Save.
 * Every place that surfaces an API error to the UI should go through this
 * instead of reading `err.response.data.detail` directly.
 */
export function describeApiError(err) {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : ''
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return err?.message || 'Something went wrong.'
}
