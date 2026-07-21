/** Resolve public/ assets for Vite base (GitHub Pages project sites, etc.). */
export function assetUrl(path) {
  const clean = String(path || '').replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || './';
  return `${base}${clean}`;
}
