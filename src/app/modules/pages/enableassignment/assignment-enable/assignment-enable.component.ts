import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

declare var bootstrap: any;

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();
const toNum = (v: any) => {
  const n = Number(
    String(v ?? '')
      .replace(/,/g, '')
      .trim(),
  );
  return Number.isFinite(n) ? n : 0;
};

@Component({
  selector: 'app-assignment-enable',
  standalone: false,
  templateUrl: './assignment-enable.component.html',
  styleUrl: './assignment-enable.component.scss',
})
export class AssignmentEnableComponent implements OnInit {
  entiId: any;
  userId: any;
  loading = false;
  filterForm!: FormGroup;
  classOptions: any[] = [{ label: '-- Select Class --', value: '' }];
  subjectOptions: any[] = [{ label: '-- Select Subject --', value: '' }];
  batchOptions: any[] = [{ label: '-- Select Batch --', value: '' }];
  subjectsList: any[] = [];
  batchesRaw: any[] = [];
  topics: any[] = [];
  topicsLoaded = false;
  selectedBatchLabel = '';
  @ViewChild('testsModal') testsModalRef!: ElementRef;
  private bsTestsModal: any;
  modalLoading = false;
  modalTopic: any = null;
  modalRows: any[] = [];
  private moduleName = 'assignment';
  topicsLoading = false;

  constructor(
    private fb: FormBuilder,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private breadcrump : BredcrumpService
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.userId =
      localStorage.getItem('userId') || localStorage.getItem('userid');
    this.breadcrump.set([{ label: 'Assignment' }]);
  }

  ngOnInit(): void {
    this.classOptions = this.classOptions.concat(
      [6, 7, 8, 9, 10, 11, 12, 13].map((c) => ({ label: String(c), value: c })),
    );
    this.filterForm = this.fb.group({
      classNo: ['', [Validators.required]],
      subjectId: ['', [Validators.required]],
      batchId: ['', [Validators.required]],
    });
    this.filterForm
      .get('classNo')
      ?.valueChanges.subscribe(() => this.onClassOrSubjectChanged());
    this.filterForm
      .get('subjectId')
      ?.valueChanges.subscribe(() => this.onClassOrSubjectChanged());
    this.loadSubjects();
  }

  canShowBatch(): boolean {
    return (
      !!safeTrim(this.filterForm.get('classNo')?.value) &&
      !!safeTrim(this.filterForm.get('subjectId')?.value)
    );
  }

  resetAll() {
    this.filterForm.reset({ classNo: '', subjectId: '', batchId: '' });
    this.batchOptions = [{ label: '-- Select Batch --', value: '' }];
    this.batchesRaw = [];
    this.topics = [];
    this.topicsLoaded = false;
    this.selectedBatchLabel = '';
  }

