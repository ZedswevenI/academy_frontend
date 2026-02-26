import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  Optional,
  Self
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NgControl
} from '@angular/forms';

@Component({
  selector: 'importfiles',
  standalone: false,
  templateUrl: './importfile.component.html',
  styleUrls: ['./importfile.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImportfileComponent),
      multi: true
    }
  ]
})
export class ImportfileComponent implements ControlValueAccessor {

  // ==========================
  // Inputs (UNCHANGED)
  // ==========================
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() multiple: boolean = false;
  @Input() accept: string = '*/*';
  @Input() id: string = 'fileInput';

  // ==========================
  // Output (UNCHANGED)
  // ==========================
  @Output() filesChanged = new EventEmitter<File[]>();

  // ==========================
  // Internal State (UNCHANGED)
  // ==========================
  files: File[] = [];

  maxFileSize = 20 * 1024 * 1024; // 20MB

  allowedExtensions: string[] = [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.svg',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx'
  ];

  // ==========================
  // ControlValueAccessor
  // ==========================
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(
    @Optional() @Self() public ngControl: NgControl
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // ==========================
  // Validation Getter
  // ==========================
  get isInvalid(): boolean {
    return !!(
      this.ngControl?.control &&
      this.ngControl.control.invalid &&
      (this.ngControl.control.touched ||
       this.ngControl.control.dirty)
    );
  }

  writeValue(value: any): void {
    if (Array.isArray(value)) {
      this.files = value;
    } else if (value) {
      this.files = [value];
    } else {
      this.files = [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // ==========================
  // File Selection
  // ==========================
  onFileChange(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const selectedFiles: File[] = Array.from(input.files);
    const validFiles: File[] = [];

    for (let file of selectedFiles) {

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!this.allowedExtensions.includes(ext)) {
        alert(`❌ Invalid file format: ${file.name}`);
        continue;
      }

      if (file.size > this.maxFileSize) {
        alert(`❌ File too large (Max 20MB): ${file.name}`);
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) return;

    // Single vs Multiple handling
    this.files = this.multiple
      ? [...this.files, ...validFiles]
      : [validFiles[0]];

    const valueToEmit = this.multiple
      ? this.files
      : this.files[0];

    // Update Angular form
    this.onChange(valueToEmit);
    this.onTouched();

    // Emit to parent
    this.filesChanged.emit(this.files);

    // Reset input so same file can be selected again
    input.value = '';
  }

  // ==========================
  // Remove File
  // ==========================
  removeFile(index: number): void {

    this.files.splice(index, 1);

    const valueToEmit = this.multiple
      ? this.files
      : this.files[0] || null;

    this.onChange(valueToEmit);
    this.filesChanged.emit(this.files);
  }
}