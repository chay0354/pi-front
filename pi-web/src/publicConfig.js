/**
 * Public client config, with the same production defaults as the mobile app.
 * A VITE_* variable set in the Vercel project overrides the default at build time.
 */

const trim = value => String(value || '').trim();

export const API_URL = (trim(import.meta.env.VITE_API_URL) || 'https://pi-back.vercel.app').replace(
  /\/+$/,
  '',
);

export const SUPABASE_URL = (
  trim(import.meta.env.VITE_SUPABASE_URL) || 'https://opxeruasowoaybceskyp.supabase.co'
).replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  trim(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGVydWFzb3dvYXliY2Vza3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDYyMzcsImV4cCI6MjA4NTA4MjIzN30.pJAaMued3jpnmS9D1pt6zmpNytcvzkhBVBk-TBQFs8w';
