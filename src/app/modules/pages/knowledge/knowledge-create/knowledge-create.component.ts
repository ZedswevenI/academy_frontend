import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

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
  isEditMode    = false;
  editMaterial: any = null;

  uploadedFiles: any[] = [];

  class_options = Array.from({ length: 8 }, (_, i) => ({
    label: (i + 6).toString(), value: i + 6
  }));

  batch_options:   any[] = [];
  subjects:        any[] = [];
  topics:          any[] = [];
  subTopics:       any[] = [];
  studentOptions:  any[] = [];
  allBatches:      any[] = [];
  allTopics:       any[] = [];
  allSubTopics:    any[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private fb:         FormBuilder,
    private router:     Router,
    private commonApi:  CommonapiService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav           = this.router.getCurrentNavigation();
    const stateMaterial = nav?.extras?.state?.['material'];

    if (stateMaterial) {
      this.isEditMode   = true;
      this.materialId   = stateMaterial.materialId;
      this.editMaterial = stateMaterial;
      this.breadcrumb.set([{ label: 'Knowledge Base', link: '/app/knowledge' }, { label: 'Edit' }]);
    } else {
      this.breadcrumb.set([{ label: 'Knowledge Base', link: '/app/knowledge' }, { label: 'Create' }]);
    }

    this.buildForm();
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadSubjects(),
      this.loadAllTopics(),
      this.loadAllSubTopics(),
      this.getBatchList()
    ]);

    this.registerValueChanges();

    if (this.isEditMode && this.editMaterial) {
      await this.patchEditData(this.editMaterial);
    }
  }

  private buildForm(): void {
    this.knowledgeForm = this.fb.group({
      title:          ['', Validators.required],
      classNo:        ['', Validators.required],
      subjectId:      ['', Validators.required],
      topicId:        ['', Validators.required],
      subTopicId:     [''],
      description:    [''],
      batchId:        ['', Validators.required],
      studentIds:     [[]],
      availableFrom:  ['', Validators.required],
      availableUntil: ['', Validators.required],
      attachmentUrl:  [[], Validators.required]
    });
  }

  // ── Value change listeners ─────────────────────────────────────────────────

  private registerValueChanges(): void {
    this.knowledgeForm.get('subjectId')?.valueChanges.subscribe(val => this.onSubjectChange(val));
    this.knowledgeForm.get('topicId')?.valueChanges.subscribe(val => this.onTopicChange(val));
    this.knowledgeForm.get('batchId')?.valueChanges.subscribe(val => this.onBatchChange(val));
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
    const isUuidMatch  = currentTopic && this.allTopics.some(t => t.topicId === currentTopic);
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
    const currentSub  = this.knowledgeForm.get('subTopicId')?.value;
    const isUuidMatch = this.allSubTopics.some(s => s.subTopicId === currentSub);
    if (isUuidMatch) {
      this.knowledgeForm.patchValue({ subTopicId: '' }, { emitEvent: false });
    }
  }

  // ── Batch → Students ──────────────────────────────────────────────────────

  private onBatchChange(batchId: any): void {
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
      }
    });
  }

  // ── Loaders ───────────────────────────────────────────────────────────────

  private getBatchList(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe((res: any) => {
          if (res?.status) {
            this.allBatches   = res.data;
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
    formData.append('file',     files[0]);
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

    const subjectId  = typeof d.subjectId  === 'object' ? d.subjectId?._id            : d.subjectId;
    // topicId may be null, a plain string UUID, or a nested object
    const topicId    = !d.topicId
      ? ''
      : typeof d.topicId === 'object'
        ? (d.topicId?.topicId || '')
        : d.topicId;
    // subTopicId same pattern
    const subTopicId = !d.subTopicId
      ? ''
      : typeof d.subTopicId === 'object'
        ? (d.subTopicId?.subTopicId || '')
        : d.subTopicId;

    this.knowledgeForm.patchValue({
      title:          d.title,
      description:    d.description,
      classNo:        d.classNo,
      subjectId,
      availableFrom:  this.formatDate(d.availableFrom),
      availableUntil: this.formatDate(d.availableUntil),
      batchId:        d.batchIds?.[0] || '',
      attachmentUrl:  d.attachmentUrl || []
    }, { emitEvent: false });

    // Build topics/subtopics from cache
    this.onSubjectChange(subjectId);
    this.knowledgeForm.patchValue({ topicId }, { emitEvent: false });
    this.onTopicChange(topicId);
    this.knowledgeForm.patchValue({ subTopicId: subTopicId || '' }, { emitEvent: false });

    await this.loadStudentsForEdit(d.batchIds?.[0], d.studentIds);
  }

  private loadStudentsForEdit(batchId: string, selectedStudentIds: string[]): Promise<void> {
    return new Promise(resolve => {
      if (!batchId) { resolve(); return; }

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

    const f = this.knowledgeForm.value;

    const payload: any = {
      tenantId:       this.tenantId,
      title:          f.title,
      description:    f.description,
      classNo:        f.classNo,
      subjectId:      f.subjectId,
      topicId:        f.topicId,        // UUID string or free-text name
      subTopicId:     f.subTopicId,     // UUID string or free-text name
      batchIds:       f.batchId ? [f.batchId] : [],
      studentIds:     (f.studentIds || []).map((s: any) => typeof s === 'string' ? s : s.value),
      availableFrom:  new Date(f.availableFrom).getTime(),
      availableUntil: new Date(f.availableUntil).getTime(),
      attachmentUrl:  f.attachmentUrl,
      status:         'Active'
    };

    if (this.isEditMode) payload.materialId = this.materialId;

    this.commonApi.fetchData(payload, 'institue/library', this.isEditMode ? 'edit' : 'create')
      .subscribe((res: any) => {
        if (res?.status) this.router.navigate(['/app/knowledge']);
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