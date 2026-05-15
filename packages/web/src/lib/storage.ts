const DISPLAY_NAME_KEY = 'avalon.displayName';

export function loadDisplayName(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
}

export function saveDisplayName(name: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}
