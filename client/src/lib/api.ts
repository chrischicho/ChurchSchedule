export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Add this to ensure cookies are sent with requests
  });

  if (!response.ok) {
    throw { response }; // Throw with response object for custom error handling
  }

  return response;
}