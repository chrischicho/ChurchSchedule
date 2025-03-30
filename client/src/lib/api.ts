// Use the standardized implementation from queryClient.ts
// This ensures consistent behavior across the application

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  path: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: unknown;
  } = { method: 'GET' }
): Promise<any> {
  try {
    console.log(`API Request: ${options.method} ${path}`, options.data || '');
    
    const res = await fetch(path, {
      method: options.method,
      headers: options.data ? { "Content-Type": "application/json" } : {},
      body: options.data ? JSON.stringify(options.data) : undefined,
      credentials: "include",
    });

    console.log(`API Response status: ${res.status} ${res.statusText}`);
    
    await throwIfResNotOk(res);
    
    // If no content, return an empty object
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      console.log('No content in response');
      return { success: true };
    }
    
    // Check content type to determine how to parse the response
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await res.json();
      console.log('API Response data:', json);
      return json;
    }
    
    // Default to text response
    const text = await res.text();
    console.log('API Response text:', text);
    return { success: true, text };
  } catch (error) {
    console.error(`API Request Error for ${path}:`, error);
    throw error;
  }
}
