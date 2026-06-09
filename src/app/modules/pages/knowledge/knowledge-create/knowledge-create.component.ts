import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-knowledge-create',
  standalone: false,
  templateUrl: './knowledge-create.component.html',
  styleUrls: ['./knowledge-create.component.scss']
})
export class KnowledgeCreateComponent implements OnInit {
  knowledgeForm!: FormGroup;
  tenantId: any;
  materialId: string | null = null;
  isEditMode = false;
  editMaterial: any = null;
  loading = false;
  todayDate = new Date().toISOString().split('T')[0];
  minUntilDate = this.todayDate;
  uploadedFiles: any[] = [];
  class_options = Array.from({ length: 8 }, (_, i) => ({
    label: (i + 6) === 13 ? '12th Pass' : (i + 6).toString(), value: i + 6
  }));
  batch_options: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subTopics: any[] = [];
  studentOptions: any[] = [];
  allBatches: any[] = [];
  allTopics: any[] = [];
  allSubTopics: any[] = [];
  selectedBatchCodes: string[] = [];
  selectAllBatches = false;
  studentBatchCode = '';
  private allSelectedStudentIds: Set<string> = new Set();

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
     private alert: AlertService,
    private router: Router,
    private commonApi: CommonapiService,
    private authService: AuthService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav = this.router.getCurrentNavigation();
    const stateMaterial = nav?.extras?.state?.['material'];

    if (stateMaterial) {
      this.isEditMode = true;
      this.materialId = stateMaterial.materialId;
      this.editMaterial = stateMaterial;
      this.breadcrumb.set([{ label: 'Library', link: '/app/knowledge' }, { label: 'Edit' }]);
    } else {
      this.breadcrumb.set([{ label: 'Library', link: '/app/knowledge' }, { label: 'Create' }]);
    }

    this.buildForm();

