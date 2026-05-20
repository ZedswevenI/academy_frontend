import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, input, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';

@Component({
  selector: 'custom-table',
  standalone: false,
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.scss'
})
export class CustomTableComponent implements OnDestroy {
  // Table details
  @Input() columns: { key: string; label: string; sortable: boolean; date?: boolean; maxWidthPx?: number }[] = [];
  @Input() data: any[] = [];
  @Input() actions: any[] = [];
  @Input() showaction: boolean = true;
  @Input() showfilter: boolean = false;
  @Input() pageSizeOptions = [5, 10, 20, 50];
  @Input() storageKey: string = '';

  private get _storageKey(): string {
    return this.storageKey || `tbl_ps_${window.location.pathname}`;
  }
  @Input() totalRecords: number = 0;
  @Input() loading: boolean = false;
  @Input() showpageoptions: boolean = true;
  @Input() showsearch: boolean = true;
  @Input() searchPlaceholder: string = '';
  @Input() autoFitChars = false;
  @Input() wrapCells = true;
  @Input() baseCharWidth = 8;
  @Input() minChars = 12;
  @Input() hardMaxChars = 30;

  @ViewChild('tableWrap', { static: false }) tableWrap?: ElementRef<HTMLDivElement>;
  private containerWidth = 0;

  @Output() requestData = new EventEmitter<{
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }>();

  paginationItems: Array<{ page: number | '...'; isActive?: boolean }> = [];
  @Output() filterClicked = new EventEmitter<void>();

