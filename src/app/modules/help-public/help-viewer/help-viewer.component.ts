import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environments';
import { extractYouTubeId, loadYouTubeIframeApi } from '../../../shared/youtube.util';

interface HelpModule {
  moduleName: string;
  moduleSortOrder: number;
  topicCount: number;
}

interface HelpTopic {
  helpId: string;
  moduleName: string;
  moduleSortOrder: number;
  topic: string;
  description: string;
  videoLink: string;
  sortOrder: number;
  status: string;
}

// YT.PlayerState numeric values (YouTube IFrame API) — not exported as a
// type anywhere, so mirrored here for the state-change handler.
const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;
const YT_STATE_ENDED = 0;

@Component({
  selector: 'app-help-viewer',
  standalone: false,
  templateUrl: './help-viewer.component.html',
  styleUrl: './help-viewer.component.scss',
})
export class HelpViewerComponent implements OnInit, OnDestroy {
  loadingModules = false;
  loadingTopics = false;
  modules: HelpModule[] = [];
  private allTopics: HelpTopic[] = [];
  selectedModuleName: string | null = null;
  search = '';

  /** Modules expanded in the sidebar (independent of which one is
   * "selected" for filtering — a module can be browsed/expanded without
   * being the active filter). */
  expandedModules = new Set<string>();

  /** Single-open accordion for the topic list — only one player mounted
   * at a time (many simultaneous YouTube players gets heavy). */
  expandedTopicId: string | null = null;

  // ── Custom player state ──────────────────────────────────────────────
  // controls=0 hides YouTube's entire native control bar (including
  // Share/Settings, which have no standalone hide parameter) — this is
  // the replacement control bar built against the IFrame Player API.
  private ytPlayer: any = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  playerReady = false;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  muted = false;
  volume = 100;

  private pendingHostEl: ElementRef<HTMLElement> | null = null;

  @ViewChild('playerHost') set playerHost(ref: ElementRef<HTMLElement> | undefined) {
    if (ref) this.pendingHostEl = ref;
    if (ref && this.expandedTopicId) this.mountPlayerForExpandedTopic();
  }

  /**
   * Deliberately uses plain HttpClient rather than CommonapiService — this
   * page must work for a fully anonymous visitor with no session at all,
   * and CommonapiService's resolveCenterId() gate (built for the
   * authenticated app) can block requests based on unrelated localStorage
   * state that has nothing to do with this public page. The backend for
   * these endpoints needs neither an auth header nor a tenantId.
   */
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadModules();
    this.loadAllTopics();
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  private loadModules(): void {
    this.loadingModules = true;
    this.http.post(`${environment.baseURL}/help/modules`, {}).subscribe({
      next: (res: any) => {
        this.modules = res?.data || [];
        this.loadingModules = false;
      },
      error: () => {
        this.loadingModules = false;
      },
    });
  }

  private loadAllTopics(): void {
    // list: 'full' — fetch every active topic once, then filter client-side
    // by module/search, matching the API notes' suggested pattern for a
    // client-side searchable help center.
    this.loadingTopics = true;
    this.http.post(`${environment.baseURL}/help/list`, { list: 'full' }).subscribe({
      next: (res: any) => {
        const rows = res?.data?.rows || res?.data || [];
        this.allTopics = rows;
        this.loadingTopics = false;
      },
      error: () => {
        this.loadingTopics = false;
      },
    });
  }

  // ====================================================
  // MODULE SIDEBAR — filter + independent expand/collapse
  // ====================================================
  selectModule(moduleName: string | null): void {
    this.selectedModuleName = moduleName;
    if (moduleName) this.expandedModules.add(moduleName);
  }

