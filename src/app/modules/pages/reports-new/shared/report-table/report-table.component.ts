import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReportService } from '../../report.service';

export interface ReportColumn {
  key: string;
  label: string;
  masked?: boolean;
  isTotal?: boolean;
}

@Component({
  selector: 'app-report-table',
  standalone: false,
  templateUrl: './report-table.component.html',
  styles: ``
})
export class ReportTableComponent {
  @Input() columns: ReportColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() dataLoaded = false;
  @Input() emptyHint = '';

  @Output() cellClick = new EventEmitter<{ row: any; col: ReportColumn }>();

  revealedColumns = new Set<string>();

  constructor(private reportService: ReportService) {}

  isRevealed(key: string): boolean {
    return this.revealedColumns.has(key);
  }

  toggleReveal(key: string, event: Event): void {
    event.stopPropagation();
    if (this.revealedColumns.has(key)) this.revealedColumns.delete(key);
    else this.revealedColumns.add(key);
  }

  getCellValue(row: any, col: ReportColumn): string {
    const val = row[col.key];
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (col.masked && !this.isRevealed(col.key)) {
      return this.reportService.maskValue(String(val));
    }
    return String(val);
  }

  reset(): void {
    this.revealedColumns = new Set();
  }
}
