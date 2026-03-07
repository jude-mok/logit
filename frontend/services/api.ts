/**
 * API Service Module
 *
 * Handles all HTTP requests to the backend server including
 * authentication, moments CRUD operations, and quotes retrieval.
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  user_name: string;
}

export interface SignInRequest {
  user_name: string;
  password: string;
}

// ============================================================================
// Token Management
// ============================================================================

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/** Securely store authentication tokens */
export async function saveTokens(tokens: AuthResponse): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

/** Retrieve the stored access token */
export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/** Retrieve the stored refresh token */
export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Clear all stored tokens (used for logout) */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ============================================================================
// Authentication API
// ============================================================================

/** Authenticate user via Google OAuth access token */
export async function googleSignIn(accessToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sign in with Google');
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
}

/** Authenticate user with email and password */
export async function signIn(request: SignInRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    const detail = error.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail[0]?.msg || 'Failed to sign in'
        : 'Failed to sign in';
    throw new Error(message);
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
}

/** Register a new user account */
export async function signUp(request: SignUpRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/sign_up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sign up');
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
}

// ============================================================================
// User API
// ============================================================================

export interface User {
  id: number;
  user_name: string;
  email: string;
  provider: string;
  created_at: number;
}

export interface UserUpdateRequest {
  user_name?: string;
  current_password?: string;
  new_password?: string;
}

export interface Album {
  year: number;
  month: number;
  cover_image: string;
  count: number;
}

export interface TreeStatus {
  stage: number | 'dead';
  count: number;
}

/** Fetch user's tree stage based on moment count */
export async function getTreeStatus(): Promise<TreeStatus> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/me/tree`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch tree status');
  return response.json();
}

/** Fetch current user's profile information */
export async function getCurrentUser(): Promise<User> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/me/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

export interface CalendarDay {
  date: string;
  moment_id: number;
  created_at: number;
}

/** Fetch days in a month that have moments */
export async function getCalendar(year: number, month: number): Promise<CalendarDay[]> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/album/calendar/${year}/${month}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch calendar');
  return response.json();
}

/** Fetch moments for a specific year/month */
export async function getAlbumMoments(year: number, month: number): Promise<Moment[]> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/album/${year}/${month}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch album moments');
  return response.json();
}

/** Fetch user's moments grouped by month */
export async function getAlbums(): Promise<Album[]> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/album/`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch albums');
  }
  return response.json();
}

/** Update current user's profile (username and/or password) */
export async function updateUser(request: UserUpdateRequest): Promise<User> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/me/update`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }
  return response.json();
}

// ============================================================================
// Moments API
// ============================================================================

export interface Moment {
  id: number;
  image_path: string;
  comment: string | null;
  is_starred: boolean;
  created_at: number;
}

export type OrderType = 'chronological' | 'random' | 'starred';

/**
 * Fetch user's moments with specified ordering
 * @param order - Sort order: 'random', 'chronological', or 'starred'
 */
export async function getMoments(order: OrderType = 'chronological'): Promise<Moment[]> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/moments/?order=${order}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch moments');
  }
  return response.json();
}

/**
 * Create a new moment with image and optional caption
 * @param imageUri - Local URI of the image to upload
 * @param comment - Optional caption for the moment
 */
export async function createMoment(imageUri: string, comment?: string): Promise<Moment> {
  const token = await getAccessToken();
  const formData = new FormData();

  // Extract filename and MIME type from URI
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  if (comment) {
    formData.append('comment', comment);
  }

  const response = await fetch(`${API_BASE_URL}/moments/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to create moment');
  }
  return response.json();
}




/** Toggle the starred status of a moment */
export async function toggleStar(momentId: number): Promise<Moment> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/moments/${momentId}/star`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to toggle star');
  }
  return response.json();
}

/** Permanently delete a moment */
export async function deleteMoment(momentId: number): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/moments/${momentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete moment');
  }
}

/** Check if user can upload a moment today (one per day limit) */
export async function canUploadToday(): Promise<boolean> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/moments/can-upload`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  return data.can_upload;
}

/** Convert image path to full URL (handles both relative and absolute paths) */
export function getImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${API_BASE_URL}/${imagePath}`;
}

// ============================================================================
// Quotes API
// ============================================================================

export interface Quote {
  id: number;
  text: string;
  author: string | null;
}

/** Fetch a single random inspirational quote */
export async function getRandomQuote(): Promise<Quote> {
  const response = await fetch(`${API_BASE_URL}/quotes/random`);
  if (!response.ok) {
    throw new Error('Failed to fetch quote');
  }
  return response.json();
}

/**
 * Fetch multiple random quotes for caching
 * @param count - Number of quotes to fetch (default: 10, max: 100)
 */
export async function getQuotesBatch(count: number = 10): Promise<Quote[]> {
  const response = await fetch(`${API_BASE_URL}/quotes/batch?count=${count}`);
  if (!response.ok) {
    throw new Error('Failed to fetch quotes');
  }
  return response.json();
}
