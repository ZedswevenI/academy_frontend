import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ElementRef,
  ViewChild,
  forwardRef,
  SimpleChanges
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ReadonlyComponent } from '../readonly/readonly.component';

@Component({
  standalone: false,
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ReadonlyComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements AfterViewInit {

  @Input() label = '';
  @Input() required = false;
  @Input() value = '';
  @Input() minHeight = '150px';
  @Input() readOnly = false;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('editor', { static: true })
  editor!: ElementRef<HTMLDivElement>;

  private initialized = false;

  ngAfterViewInit(): void {
    this.initialized = true;
    this.setEditorContent(this.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['value'] &&
      this.initialized &&
      changes['value'].currentValue !== changes['value'].previousValue
    ) {
      this.setEditorContent(changes['value'].currentValue);
    }
  }


  private setEditorContent(value: string): void {
    if (!this.editor) return;

    const el = this.editor.nativeElement;

    // Prevent cursor jump when editing
    if (this.readOnly || el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }
  execCommand(command: string): void {
    document.execCommand(command, false);
  }

  insertLatex(): void {
    const latex = prompt('Enter LaTeX');
    if (latex) {
      document.execCommand(
        'insertHTML',
        false,
        `<span class="latex">\\(${latex}\\)</span>`
      );
    }
  }

  insertTable(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:10px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }
  onInput(): void {
    this.valueChange.emit(this.editor.nativeElement.innerHTML);
  }

  onPasteImage(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          document.execCommand(
            'insertHTML',
            false,
            `<img src="${reader.result}" style="max-width:100%" />`
          );
        };
        if (file) reader.readAsDataURL(file);
        event.preventDefault();
      }
    }
  }
}
