import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { SubjectOption } from '../../report.service';
@Component({
  selector: 'app-date-range-filter',
  standalone: false,
  templateUrl: `./date-range-filter.component.html`
})
export class DateRangeFilterComponent {
  @Input() fromDate = '';
  @Input() toDate = '';
  @Input() required = false;
  @Input() touched = false;
  @Output() fromDateChange = new EventEmitter<string>();
  @Output() toDateChange = new EventEmitter<string>();
  @Output() change = new EventEmitter<{ fromDate: string; toDate: string }>();

  get showFromError(): boolean {
    return this.required && this.touched && !this.fromDate;
  }

  get showToError(): boolean {
    return this.required && this.touched && !this.toDate;
  }

  onFromChange(val: string): void {
    this.fromDate = val;
    this.fromDateChange.emit(val);
    this.change.emit({ fromDate: this.fromDate, toDate: this.toDate });
  }

  onToChange(val: string): void {
    this.toDate = val;
    this.toDateChange.emit(val);
    this.change.emit({ fromDate: this.fromDate, toDate: this.toDate });
  }
}
