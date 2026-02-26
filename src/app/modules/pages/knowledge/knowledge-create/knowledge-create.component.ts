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
  isEditMode = false;
  editMaterial: any = null;

  uploadedFiles: any[] = [];

  // Dropdowns
  class_options = Array.from({ length: 8 }, (_, i) => ({
    label: (i + 6).toString(),
    value: i + 6
  }));

  batch_options: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  allBatches: any[] = [];
  subTopics: any[] = [];
  studentOptions: any[] = [];

  // Raw caches
  allTopics: any[] = [];
  allSubTopics: any[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    // Read navigation state in constructor (only available here)
    const nav = this.router.getCurrentNavigation();
    const stateMaterial = nav?.extras?.state?.['material'];

    if (stateMaterial) {
      this.getBatchList()
      this.isEditMode = true;
      this.materialId = stateMaterial.materialId;
      this.editMaterial = stateMaterial; // store for use after data loads
      this.breadcrumb.set([
        { label: 'Knowledge Base', link: '/app/knowledge' },
        { label: 'Edit' }
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'Knowledge Base', link: '/app/knowledge' },
        { label: 'Create' }
      ]);
    }

    this.buildForm();
  }

  // ====================================================
  // INIT
  // ====================================================

  async ngOnInit(): Promise<void> {

    // Load all dropdown data in parallel first
    await Promise.all([
      this.loadSubjects(),
      this.loadAllTopics(),
      this.loadAllSubTopics(),
      this.getBatchList()
    ]);

    // Register listeners AFTER data loads so they don't fire during patch
    this.registerValueChanges();

    // Now safe to patch — allTopics & allSubTopics are populated
    if (this.isEditMode && this.editMaterial) {
      await this.patchEditData(this.editMaterial);
    }
  }

  private buildForm(): void {
    this.knowledgeForm = this.fb.group({
      title: ['', Validators.required],
      classNo: ['', Validators.required],
      subjectId: ['', Validators.required],
      topicId: ['', Validators.required],
      subTopicId: [''],
      description: [''],
      batchId: ['', Validators.required],
      studentIds: [[]],
      availableFrom: ['', Validators.required],
      availableUntil: ['', Validators.required],
      attachmentUrl: [[]]
    });
  }

  // ====================================================
  // VALUE CHANGE LISTENERS
  // ====================================================

  private registerValueChanges(): void {

    this.knowledgeForm.get('subjectId')?.valueChanges.subscribe(val => {
      this.onSubjectChange(val);
    });

    this.knowledgeForm.get('topicId')?.valueChanges.subscribe(val => {
      this.onTopicChange(val);
    });

    this.knowledgeForm.get('batchId')?.valueChanges.subscribe(val => {
      this.onBatchChange(val);
    });
  }

  // ====================================================
  // SUBJECT → TOPIC
  // ====================================================

  private onSubjectChange(subjectId: any): void {

    this.topics = [];
    this.subTopics = [];

    this.knowledgeForm.patchValue({
      topicId: '',
      subTopicId: ''
    }, { emitEvent: false });

    if (!subjectId) return;

    const selectedClass = Number(this.knowledgeForm.get('classNo')?.value);

    this.topics = this.allTopics
      .filter(t => {
        const topicSubjectId = typeof t.subjectId === 'object'
          ? t.subjectId._id
          : t.subjectId;
        return topicSubjectId === subjectId && t.classNo === selectedClass;
      })
      .map(t => ({
        label: t.topicName,
        value: t.topicId
      }));
  }

  // ====================================================
  // TOPIC → SUBTOPIC
  // ====================================================

  private onTopicChange(topicId: any): void {

    this.subTopics = [];

    this.knowledgeForm.patchValue({
      subTopicId: ''
    }, { emitEvent: false });

    if (!topicId) return;

    this.subTopics = this.allSubTopics
      .filter(s =>
        (typeof s.topicId === 'object'
          ? s.topicId.topicId
          : s.topicId) === topicId
      )
      .map(s => ({
        label: s.subTopicName,
        value: s.subTopicId
      }));
  }

  // ====================================================
  // BATCH → STUDENTS
  // ====================================================

  private onBatchChange(batchId: any): void {

    this.studentOptions = [];
    this.knowledgeForm.patchValue({ studentIds: [] }, { emitEvent: false });

    if (!batchId) return;
    
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'student',
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

  // ====================================================
  // DROPDOWN LOADERS
  // ====================================================

  private getBatchList(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'batch',
        'list?list=full'
      ).subscribe((res: any) => {
        if (res?.status) {
          this.allBatches = res.data
          this.batch_options = res.data.map((b: any) => ({
            label: b.batchName,
            value: b.batchCode
          }));
        }
        resolve();
      });
    });
  }

  private loadSubjects(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'ims/subject',
        'list?list=full'
      ).subscribe((res: any) => {
        this.subjects = (res?.data || []).map((s: any) => ({
          label: s.subjectName,
          value: s._id
        }));
        resolve();
      });
    });
  }

  private loadAllTopics(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'ims/topic',
        'list?list=full'
      ).subscribe((res: any) => {
        this.allTopics = res?.data || [];
        resolve();
      });
    });
  }

  private loadAllSubTopics(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'ims/subtopic',
        'list?list=full'
      ).subscribe((res: any) => {
        this.allSubTopics = res?.data || [];
        resolve();
      });
    });
  }

  // ====================================================
  // FILE UPLOAD
  // ====================================================

  onFilesSelected(files: File[]): void {

    if (!files?.length) return;

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('tenantId', this.tenantId);

    this.commonApi.uploadImage(formData, 'teacher/library', 'upload')
      .subscribe((res: any) => {
        if (res?.status) {
          this.uploadedFiles = [{ url: res.data.attachmentUrl }];
          this.knowledgeForm.patchValue({ attachmentUrl: this.uploadedFiles });
        }
      });
  }

  // ====================================================
  // PATCH EDIT DATA
  // ====================================================
  private formatDate(value: any): string {

    if (!value) return '';

    const date = new Date(Number(value));

    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);

    return `${year}-${month}-${day}`;
  }

  private async patchEditData(d: any): Promise<void> {

    this.uploadedFiles = d.attachmentUrl || [];

    console.log("Availbe ",d.availableUntil);
        console.log("Availbe ",d.availableFrom);

    
    // Step 1 — patch all fields except topic/subtopic, suppress events
    this.knowledgeForm.patchValue({
      title: d.title,
      description: d.description,
      classNo: d.classNo,
      subjectId: d.subjectId,
      availableUntil: this.formatDate(d.availableUntil),
      batchId: d.batchIds?.[0] || '',
      availableFrom: this.formatDate(d.availableFrom),
      attachmentUrl: d.attachmentUrl || []
    }, { emitEvent: false });

    // Step 2 — manually filter topics (classNo + subjectId now set)
    this.onSubjectChange(d.subjectId);

    // Step 3 — patch topic after topics array is populated
    this.knowledgeForm.patchValue({ topicId: d.topicId }, { emitEvent: false });

    // Step 4 — manually filter subtopics
    this.onTopicChange(d.topicId);

    // Step 5 — patch subtopic
    this.knowledgeForm.patchValue({ subTopicId: d.subTopicId }, { emitEvent: false });

    // Step 6 — load students for the selected batch, then patch studentIds
    await this.loadStudentsForEdit(d.batchIds?.[0], d.studentIds);
  }

  private loadStudentsForEdit(batchId: string, selectedStudentIds: string[]): Promise<void> {

    return new Promise<void>(resolve => {

      if (!batchId) {
        resolve();
        return;
      }

      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'student',
        `list?list=full&batchCode=${batchId}`
      ).subscribe((res: any) => {

        if (res?.status) {
          this.studentOptions = res.data.map((s: any) => ({
            label: `${s.student.name} (${s.admissionNo})`,
            value: s.studentId
          }));

          console.log("Stduent ",selectedStudentIds);
          
          this.knowledgeForm.patchValue({
            studentIds: selectedStudentIds || []
          }, { emitEvent: false });
        }

        resolve();
      });
    });
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  addKnowledge(): void {

    if (this.knowledgeForm.invalid) {
      this.knowledgeForm.markAllAsTouched();
      return;
    }

    const f = this.knowledgeForm.value;

    const payload: any = {
      tenantId: this.tenantId,
      title: f.title,
      description: f.description,
      classNo: f.classNo,
      subjectId: f.subjectId,
      topicId: f.topicId,
      batchIds: f.batchId ? [f.batchId] : [],
      studentIds: (f.studentIds || []).map((s: any) =>
        typeof s === 'string' ? s : s.value
      ),
      availableFrom: new Date(f.availableFrom).getTime(),
      availableUntil: new Date(f.availableUntil).getTime(),
      attachmentUrl: f.attachmentUrl,
      status: 'Active'
    };

    if (this.isEditMode) {
      payload.materialId = this.materialId;
    }

    const endpoint = this.isEditMode ? 'edit' : 'create';

    this.commonApi.fetchData(payload, 'teacher/library', endpoint)
      .subscribe((res: any) => {
        if (res?.status) {
          this.router.navigate(['/app/knowledge']);
        }
      });
  }
}