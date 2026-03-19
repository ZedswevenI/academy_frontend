import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-passage-selector',
  standalone : false,
  templateUrl: './passage-selector.component.html',
  styleUrls: ['./passage-selector.component.scss']
})
export class PassageSelectorComponent {

  @Input() passages: any[] = [];   // list from API
  @Output() selected = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  activePassage: any = null;

  selectPassage(p: any): void {
    this.activePassage = p;
  }

  confirm(): void {
    if (this.activePassage) {
      this.selected.emit(this.activePassage);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
