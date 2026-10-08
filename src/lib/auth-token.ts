// Session token for the password gate. The cookie holds SHA-256("cognition-auth:" + APP_PASSWORD),
// so it cannot be forged without the password and changes when the password changes.
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD
  if (!password) return null
  const data = new TextEncoder().encode(`cognition-auth:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
