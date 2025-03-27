import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method: string;
    data?: unknown;
  } = { method: 'GET' }
): Promise<any> {
  try {
    console.log(`API Request: ${options.method} ${url}`, options.data || '');
    
    const res = await fetch(url, {
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
    console.error(`API Request Error for ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
