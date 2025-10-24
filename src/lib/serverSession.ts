/**
 * Project no-auth mode: return null for all session requests.
 * Kept for API compatibility with previous helpers.
 */
export async function getSessionFromRequest(): Promise<null> {
  return null;
}

export default getSessionFromRequest;