  // pagination options
  currentPage = 1;
  pageSize = 5;
  sortKey: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  searchText = '';
  filteredData: any[] = [];

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize) || 1;
  }

  private activeDropdownMenu: HTMLElement | null = null;
  private activeDropdownBtn: HTMLElement | null = null;
  private activeDropdownParent: HTMLElement | null = null;
  private scrollUnlisten: (() => void) | null = null;
  private showListener = (e: Event) => this.onDropdownShow(e);
  private hideListener = (e: Event) => this.onDropdownHide();

  constructor(private elRef: ElementRef) { }

  ngAfterViewInit() {
    const host = this.elRef.nativeElement as HTMLElement;
    host.addEventListener('shown.bs.dropdown', this.showListener);
    host.addEventListener('hidden.bs.dropdown', this.hideListener);
  }

  ngOnDestroy() {
    const host = this.elRef.nativeElement as HTMLElement;
    host.removeEventListener('shown.bs.dropdown', this.showListener);
    host.removeEventListener('hidden.bs.dropdown', this.hideListener);
    this.cleanupDropdown();
    if (this.tooltipHideTimer) clearTimeout(this.tooltipHideTimer);
  }

  private onDropdownShow(event: Event) {
    const btn = event.target as HTMLElement;
    const menu = btn.querySelector('.dropdown-menu') || btn.parentElement?.querySelector('.dropdown-menu');
    if (!menu) return;

    const parent = menu.parentElement;
    this.activeDropdownBtn = btn;
    this.activeDropdownMenu = menu as HTMLElement;
    this.activeDropdownParent = parent as HTMLElement;

    // Move to body and position
    document.body.appendChild(menu);
    this.positionDropdown();

    // Close on scroll of any scrollable ancestor
    const scrollable = this.elRef.nativeElement.querySelector('.table-responsive') || this.elRef.nativeElement;
    const scrollHandler = () => this.closeActiveDropdown();
    scrollable.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });

    this.scrollUnlisten = () => {
      scrollable.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('scroll', scrollHandler);
    };
  }

  private onDropdownHide() {
    this.cleanupDropdown();
  }

  private positionDropdown() {
    if (!this.activeDropdownMenu || !this.activeDropdownBtn) return;
    const btn = this.activeDropdownBtn;
    const menu = this.activeDropdownMenu;
    const rect = btn.getBoundingClientRect();

    menu.style.position = 'fixed';
    menu.style.zIndex = '1080';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.right - menu.offsetWidth}px`;
    menu.classList.add('show');
  }

  private closeActiveDropdown() {
    if (!this.activeDropdownBtn) return;
    // Programmatically hide via Bootstrap
    const Dropdown = (window as any).bootstrap?.Dropdown;
    if (Dropdown) {
      const instance = Dropdown.getOrCreateInstance(this.activeDropdownBtn.querySelector('[data-bs-toggle="dropdown"]') || this.activeDropdownBtn);
      instance?.hide();
    }
    this.cleanupDropdown();
  }

  private cleanupDropdown() {
    if (this.scrollUnlisten) {
      this.scrollUnlisten();
      this.scrollUnlisten = null;
    }
    // Move menu back to original parent
    if (this.activeDropdownMenu && this.activeDropdownParent) {
      try {
        this.activeDropdownParent.appendChild(this.activeDropdownMenu);
      } catch (e) { /* already moved back */ }
      this.activeDropdownMenu.style.position = '';
      this.activeDropdownMenu.style.top = '';
      this.activeDropdownMenu.style.left = '';
      this.activeDropdownMenu.style.zIndex = '';
    }
    this.activeDropdownMenu = null;
    this.activeDropdownBtn = null;
    this.activeDropdownParent = null;
  }

  ngOnInit(): void {
    const saved = localStorage.getItem(this._storageKey);
    const savedSize = saved ? +saved : null;
    this.pageSize = (savedSize && this.pageSizeOptions.includes(savedSize))
      ? savedSize
      : this.pageSizeOptions[0];
    if (this.columns) {
      this.columns = this.columns.map((col) => ({
        ...col,
        date: col.date ?? false
      }));
    }
    this.updatePagination();
    // Defer initial data request to avoid ExpressionChangedAfterItHasBeenCheckedError
    // Parent sets loading=true in response, which changes bindings during the same CD cycle
    setTimeout(() => this.emitRequest(), 0);
  }

  onOpenFilters() {
    this.filterClicked.emit();
  }

  clearSearch(): void {
    this.searchText = '';
    this.onSearch();
  }

  getCellValue(row: any, key: string): any {
    if (!row || !key) return '--';
    const parts = key.split('.');
    let curr: any = row;

    for (const part of parts) {
      if (curr == null) return '--';

      if (Array.isArray(curr)) {
        const mapped = curr.map((item) => (item != null ? item[part] : undefined)).filter((v) => v !== undefined && v !== null);

        if (mapped.length === 0) return '--';
        curr = mapped;
      } else {
        curr = curr[part];
      }
    }
    let value = curr;
    if (Array.isArray(value)) {
      if (value.length === 0) return '--';
      if (typeof value[0] === 'string' || typeof value[0] === 'number' || typeof value[0] === 'boolean') {
        return value.join(', ');
      }
      return value.length;
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value ?? '--';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalRecords'] || changes['pageSize'] || changes['currentPage']) {
      this.updatePagination();
    }
  }

  onSearch() {
    this.currentPage = 1;
    this.emitRequest();
    this.updatePagination();
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.emitRequest();
    this.updatePagination();
  }

  onPageSizeChange(size: number) {
    this.pageSize = +size;
    localStorage.setItem(this._storageKey, String(this.pageSize));
    this.currentPage = 1;
    this.emitRequest();
    this.updatePagination();
  }

  onSort(key: string) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.emitRequest();
    this.updatePagination();
  }

  emitRequest() {
    this.requestData.emit({
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchText,
      sortKey: this.sortKey,
      sortDirection: this.sortDirection
    });
  }

  private updatePagination(): void {
    const total = this.totalPages || 1;
    const current = this.currentPage || 1;
    const pages: Array<number | '...'> = [];

    const push = (p: number | '...') => pages.push(p);

    if (total <= 7) {
      for (let p = 1; p <= total; p++) push(p);
    } else {
      const showLeft = Math.max(2, current - 1);
      const showRight = Math.min(total - 1, current + 1);

      push(1);
      if (showLeft > 2) push('...');
      for (let p = showLeft; p <= showRight; p++) push(p);
      if (showRight < total - 1) push('...');
      push(total);
    }

    this.paginationItems = pages.map((p) => ({
      page: p,
      isActive: p === current
    })) as any;
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.measureContainer();
  }

  private measureContainer() {
    if (!this.tableWrap) return;
    const w = this.tableWrap.nativeElement.clientWidth || 0;
    if (w && w !== this.containerWidth) {
      this.containerWidth = w;
    }
  }

  truncate(value: any, col?: any): string {
    const s = this.stringify(value);
    if (s === '--') return s;
    const max = this.getMaxChars(col);
    return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
  }

  needsTooltip(value: any, col?: any): boolean {
    const s = this.stringify(value);
    if (s === '--') return false;
    return s.length > this.getMaxChars(col);
  }

  private stringify(v: any): string {
    if (v === null || v === undefined) return '--';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    // Fallback for objects/arrays (your getCellValue already flattens most cases)
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  private getMaxChars(col?: any): number {
    if (!this.autoFitChars || !this.containerWidth) return this.hardMaxChars;

    // Rough auto-fit: divide available width by number of visible data columns
    const fixedCols = 1 + (this.showaction ? 1 : 0); // S.NO + optional ACTION
    const numDataCols = Math.max(1, (this.columns?.length || 1) + fixedCols);
    const paddingGuard = 64; // safety px for paddings/scrollbar
    const perColPx = Math.max(80, Math.floor((this.containerWidth - paddingGuard) / numDataCols));

    const approxChars = Math.floor(perColPx / this.baseCharWidth);
    return Math.max(this.minChars, Math.min(this.hardMaxChars, approxChars));
  }

  // --- Floating tooltip state ---
  tooltipText = '';
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  private tooltipHideTimer: any = null;

  showTooltip(event: MouseEvent, value: any) {
    const text = this.stringify(value);
    if (!text || text === '--') return;

    const el = event.currentTarget as HTMLElement;
    if (!el) return;

    // Use DOM measurement: vertical overflow for clamp mode, horizontal for truncate mode
    const isOverflowing = this.wrapCells
      ? el.scrollHeight > el.clientHeight + 1
      : el.scrollWidth > el.clientWidth + 1;

    if (!isOverflowing) return;

    if (this.tooltipHideTimer) { clearTimeout(this.tooltipHideTimer); this.tooltipHideTimer = null; }
    const rect = el.getBoundingClientRect();
    this.tooltipX = rect.left + rect.width / 2;
    this.tooltipY = rect.top - 8;
    this.tooltipText = text;
    this.tooltipVisible = true;
  }

  hideTooltip() {
    if (this.tooltipHideTimer) clearTimeout(this.tooltipHideTimer);
    this.tooltipHideTimer = setTimeout(() => {
      this.tooltipVisible = false;
      this.tooltipText = '';
      this.tooltipHideTimer = null;
    }, 80);
  }

  @Input() value: number | string | null = null;
  @Input() dangerLimit!: number;
  @Input() warningLimit!: number;
  @Input() success!: string;
  @Input() warn!: string;
  @Input() warn1!: string;
  @Input() danger!: string;
  @Input() primary!: string;

  hasBadgeStyle(value: any, colKey?: string): boolean {
    const style = this.getNetStyle(value, colKey);
    return style && Object.keys(style).length > 0;
  }

  getNetStyle(value: number | string | null, colKey?: string) {
    if (typeof value === 'string') {
      if (value === this.success) {
        return {
          backgroundColor: '#ddfcea',
          color: '#198754',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '30px'
        }
      } else if (value === this.warn) {
        return {
          backgroundColor: '#fff5d6',
          color: '#ffc107',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '30px'
        };
      } else if (value === this.warn1) {
        return {
          backgroundColor: '#fff5d6',
          color: '#ffc107',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '30px'
        };
      } else if (value === this.danger) {
        return {
          backgroundColor: '#fde3e3',
          color: '#dc3545',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '30px'
        };
      } else if (value === this.primary) {
        return {
          backgroundColor: '#c8dcfa',
          color: '#0d6efd',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '30px',
        };
      }
    }

    // Number Condition
    if (colKey === 'net' && typeof value === 'number') {
      if (value < this.dangerLimit) {
        return {
          backgroundColor: '#dc3545',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '6px'
        };
      }
      return {
        backgroundColor: '#ffc107',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '6px'
      };
    }

    return {};
  }

  
}