    this.knowledgeForm.get('availableFrom')?.valueChanges.subscribe((val: string) => {
      this.minUntilDate = val || this.todayDate;
      const until = this.knowledgeForm.get('availableUntil')?.value;
      if (until && until < this.minUntilDate) {
        this.knowledgeForm.get('availableUntil')?.setValue('');
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const role = this.authService.getRole();
    if (role === 'L4') {
      await this.loadTeacherMaps();
    } else {
      await Promise.all([
        this.loadSubjects(),
        this.loadAllTopics(),
        this.loadAllSubTopics(),
        this.getBatchList()
      ]);
    }
    if (role === 'L4') {
       await Promise.all([
        this.loadAllTopics(),
        this.loadAllSubTopics()
      ]);
    }
    this.registerValueChanges();
    if (this.isEditMode && this.editMaterial) {
      await this.patchEditData(this.editMaterial);
    }
  }

  private loadTeacherMaps(): Promise<void> {
    return new Promise(resolve => {
      const staffId = this.authService.getStaffId();
      this.commonApi.fetchData({ tenantId: this.tenantId, staffId }, 'teacher', 'getstaffmaps').subscribe({
        next: (res: any) => {
          if (res.status && res.data) {
            const data = res.data;
            this.class_options = (data.classes || []).map((c: any) => ({
              label: c.classNo === 13 ? '12th Pass' : c.classNo.toString(),
              value: c.classNo
            }));
            this.subjects = (data.subjects || []).map((s: any) => ({
              label: s.subjectName,
              value: s.subjectId
            }));
            this.batch_options = (data.batches || []).map((b: any) => ({
              label: b.batchName,
              value: b.batchCode
            }));
            this.allBatches = data.batches || [];
          }
          resolve();
        },
        error: () => {
          this.alert.error('Error loading teacher maps');
          resolve();
        }
      });
    });
  }

  private buildForm(): void {
    this.knowledgeForm = this.fb.group({
      title: ['', Validators.required],
      classNo: ['', Validators.required],
      subjectId: ['', Validators.required],
      topicId: ['', Validators.required],
      subTopicId: [''],
      description: [''],
      studentIds: [[]],
      availableFrom: ['', Validators.required],
      availableUntil: ['', Validators.required],
      attachmentUrl: [[], Validators.required]
    });
  }

  // ── Batch multi-select helpers ──────────────────────────────────────────
  isBatchSelected(code: string): boolean {
    return this.selectedBatchCodes.includes(code);
  }

  toggleBatch(code: string, checked: boolean): void {
    if (checked) {
      this.selectedBatchCodes = [...this.selectedBatchCodes, code];
    } else {
      this.selectedBatchCodes = this.selectedBatchCodes.filter(c => c !== code);
      this.selectAllBatches = false;
    }
    this.selectAllBatches = this.selectedBatchCodes.length === this.batch_options.length;
  }

  toggleAllBatches(checked: boolean): void {
    this.selectAllBatches = checked;
    this.selectedBatchCodes = checked ? this.batch_options.map(b => b.value) : [];
  }

  // ── Value change listeners ─────────────────────────────────────────────────

  private registerValueChanges(): void {
    this.knowledgeForm.get('subjectId')?.valueChanges.subscribe(val => this.onSubjectChange(val));
    this.knowledgeForm.get('topicId')?.valueChanges.subscribe(val => this.onTopicChange(val));
    // Batch → Student loading is handled by studentBatchCode dropdown
  }

  // ── Subject → Topics list ─────────────────────────────────────────────────

  private onSubjectChange(subjectId: any): void {
    const selectedClass = Number(this.knowledgeForm.get('classNo')?.value);

    this.topics = this.allTopics
      .filter(t => {
        const sid = typeof t.subjectId === 'object' ? t.subjectId._id : t.subjectId;
        return sid === subjectId && t.classNo === selectedClass;
      })
      .map(t => ({ label: t.topicName, value: t.topicId }));

    // Only reset topicId if it's currently a UUID from the old subject's list
    // Never wipe a manually-typed string or an already-empty value
    const currentTopic = this.knowledgeForm.get('topicId')?.value;
    const isUuidMatch = currentTopic && this.allTopics.some(t => t.topicId === currentTopic);
    if (isUuidMatch) {
      this.knowledgeForm.patchValue({ topicId: '', subTopicId: '' }, { emitEvent: false });
      this.subTopics = [];
    }
  }

  // ── Topic → SubTopics list ────────────────────────────────────────────────

  private onTopicChange(topicId: any): void {
    this.subTopics = this.allSubTopics
      .filter(s => {
        const tid = typeof s.topicId === 'object' ? s.topicId.topicId : s.topicId;
        return tid === topicId;
      })
      .map(s => ({ label: s.subTopicName, value: s.subTopicId }));

    // Only reset subTopicId if it was a UUID from the old topic
    const currentSub = this.knowledgeForm.get('subTopicId')?.value;
    const isUuidMatch = this.allSubTopics.some(s => s.subTopicId === currentSub);
    if (isUuidMatch) {
      this.knowledgeForm.patchValue({ subTopicId: '' }, { emitEvent: false });
    }
  }

  // ── Batch → Students ──────────────────────────────────────────────────────

  onBatchChange(batchId: any): void {
    // Save currently selected students before switching
    const currentIds: string[] = this.knowledgeForm.get('studentIds')?.value || [];
    currentIds.forEach(id => this.allSelectedStudentIds.add(id));

    this.studentBatchCode = batchId || '';
    this.studentOptions = [];
    this.knowledgeForm.patchValue({ studentIds: [] }, { emitEvent: false });
    if (!batchId) return;

    this.commonApi.fetchData({ entiId: this.tenantId }, 'student',
      `list?list=full&batchCode=${batchId}`
    ).subscribe((res: any) => {
      if (res?.status) {
        this.studentOptions = res.data.map((s: any) => ({
          label: `${s.student.name} (${s.admissionNo})`,
          value: s.studentId
        }));

        // Auto-select previously selected students for this batch
        const validIds = this.studentOptions
          .filter(opt => this.allSelectedStudentIds.has(opt.value))
          .map(opt => opt.value);
        if (validIds.length > 0) {
          setTimeout(() => {
            this.knowledgeForm.patchValue({ studentIds: validIds }, { emitEvent: false });
          }, 0);
        }
      }
    });
  }

  private getAllSelectedStudentIds(): string[] {
    // Merge currently visible selections into the accumulated set
    const currentIds: string[] = this.knowledgeForm.get('studentIds')?.value || [];
    // First, remove any students from current batch that are NOT selected (user may have deselected)
    const currentBatchStudentIds = this.studentOptions.map(opt => opt.value);
    currentBatchStudentIds.forEach(id => {
      if (!currentIds.includes(id)) {
        this.allSelectedStudentIds.delete(id);
      }
    });
    currentIds.forEach(id => this.allSelectedStudentIds.add(id));
    return Array.from(this.allSelectedStudentIds);
  }

  // ── Loaders ───────────────────────────────────────────────────────────────

  private getBatchList(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe((res: any) => {
          if (res?.status) {
            this.allBatches = res.data;
            this.batch_options = res.data.map((b: any) => ({ label: b.batchName, value: b.batchCode }));
          }
          resolve();
        });
    });
  }

