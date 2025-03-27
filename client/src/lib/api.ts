export async function apiRequest(
  path: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: unknown;
  } = { method: 'GET' }
): Promise<any> {
  try {
    console.log(`API Request: ${options.method} ${path}`, options.data || '');
    
    const response = await fetch(path, {
      method: options.method,
      headers: options.data ? { "Content-Type": "application/json" } : {},
      body: options.data ? JSON.stringify(options.data) : undefined,
      credentials: "include",
    });

    console.log(`API Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }
    
    // If no content, return a success object
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      console.log('No content in response');
      return { success: true };
    }
    
    // Try to parse as JSON first
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const json = await response.json();
        console.log('API Response data:', json);
        return json;
      } catch (err) {
        console.warn('Failed to parse JSON response:', err);
      }
    }
    
    // Default to text response
    const text = await response.text();
    console.log('API Response text:', text);
    return { success: true, text };
  } catch (error) {
    console.error(`API Request Error for ${path}:`, error);
    throw error;
  }
}