  loadSubjects() {
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'ims', 'subject/list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjectsList = res?.data || [];
          this.subjectOptions = [
            { label: '-- Select Subject --', value: '' },
          ].concat(
            this.subjectsList.map((s: any) => ({
              label: `${s?.subjectName || '-'} (${s?.subjectCode || '-'})`,
              value: safeTrim(s?.subjectId || s?._id),
              _raw: s,
            })),
          );
        },
        error: () => {
          this.subjectsList = [];
          this.subjectOptions = [{ label: '-- Select Subject --', value: '' }];
        },
      });
  }

  loadBatches() {
    if (!this.canShowBatch()) {
      this.alert.error('Select class and subject');
      return;
    }
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    this.loading = true;
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          const all = Array.isArray(res?.data) ? res.data : [];
          this.batchesRaw = all.filter((b: any) => {
            const st = safeTrim(b?.status).toUpperCase();
            if (st === 'CLOSED' || st === 'INACTIVE') return false;
            if (toNum(b?.classNo) !== classNo) return false;
            return true;
          });
          console.log('this.batchesRaw ', this.batchesRaw);
          this.batchOptions = [
            { label: '-- Select Batch --', value: '' },
          ].concat(
            this.batchesRaw.map((b: any) => ({
              label: `${b?.batchCode || '-'} - ${b?.batchName || '-'}`,
              value: safeTrim(b?.batchId),
              _raw: b,
            })),
          );
          if (!this.batchesRaw.length) {
            this.alert.success('No batches found for selected Class + Subject');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.batchesRaw = [];
          this.batchOptions = [{ label: '-- Select Batch --', value: '' }];
          this.alert.error(err?.error?.message || 'Failed to load batches');
        },
      });
  }

  loadTopics() {
    const classNo = Number(this.filterForm.get('classNo')?.value || 0);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    if (!classNo || !subjectId) {
      this.topics = [];
      this.topicsLoaded = false;
      return;
    }
    const qp =
      `?list=full&classNo=${encodeURIComponent(String(classNo))}` +
      `&subjectId=${encodeURIComponent(subjectId)}`;
    this.topicsLoading = true;
    this.topicsLoaded = false;
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'ims/topic', `list${qp}`)
      .subscribe({
        next: (res: any) => {
          this.topicsLoading = false;
          this.topics = Array.isArray(res?.data) ? res.data : [];
          this.topicsLoaded = true;
        },
        error: (err: any) => {
          this.topicsLoading = false;
          this.topics = [];
          this.topicsLoaded = false;
          this.alert.error(err?.error?.message || 'Failed to load topics');
        },
      });
  }

  enableTopic(topic: any) {
    if (!topic || topic.enabling) return;
    if (this.filterForm.invalid) {
      this.alert.error('Select class, subject and batch');
      return;
    }
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    const batchId = safeTrim(this.filterForm.get('batchId')?.value);
    topic.enabling = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          classNo,
          subjectId,
          topicId: safeTrim(topic?.topicId),
        },
        this.moduleName,
        'tests/bytopic',
      )
      .subscribe({
        next: (res: any) => {
          const testsRaw = res?.data || [];
          const tests = testsRaw
            .map((t: any) => ({
              testId: safeTrim(t?.testId),
              testNo:
                t?.testNo === null || t?.testNo === undefined
                  ? null
                  : safeTrim(t?.testNo),
            }))
            .filter((x: any) => !!x.testId);

          if (!tests.length) {
            topic.enabling = false;
            this.alert.success('No tests found under this topic');
            return;
          }
          this.commonApi
            .fetchData(
              {
                entiId: this.entiId,
                userId: this.userId,
                batchId,
                subjectId,
                classNo,
                tests,
              },
              this.moduleName,
              'enable',
            )
            .subscribe({
              next: () => {
                topic.enabling = false;
                topic.enabled = true;
                this.alert.success('Enabled successfully');
              },
              error: (err: any) => {
                topic.enabling = false;
                this.alert.error(err?.error?.message || 'Enable failed');
              },
            });
        },
        error: (err: any) => {
          topic.enabling = false;
          this.alert.error(
            err?.error?.message || 'Failed to load tests for topic',
          );
        },
      });
  }

  private markEnabledTopicsFromEnabledTests(
    batchId: string,
    subjectId: string,
  ) {
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId, subjectId },
        this.moduleName,
        'enabled/list',
      )
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  openTestsModal(topic: any) {
    if (!topic) return;
    if (this.filterForm.invalid) {
      this.alert.error('Select class, subject and batch');
      return;
    }
    this.modalTopic = topic;
    this.modalRows = [];
    this.modalLoading = true;
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    const topicId = safeTrim(topic?.topicId);
    this.commonApi
      .fetchData(
        { entiId: this.entiId, classNo, subjectId, topicId },
        this.moduleName,
        'tests/bytopic/full',
      )
      .subscribe({
        next: (res: any) => {
          this.modalLoading = false;
          this.modalRows = res?.data || [];
          this.showTestsModal();
        },
        error: (err: any) => {
          this.modalLoading = false;
          this.alert.error(err?.error?.message || 'Failed to load tests');
        },
      });
  }

  private showTestsModal() {
    if (!this.bsTestsModal) {
      this.bsTestsModal = new bootstrap.Modal(this.testsModalRef.nativeElement);
    }
    this.bsTestsModal.show();
  }

  viewTest(row: any) {
    this.alert.success(`View Test: ${row?.testNo || row?.testId || '-'}`);
  }

  onClassOrSubjectChanged() {
    this.filterForm.patchValue({ batchId: '' }, { emitEvent: false });
    this.batchOptions = [{ label: '-- Select Batch --', value: '' }];
    this.batchesRaw = [];
    this.topics = [];
    this.topicsLoaded = false;
    const classNo = Number(this.filterForm.get('classNo')?.value || 0);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    if (!classNo || !subjectId) return;
    this.loadBatches();
  }
}
