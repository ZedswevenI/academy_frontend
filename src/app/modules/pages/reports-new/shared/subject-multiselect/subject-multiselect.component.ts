import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { SubjectOption } from '../../report.service';

@Component({
  selector: 'app-subject-select',
  standalone: false,
  templateUrl: `./subject-multiselect.component.html`
})
export class SubjectSelectComponent implements OnChanges {
  @Input() options: SubjectOption[] = [];
  @Input() loading = false;
  @Input() hint = '';
  @Input() selectedValue = '';
  @Input() fromDate = '';
  @Input() toDate = '';
  @Output() selectedValueChange = new EventEmitter<string>();
  @Input() touched = false;
  @Output() fromDateChange = new EventEmitter<string>();
  @Output() toDateChange = new EventEmitter<string>();
  @Output() change = new EventEmitter<{ fromDate: string; toDate: string }>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.selectedValue) {
      const valid = this.options.some(o => o.value === this.selectedValue);
      if (!valid) {
        this.selectedValue = '';
        this.selectedValueChange.emit('');
      }
    }
  }

  onChange(val: string): void {
    this.selectedValue = val;
    this.selectedValueChange.emit(val);
  }

  onFromChange(val: string): void {
    this.fromDate = val;
    this.fromDateChange.emit(val);
    this.change.emit({ fromDate: this.fromDate, toDate: this.toDate });
  }
}
