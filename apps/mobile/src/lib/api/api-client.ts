
const getDefaultApiUrl = () => {
  return "http://192.168.0.100:3000/api/v1";
  // TODO: Remove Before Production
  // if (process.env.EXPO_PUBLIC_API_URL) {
  //   return process.env.EXPO_PUBLIC_API_URL;
  // } else {
  //   throw new Error('API_BASE_URL is not set');
  // }
  // // Android emulator uses 10.0.2.2 to access host machine localhost
  // if (Platform.OS === 'android') {
  //   return 'http://10.0.2.2:3000/api/v1';
  // }
  // return 'http://localhost:3000/api/v1';
  // // Expo Go
  // return "http://192.168.0.100:3000/api/v1";
};

export const API_BASE_URL = getDefaultApiUrl();
// export const AGENT_BASE_URL = `${API_BASE_URL}/agent`;

export interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const url = `${API_BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });
  } catch (netError: any) {
    console.log(`[Network API Error]: ${url} - ${netError?.message}`);
    throw new ApiError(
      'Network request failed. Please check your connection.',
      0,
      netError
    );
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    if (data?.message) {
      errorMessage = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message;
    } else if (response.statusText) {
      errorMessage = response.statusText;
    }

    console.log(`[API Error]: ${url} - ${errorMessage}`);
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
