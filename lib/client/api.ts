export class ClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** POST JSON to our own API and turn every failure into a readable ClientError. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ClientError('Network problem. Check your connection and try again.', 'NETWORK');
  }

  let data: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && !url.endsWith('/login')) {
      window.location.href = '/core/login';
    }
    throw new ClientError(
      data?.error?.message ?? 'Something went wrong. Please try again.',
      data?.error?.code,
      res.status,
      data?.error?.details,
    );
  }
  return data as T;
}
