import {
  Component, Input, Output, EventEmitter, Optional, Self
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

@Component({
  selector: 'importfiles',
  standalone: false,
  templateUrl: './importfile.component.html',
  styleUrls: ['./importfile.component.scss']
})
export class ImportfileComponent implements ControlValueAccessor {

  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() multiple: boolean = false;
  @Input() accept: string = '*/*';
  @Input() id: string = 'fileInput';
  @Input() existingFiles: { url: string }[] = [];
  @Output() filesChanged = new EventEmitter<File[]>();
  files: File[] = [];
  maxFileSize = 20 * 1024 * 1024;
  downloadingIndex: number | null = null;
  allowedExtensions: string[] = [
    '.pdf', '.jpg', '.jpeg', '.png', '.svg',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ];
  onChange:  any = () => {};
  onTouched: any = () => {};

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private commonApi: CommonapiService
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get isInvalid(): boolean {
  const c = this.ngControl?.control;
  return !!(c && c.invalid && (c.touched || c.dirty));
}

  writeValue(value: any): void {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      this.files = [];
      return;
    }
    const arr = Array.isArray(value) ? value : [value];
    const realFiles  = arr.filter((v: any) => v instanceof File);
    const urlObjects = arr.filter((v: any) => !(v instanceof File) && v?.url);
    this.files = realFiles;
    if (urlObjects.length) {
      this.existingFiles = urlObjects;
    }
  }

  registerOnChange(fn: any): void  { this.onChange = fn; }
  
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const selectedFiles = Array.from(input.files);
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.allowedExtensions.includes(ext)) {
        alert(`Invalid file format: ${file.name}`); continue;
      }
      if (file.size > this.maxFileSize) {
        alert(`File too large (Max 20MB): ${file.name}`); continue;
      }
      validFiles.push(file);
    }
    if (!validFiles.length) return;
    this.files = this.multiple ? [...this.files, ...validFiles] : [validFiles[0]];
    if (!this.multiple) this.existingFiles = [];
    this.onChange(this.multiple ? this.files : this.files[0]);
    this.onTouched();
    this.filesChanged.emit(this.files);
    input.value = '';
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    this.onChange(this.multiple ? this.files : this.files[0] || null);
    this.filesChanged.emit(this.files);
  }

  // ── Existing file helpers ─────────────────────────────────────────────────

  getFileName(url: string): string {
    return url?.split('/').pop()?.split('?')[0] || 'attachment';
  }

  downloadFile(url: string, index: number): void {
    this.downloadingIndex = index;
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (blob: Blob) => {
        const a = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = this.getFileName(url);
        a.click();
        URL.revokeObjectURL(a.href);
        this.downloadingIndex = null;
      },
      error: () => { this.downloadingIndex = null; }
    });
  }
}