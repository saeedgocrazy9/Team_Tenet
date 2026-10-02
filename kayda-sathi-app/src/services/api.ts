/**
 * Kayda Sathi — API Service
 * Handles all communication with the FastAPI backend.
 */

import axios, { type AxiosInstance } from 'axios';
import type {
  TriageRequest,
  TriageResponse,
  ClauseScanRequest,
  ClauseScanResponse,
} from '@/types/triage';

// ── Configuration ─────────────────────────────────────────────────────────
// For development: change this to your machine's local Wi-Fi IP
// e.g., "http://192.168.1.42:8000"
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.1:8000'   // Change to your local IP
  : 'https://your-production-url.com';

// ── Axios Instance ────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds — AI reasoning + voice transcription can take time
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── API Functions ─────────────────────────────────────────────────────────

/**
 * Send a text-based legal problem for triage.
 */
export async function triageText(request: TriageRequest): Promise<TriageResponse> {
  const response = await api.post<TriageResponse>('/api/triage', request);
  return response.data;
}

/**
 * Send an audio file for voice-based triage.
 * Audio is transcribed via Whisper, then triaged.
 */
export async function triageVoice(
  audioUri: string,
  language: string = 'auto'
): Promise<TriageResponse> {
  const formData = new FormData();

  // Create file object from URI
  const fileName = audioUri.split('/').pop() || 'recording.m4a';
  const fileType = fileName.endsWith('.wav')
    ? 'audio/wav'
    : fileName.endsWith('.mp3')
      ? 'audio/mpeg'
      : 'audio/mp4';

  formData.append('audio', {
    uri: audioUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);

  formData.append('language', language);

  const response = await api.post<TriageResponse>('/api/triage-voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000, // Extra time for transcription + reasoning
  });

  return response.data;
}

/**
 * Scan a contract for unfair/illegal clauses.
 */
export async function scanClauses(request: ClauseScanRequest): Promise<ClauseScanResponse> {
  const response = await api.post<ClauseScanResponse>('/api/scan-clause', request);
  return response.data;
}

/**
 * Health check.
 */
export async function healthCheck(): Promise<{ status: string; model: string; stt: string }> {
  const response = await api.get('/health');
  return response.data;
}

/**
 * Update the base URL at runtime (useful for settings screen).
 */
export function setApiBaseUrl(url: string) {
  api.defaults.baseURL = url;
}

export default api;
