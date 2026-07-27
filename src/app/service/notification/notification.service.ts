import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { CommonapiService } from '../commonapi/commonapi.service';

export interface NotificationItem {
  _id: string;
  notificationId: string;
  title: string;
  body: string;
  type: string;
  sourceModule: string;
  sourceRefId: string;
  data: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private commonApi: CommonapiService) {}

  private baseBody(): { tenantId: string; userId: string } {
    return {
      tenantId: localStorage.getItem('tenantId') || '',
      userId: localStorage.getItem('userId') || '',
    };
  }

  startPolling(): void {
    if (this.pollSub) return;
    this.fetchUnreadCount();
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() =>
      this.fetchUnreadCount(),
    );
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  fetchUnreadCount(): void {
    this.commonApi
      .fetchData(this.baseBody(), 'ims/notification', 'unread-count')
      .subscribe({
        next: (res: any) => {
          if (res?.status) this.unreadCountSubject.next(res.unreadCount || 0);
        },
        error: () => {},
      });
  }

  fetchList(opts?: { page?: number; limit?: number; isRead?: boolean; type?: string }): void {
    this.loadingSubject.next(true);
    const body: any = {
      ...this.baseBody(),
      page: opts?.page ?? 1,
      limit: opts?.limit ?? 20,
    };
    if (opts?.isRead !== undefined) body.isRead = opts.isRead;
    if (opts?.type) body.type = opts.type;

    this.commonApi.fetchData(body, 'ims/notification', 'list').subscribe({
      next: (res: any) => {
        this.loadingSubject.next(false);
        if (res?.status) {
          this.notificationsSubject.next(res.data || []);
          this.unreadCountSubject.next(res.unreadCount || 0);
        }
      },
      error: () => this.loadingSubject.next(false),
    });
  }

  markRead(notificationId: string): void {
    // Optimistic local update so the panel feels instant.
    const current = this.notificationsSubject.value;
    const wasUnread = current.some(
      (n) => n.notificationId === notificationId && !n.isRead,
    );
    this.notificationsSubject.next(
      current.map((n) =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n,
      ),
    );
    if (wasUnread) {
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    }
    this.commonApi
      .fetchData(
        { ...this.baseBody(), notificationId },
        'ims/notification',
        'mark-read',
      )
      .subscribe({ error: () => {} });
  }

  markAllRead(): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) => ({ ...n, isRead: true })),
    );
    this.unreadCountSubject.next(0);
    this.commonApi
      .fetchData(this.baseBody(), 'ims/notification', 'mark-all-read')
      .subscribe({ error: () => {} });
  }

  remove(notificationId: string): void {
    const current = this.notificationsSubject.value;
    const target = current.find((n) => n.notificationId === notificationId);
    this.notificationsSubject.next(
      current.filter((n) => n.notificationId !== notificationId),
    );
    if (target && !target.isRead) {
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    }
    this.commonApi
      .fetchData(
        { ...this.baseBody(), notificationId },
        'ims/notification',
        'remove',
      )
      .subscribe({ error: () => {} });
  }

  reset(): void {
    this.stopPolling();
    this.unreadCountSubject.next(0);
    this.notificationsSubject.next([]);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