  toggleModuleExpanded(moduleName: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedModules.has(moduleName)) this.expandedModules.delete(moduleName);
    else this.expandedModules.add(moduleName);
  }

  isModuleExpanded(moduleName: string): boolean {
    return this.expandedModules.has(moduleName);
  }

  topicsFor(moduleName: string): HelpTopic[] {
    return this.allTopics.filter((t) => t.moduleName === moduleName);
  }

  // ====================================================
  // TOPIC LIST — search + filter
  // ====================================================
  get visibleTopics(): HelpTopic[] {
    const q = this.search.trim().toLowerCase();
    return this.allTopics.filter((t) => {
      if (this.selectedModuleName && t.moduleName !== this.selectedModuleName) return false;
      if (!q) return true;
      return (
        t.topic.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.moduleName.toLowerCase().includes(q)
      );
    });
  }

  onSearchChange(): void {
    // Searching across all modules is more useful than a scoped-but-empty
    // list — drop the module filter once the user starts typing.
    if (this.search.trim()) this.selectedModuleName = null;
  }

  // ====================================================
  // TOPIC ACCORDION
  // ====================================================
  isTopicExpanded(topic: HelpTopic): boolean {
    return this.expandedTopicId === topic.helpId;
  }

  toggleTopic(topic: HelpTopic): void {
    if (this.expandedTopicId === topic.helpId) {
      this.expandedTopicId = null;
      this.destroyPlayer();
      return;
    }
    const id = extractYouTubeId(topic.videoLink);
    if (!id) {
      // Non-YouTube link — nothing to embed inline, just open it directly.
      window.open(topic.videoLink, '_blank', 'noopener');
      return;
    }
    this.destroyPlayer();
    this.expandedTopicId = topic.helpId;
    // The *ngIf host div for this topic doesn't exist yet on this tick —
    // the @ViewChild setter above fires once Angular renders it and
    // mounts the player then. If it happens to already be the current
    // ref (host reused), mount immediately too.
    this.mountPlayerForExpandedTopic();
  }

  private mountPlayerForExpandedTopic(): void {
    const topic = this.allTopics.find((t) => t.helpId === this.expandedTopicId);
    const hostEl = this.pendingHostEl?.nativeElement;
    if (!topic || !hostEl || this.ytPlayer) return;
    const videoId = extractYouTubeId(topic.videoLink);
    if (!videoId) return;

    loadYouTubeIframeApi().then(() => {
      // Bail if the user collapsed/switched topics while the API was loading.
      if (this.expandedTopicId !== topic.helpId) return;
      this.playerReady = false;
      this.ytPlayer = new window.YT.Player(hostEl, {
        videoId,
        playerVars: {
          controls: 0,
          rel: 0,
          cc_load_policy: 0,
          modestbranding: 1,
          autoplay: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            this.playerReady = true;
            this.duration = e.target.getDuration();
            this.volume = e.target.getVolume();
          },
          onStateChange: (e: any) => this.onPlayerStateChange(e.data),
        },
      });
    });
  }

  private onPlayerStateChange(state: number): void {
    this.isPlaying = state === YT_STATE_PLAYING;
    if (state === YT_STATE_PLAYING) {
      this.startProgressTimer();
    } else {
      this.stopProgressTimer();
    }
    if (state === YT_STATE_ENDED || state === YT_STATE_PAUSED) {
      this.refreshTimeDisplay();
    }
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => this.refreshTimeDisplay(), 250);
  }

  private stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private refreshTimeDisplay(): void {
    if (!this.ytPlayer?.getCurrentTime) return;
    this.currentTime = this.ytPlayer.getCurrentTime();
    this.duration = this.ytPlayer.getDuration() || this.duration;
  }

  private destroyPlayer(): void {
    this.stopProgressTimer();
    this.ytPlayer?.destroy?.();
    this.ytPlayer = null;
    this.pendingHostEl = null;
    this.playerReady = false;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
  }

  // ====================================================
  // CUSTOM CONTROL BAR
  // ====================================================
  get progressPercent(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }

  togglePlay(): void {
    if (!this.ytPlayer) return;
    if (this.isPlaying) this.ytPlayer.pauseVideo();
    else this.ytPlayer.playVideo();
  }

  onSeek(event: Event): void {
    if (!this.ytPlayer) return;
    const percent = Number((event.target as HTMLInputElement).value);
    const target = (percent / 100) * this.duration;
    this.ytPlayer.seekTo(target, true);
    this.currentTime = target;
  }

  toggleMute(): void {
    if (!this.ytPlayer) return;
    if (this.muted) {
      this.ytPlayer.unMute();
      this.muted = false;
    } else {
      this.ytPlayer.mute();
      this.muted = true;
    }
  }

  onVolumeChange(event: Event): void {
    if (!this.ytPlayer) return;
    const value = Number((event.target as HTMLInputElement).value);
    this.volume = value;
    this.ytPlayer.setVolume(value);
    if (value === 0 && !this.muted) {
      this.ytPlayer.mute();
      this.muted = true;
    } else if (value > 0 && this.muted) {
      this.ytPlayer.unMute();
      this.muted = false;
    }
  }

  toggleFullscreen(hostWrapper: HTMLElement): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      hostWrapper.requestFullscreen?.();
    }
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
