import { Injectable } from '@angular/core';

/**
 * Remembers which page a list screen was on right before the user
 * deliberately navigated away to a detail/sub-screen, so coming back
 * restores that page. State is in-memory only and consumed on read, so:
 * - A fresh visit from the sidebar menu (no save ever happened) always
 *   starts at page 1, as expected.
 * - Restoring a page clears it, so a later unrelated visit won't reuse
 *   stale state.
 */
@Injectable({ providedIn: 'root' })
export class ListStateService {
  private pages = new Map<string, number>();

  savePage(key: string, page: number): void {
    this.pages.set(key, page || 1);
  }

  consumePage(key: string): number {
    const page = this.pages.get(key);
    if (page == null) return 1;
    this.pages.delete(key);
    return page;
  }
}
