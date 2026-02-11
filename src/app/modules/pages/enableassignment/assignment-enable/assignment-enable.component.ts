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
  topicsLoading = false;
  selectedBatchLabel = '';
  private moduleName = 'assignment';
  @ViewChild('testsModal') testsModalRef!: ElementRef;
  private bsTestsModal: any;
  modalLoading = false;
  modalTopic: any = null;
  modalRows: any[] = [];
  @ViewChild('disableModal') disableModalRef!: ElementRef;
  private bsDisableModal: any;
  disableTopicRef: any = null;
  disableConfirmText = '';
  subjectsLoading = false;
  batchesLoading = false;

  constructor(
    private fb: FormBuilder,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private breadcrump: BredcrumpService,
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
    this.filterForm.get('batchId')?.valueChanges.subscribe(() => {
      this.topics = [];
      this.topicsLoaded = false;
      this.selectedBatchLabel = this.getSelectedBatchLabel();
    });

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
    this.subjectsLoading = true;
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'ims', 'subject/list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjectsLoading = false;
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
          this.subjectsLoading = false;
          this.subjectsList = [];
          this.subjectOptions = [{ label: '-- Select Subject --', value: '' }];
        },
      });
  }

  loadBatches() {
    if (!this.canShowBatch()) return;
    this.batchesLoading = true;
    const classNo = toNum(this.filterForm.get('classNo')?.value);
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
          this.batchOptions = [
            { label: '-- Select Batch --', value: '' },
          ].concat(
            this.batchesRaw.map((b: any) => ({
              label: `${b?.batchCode || '-'} - ${b?.batchName || '-'}`,
              value: safeTrim(b?.batchId),
              _raw: b,
            })),
          );
          this.batchesLoading = false;
        },
        error: (err: any) => {
          this.batchesLoading = false;
          this.loading = false;
          this.batchesRaw = [];
          this.batchOptions = [{ label: '-- Select Batch --', value: '' }];
          this.alert.error(err?.error?.message || 'Failed to load batches');
        },
      });
  }

  private getSelectedBatchLabel(): string {
    const bid = safeTrim(this.filterForm.get('batchId')?.value);
    if (!bid) return '';
    const opt = (this.batchOptions || []).find(
      (o: any) => safeTrim(o?.value) === bid,
    );
    return safeTrim(opt?.label || '');
  }

  onClassOrSubjectChanged() {
    this.filterForm.patchValue({ batchId: '' }, { emitEvent: false });
    this.batchOptions = [{ label: '-- Select Batch --', value: '' }];
    this.batchesRaw = [];
    this.topics = [];
    this.topicsLoaded = false;
    this.selectedBatchLabel = '';
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    if (!classNo || !subjectId) return;

    this.loadBatches();
  }

  loadTopics() {
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    const batchId = safeTrim(this.filterForm.get('batchId')?.value);
    if (!classNo || !subjectId || !batchId) {
      this.alert.error('Select class, subject and batch');
      return;
    }
    this.selectedBatchLabel = this.getSelectedBatchLabel();
    this.topicsLoading = true;
    this.topicsLoaded = false;
    this.topics = [];
    const qp = `?classNo=${encodeURIComponent(String(classNo))}&subjectId=${encodeURIComponent(subjectId)}`;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId },
        this.moduleName,
        `topic/enablestatus${qp}`,
      )
      .subscribe({
        next: (res: any) => {
          this.topicsLoading = false;
          this.topics = Array.isArray(res?.data) ? res.data : [];
          this.topicsLoaded = true;
        },
        error: (err: any) => {
          this.topicsLoading = false;
          this.topics = [];
          this.topicsLoaded = true;
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
    const topicId = safeTrim(topic?.topicId);
    if (!classNo || !subjectId || !batchId || !topicId) {
      this.alert.error('Select class, subject, batch and topic');
      return;
    }
    topic.enabling = true;
    const qp =
      `?list=full` +
      `&classNo=${encodeURIComponent(String(classNo))}` +
      `&subjectId=${encodeURIComponent(subjectId)}` +
      `&topicId=${encodeURIComponent(topicId)}`;
    this.commonApi
      .fetchData({ entiId: this.entiId }, this.moduleName, `list${qp}`)
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const tests = rows
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
                batchId,
                subjectId,
                classNo,
                tests,
              },
              this.moduleName,
              'enableto/batch',
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

  openTestsModal(topic: any) {
    if (!topic) return;
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    const batchId = safeTrim(this.filterForm.get('batchId')?.value);
    const topicId = safeTrim(topic?.topicId);
    if (!classNo || !subjectId || !batchId || !topicId) {
      this.alert.error('Select class, subject, batch and topic');
      return;
    }
    this.modalTopic = topic;
    this.modalRows = [];
    this.modalLoading = true;
    const qp =
      `?classNo=${encodeURIComponent(String(classNo))}` +
      `&subjectId=${encodeURIComponent(subjectId)}` +
      `&topicId=${encodeURIComponent(topicId)}`;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId },
        this.moduleName,
        `enabled/tests/by-topic${qp}`,
      )
      .subscribe({
        next: (res: any) => {
          this.modalLoading = false;
          this.modalRows = Array.isArray(res?.data) ? res.data : [];
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

  openDisableModal(topic: any) {
    if (!topic) return;
    const batchId = safeTrim(this.filterForm.get('batchId')?.value);
    if (!batchId) {
      this.alert.error('Select batch');
      return;
    }
    this.disableTopicRef = topic;
    this.disableConfirmText = '';
    if (!this.bsDisableModal) {
      this.bsDisableModal = new bootstrap.Modal(
        this.disableModalRef.nativeElement,
      );
    }
    this.bsDisableModal.show();
  }

  confirmDisable() {
    const txt = safeTrim(this.disableConfirmText).toLowerCase();
    if (txt !== 'disable') {
      this.alert.error('Type disable to confirm');
      return;
    }
    const topic = this.disableTopicRef;
    if (!topic) return;
    const classNo = toNum(this.filterForm.get('classNo')?.value);
    const subjectId = safeTrim(this.filterForm.get('subjectId')?.value);
    const batchId = safeTrim(this.filterForm.get('batchId')?.value);
    const topicId = safeTrim(topic?.topicId);
    if (!classNo || !subjectId || !batchId || !topicId) {
      this.alert.error('Select class, subject and batch');
      return;
    }
    topic.disabling = true;
    this.loading = true;
    const qp =
      `?classNo=${encodeURIComponent(String(classNo))}` +
      `&subjectId=${encodeURIComponent(subjectId)}` +
      `&topicId=${encodeURIComponent(topicId)}`;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId },
        this.moduleName,
        `enabled/tests/by-topic${qp}`,
      )
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const testIds = rows
            .map((r: any) => safeTrim(r?.testId))
            .filter(Boolean);
          if (!testIds.length) {
            this.loading = false;
            topic.disabling = false;
            this.alert.success('No enabled tests found to disable');
            try {
              this.bsDisableModal?.hide();
            } catch {}
            topic.enabled = false;
            return;
          }
          this.commonApi
            .fetchData(
              {
                entiId: this.entiId,
                userId: this.userId,
                batchId,
                subjectId,
                testIds,
              },
              this.moduleName,
              'disableto/batch',
            )
            .subscribe({
              next: () => {
                this.loading = false;
                topic.disabling = false;
                topic.enabled = false;
                this.alert.success('Disabled successfully');
                try {
                  this.bsDisableModal?.hide();
                } catch {}
              },
              error: (err: any) => {
                this.loading = false;
                topic.disabling = false;
                this.alert.error(err?.error?.message || 'Disable failed');
              },
            });
        },
        error: (err: any) => {
          this.loading = false;
          topic.disabling = false;
          this.alert.error(
            err?.error?.message || 'Failed to load enabled tests for disable',
          );
        },
      });
  }

  onTopicToggle(topic: any, nextVal: boolean) {
  if (nextVal === true) {
    topic.enabled = false;
    this.enableTopic(topic);
    return;
  }
  topic.enabled = true;
  this.openDisableModal(topic);
}
}
