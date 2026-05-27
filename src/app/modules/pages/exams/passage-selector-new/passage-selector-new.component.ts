import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import katex from 'katex';

@Component({
  selector: 'app-passage-selector-new',
  standalone: false,
  templateUrl: './passage-selector-new.component.html',
  styleUrl: './passage-selector-new.component.scss',
})
export class PassageSelectorNewComponent implements OnInit {
  // Passages already filtered by parent (classNo + subjectId)
  @Input() passages: any[] = [];

  // All passages — used when filter is cleared inside popup
  @Input() allPassages: any[] = [];

  // Pre-selected filters from parent context
  @Input() preselectedClassNo: number | null = null;
  @Input() preselectedSubjectId: string | null = null;

  @Output() selected = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  activePassage: any = null;
  previewHtml: SafeHtml = '';
  previewLoading = false;

  // Internal filter state (user can override inside popup)
  filterClassNo: number | null = null;
  filterSubjectId: string | null = null;

  filteredPassages: any[] = [];

  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `Class ${i + 6}`,
      value: i + 6,
    })),
    { label: '12th Pass', value: 13 },
  ];

  subjects: any[] = [];
  subjectOptions: any[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private commonApi: CommonapiService,
  ) {}

  ngOnInit(): void {
    // Apply preselected filters from parent
    this.filterClassNo = this.preselectedClassNo || null;
    this.filterSubjectId = this.preselectedSubjectId || null;

    // Load subjects for filter dropdown
    this.loadSubjects();

    // Apply initial filter
    this.applyFilter();
  }

  private loadSubjects(): void {
    const entiId = localStorage.getItem('tenantId') || '';
    this.commonApi
      .fetchData({ entiId }, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjects = res?.data || [];
          this.subjectOptions = this.subjects.map((s: any) => ({
            label: s.subjectName,
            value: s._id,
          }));
        },
      });
  }

  applyFilter(): void {
    let list = [...this.allPassages];

    if (this.filterClassNo) {
      list = list.filter((p) => p.classNo === this.filterClassNo);
    }
    if (this.filterSubjectId) {
      list = list.filter((p) => {
        const sid = p.subjectId?._id || p.subjectId;
        return sid === this.filterSubjectId;
      });
    }

    this.filteredPassages = list;

    // Reset preview if active passage is no longer in list
    if (
      this.activePassage &&
      !this.filteredPassages.includes(this.activePassage)
    ) {
      this.activePassage = null;
      this.previewHtml = '';
    }
  }

  clearFilter(): void {
    this.filterClassNo = null;
    this.filterSubjectId = null;
    this.applyFilter();
  }

  async selectPassage(p: any): Promise<void> {
    this.activePassage = p;
    const html = p?.passageHtml || p?.content || '';
    this.previewLoading = true;
    const processedHtml = await this.replaceDownloadUrls(html);
    const renderedHtml = this.renderLatexInHtml(processedHtml);
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(renderedHtml);
    this.previewLoading = false;
  }

  confirm(): void {
    if (this.activePassage) this.selected.emit(this.activePassage);
  }

  close(): void {
    this.closed.emit();
  }

  /* ================= IMAGE DOWNLOAD ================= */

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
            'download',
          ),
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

  /* ================= LATEX RENDERING ================= */

  private decodeHtmlEntities(text: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  private renderLatexInHtml(html: string): string {
    if (!html) return html;
    let result = html.replace(/\\\[([\s\S]+?)\\\]/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\$([^$]+?)\$/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return m;
      }
    });
    return result;
  }
}