  private loadSubjects(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
        .subscribe((res: any) => {
          this.subjects = (res?.data || []).map((s: any) => ({ label: s.subjectName, value: s._id }));
          resolve();
        });
    });
  }

  private loadAllTopics(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/topic', 'list?list=full')
        .subscribe((res: any) => { this.allTopics = res?.data || []; resolve(); });
    });
  }

  private loadAllSubTopics(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subtopic', 'list?list=full')
        .subscribe((res: any) => { this.allSubTopics = res?.data || []; resolve(); });
    });
  }

  // ── File upload ───────────────────────────────────────────────────────────

  onFilesSelected(files: File[]): void {
    if (!files?.length) return;
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('tenantId', this.tenantId);

    this.commonApi.uploadImage(formData, 'institue/library', 'upload').subscribe((res: any) => {
      if (res?.status) {
        this.uploadedFiles = [{ url: res.data.attachmentUrl }];
        this.knowledgeForm.patchValue({ attachmentUrl: this.uploadedFiles });
      }
    });
  }

  // ── Patch edit data ───────────────────────────────────────────────────────

  private formatDate(value: any): string {
    if (!value) return '';
    const date = new Date(Number(value));
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
  }

  private async patchEditData(d: any): Promise<void> {
    this.uploadedFiles = d.attachmentUrl || [];

    const subjectId = typeof d.subjectId === 'object' ? d.subjectId?._id : d.subjectId;

    // API returns text names (topicName / subTopicName) — use them directly.
    // Fall back to topicId/subTopicId fields for older records.
    const topicText = d.topicName || d.topicId || '';
    const subTopicText = d.subTopicName || d.subTopicId || '';

    this.knowledgeForm.patchValue({
      title: d.title,
      description: d.description,
      classNo: d.classNo,
      subjectId,
      availableFrom: this.formatDate(d.availableFrom),
      availableUntil: this.formatDate(d.availableUntil),
      attachmentUrl: d.attachmentUrl || [],
      topicId: topicText,
      subTopicId: subTopicText
    }, { emitEvent: false });

    // Restore multi-batch selection
    this.selectedBatchCodes = d.batchIds || [];
    this.selectAllBatches = this.selectedBatchCodes.length === this.batch_options.length;

    // Store saved studentIds for auto-selection when switching batches
    (d.studentIds || []).forEach((id: string) => this.allSelectedStudentIds.add(id));

    // Build topics dropdown for reference (user can still switch to select mode)
    this.onSubjectChange(subjectId);

    await this.loadStudentsForEdit(d.batchIds?.[0], d.studentIds);
  }


  private loadStudentsForEdit(batchId: string, selectedStudentIds: string[]): Promise<void> {
    return new Promise(resolve => {
      if (!batchId) { resolve(); return; }

      this.studentBatchCode = batchId;

      this.commonApi.fetchData({ entiId: this.tenantId }, 'student',
        `list?list=full&batchCode=${batchId}`
      ).subscribe((res: any) => {
        if (res?.status) {
          this.studentOptions = res.data.map((s: any) => ({
            label: `${s.student.name} (${s.admissionNo})`,
            value: s.studentId
          }));

          const validIds = (selectedStudentIds || []).filter(id =>
            this.studentOptions.some(opt => opt.value === id)
          );

          setTimeout(() => {
            this.knowledgeForm.patchValue({ studentIds: validIds }, { emitEvent: false });
            resolve();
          }, 0);
        } else { resolve(); }
      });
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  addKnowledge(): void {
    if (this.knowledgeForm.invalid) { this.knowledgeForm.markAllAsTouched(); return; }

    if (this.selectedBatchCodes.length === 0) {
      this.alert.error('Please select at least one batch');
      return;
    }

    const f = this.knowledgeForm.value;

    const topicText = this.allTopics.find(t => t.topicId === f.topicId)?.topicName || f.topicId || '';
    const subTopicText = this.allSubTopics.find(s => s.subTopicId === f.subTopicId)?.subTopicName || f.subTopicId || '';

    const payload: any = {
      tenantId: this.tenantId,
      title: f.title,
      description: f.description,
      classNo: f.classNo,
      subjectId: f.subjectId,
      topicId: topicText,
      subTopicId: subTopicText,
      batchIds: this.selectedBatchCodes,
      studentIds: this.getAllSelectedStudentIds(),
      availableFrom: new Date(f.availableFrom).getTime(),
      availableUntil: new Date(f.availableUntil).getTime(),
      attachmentUrl: f.attachmentUrl,
      status: 'Active'
    };

    if (this.isEditMode) payload.materialId = this.materialId;
    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/library', this.isEditMode ? 'edit' : 'create')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) this.router.navigate(['/app/knowledge']);
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message);
        }
      });
  }

  getFileName(url: string): string {
    return url?.split('/').pop()?.split('?')[0] || 'attachment';
  }

  downloadAttachment(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (blob: Blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.getFileName(url);
        a.click();
        URL.revokeObjectURL(a.href);
      }
    });
  }
}