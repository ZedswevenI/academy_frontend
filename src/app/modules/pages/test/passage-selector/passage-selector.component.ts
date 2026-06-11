import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

@Component({
  selector: 'app-passage-selector',
  standalone: false,
  templateUrl: './passage-selector.component.html',
  styleUrls: ['./passage-selector.component.scss']
})
export class PassageSelectorComponent {

  @Input() passages: any[] = [];
  @Output() selected = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  activePassage: any = null;
  previewHtml: SafeHtml = '';
  previewLoading = false;

  constructor(
    private sanitizer: DomSanitizer,
    private commonApi: CommonapiService
  ) {}

  async selectPassage(p: any): Promise<void> {
    this.activePassage = p;
    const html = p?.passageHtml || p?.content || '';
    this.previewLoading = true;
    const processedHtml = await this.replaceDownloadUrls(html);
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
    this.previewLoading = false;
  }

  confirm(): void {
    if (this.activePassage) {
      this.selected.emit(this.activePassage);
    }
  }

  close(): void {
    this.closed.emit();
  }

  private async replaceDownloadUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;

    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;

    for (const match of matches) {
      const originalUrl = match[1];
      if (originalUrl.startsWith('data:')) continue;
      try {
        const downloadRes: any = await firstValueFrom(
          this.commonApi.fetchData(
            { url: originalUrl },
            'exam/questions/image',
            'download'
          )
        );
        if (downloadRes?.status && downloadRes.url) {
          updatedHtml = updatedHtml.replace(originalUrl, downloadRes.url);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }
}
