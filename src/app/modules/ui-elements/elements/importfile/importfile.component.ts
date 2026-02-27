import {
  Component,
  Input,
  Output,
  EventEmitter,
  Optional,
  Self
} from '@angular/core';

import {
  ControlValueAccessor,
  NgControl
} from '@angular/forms';

@Component({
  selector: 'importfiles',
  standalone: false,
  templateUrl: './importfile.component.html',
  styleUrls: ['./importfile.component.scss']
  // ✅ Remove the providers array entirely — no NG_VALUE_ACCESSOR here
})
export class ImportfileComponent implements ControlValueAccessor {

  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() multiple: boolean = false;
  @Input() accept: string = '*/*';
  @Input() id: string = 'fileInput';

  @Output() filesChanged = new EventEmitter<File[]>();

  files: File[] = [];
  maxFileSize = 20 * 1024 * 1024;

  allowedExtensions: string[] = [
    '.pdf', '.jpg', '.jpeg', '.png', '.svg',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ];

  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    // ✅ Set value accessor here instead of using providers
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get isInvalid(): boolean {
    const control = this.ngControl?.control;
    return !!(
      control &&
      control.invalid &&
      (control.touched || control.dirty)
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

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

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

    this.files = this.multiple ? [...this.files, ...validFiles] : [validFiles[0]];

    const valueToEmit = this.multiple ? this.files : this.files[0];
    this.onChange(valueToEmit);
    this.onTouched();
    this.filesChanged.emit(this.files);
    input.value = '';
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    const valueToEmit = this.multiple ? this.files : this.files[0] || null;
    this.onChange(valueToEmit);
    this.filesChanged.emit(this.files);
  }
}