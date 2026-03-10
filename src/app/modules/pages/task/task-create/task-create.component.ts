import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-task-create',
  standalone: false,
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.scss'
})
export class TaskCreateComponent implements OnInit {

  taskForm!: FormGroup;

  faculty_options: any[] = [];
  uploadedAttachments: any[] = [];
  isUploading = false;

  tenantId: string | null = localStorage.getItem('tenantId');
  userId: string | null = localStorage.getItem('userid');

  isEditMode = false;
  taskId = '';
  editData: any = null;

  minDateTime = this.getTodayDateTimeLocal();


  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    this.taskForm = this.fb.group({
      taskName: ['', Validators.required],
      staffId: ['', Validators.required],
      dueDate: ['', Validators.required],
      file: [null],
      description: ['']
    });

    const navigation = this.router.getCurrentNavigation();
    const stateData = navigation?.extras?.state as any;

    if (stateData?.taskData) {
      this.isEditMode = true;
      this.editData = stateData.taskData;
      this.breadcrump.set([{ label: 'Task', link: '/app/task' }, { label: 'Edit' }]);
    } else {
      this.breadcrump.set([{ label: 'Task', link: '/app/task' }, { label: 'Create' }]);
    }
  }
  private getTodayDateTimeLocal(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  ngOnInit(): void {
    this.getStaffList().then(() => {
      if (this.isEditMode && this.editData) {
        this.bindEditData(this.editData);
      }
    });
  }

  // ── Bind edit data ─────────────────────────────────────────────────────────

  bindEditData(data: any): void {
    this.taskId = data.taskId;

    // staffId may arrive as plain string or nested object { staffId, name, ... }
    const staffId = typeof data.staffId === 'object'
      ? (data.staffId?.staffId || data.staffId?._id || '')
      : data.staffId;

    // Verify this staffId actually exists in the loaded options — log if not
    const matched = this.faculty_options.find(o => o.value === staffId);
    if (!matched) {
      console.warn('⚠️ staffId not found in faculty_options:', staffId,
        '\nAvailable values:', this.faculty_options.map(o => o.value));
    }

    // attachmentUrl may be [{ url }] or [string] — normalise to [{ url }]
    const rawAttachments = data.attachmentUrl || data.attachment || [];
    this.uploadedAttachments = rawAttachments.map((a: any) =>
      typeof a === 'string' ? { url: a } : a
    );

    // Patch all non-dependent fields
    this.taskForm.patchValue({
      taskName: data.taskName,
      dueDate: new Date(data.dueDate).toISOString().split('T')[0],
      description: data.description,
      file: this.uploadedAttachments
    });

    // Patch staffId separately after detectChanges so selectbox
    // re-evaluates its options with the new value
    this.cdr.detectChanges();
    this.taskForm.patchValue({ staffId });
    this.cdr.detectChanges();
  }

  // ── Staff list ─────────────────────────────────────────────────────────────

  getStaffList(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { tenantId: this.tenantId }, 'ims/user', 'list?list=full'
      ).subscribe({
        next: (res: any) => {
          if (res.status) {
            this.faculty_options = res.data
              .filter((u: any) => u.staffId)
              .map((u: any) => ({
                label: `${u.name} (${u.roleLabel})`,
                value: u.staffId
              }));
          }
          resolve();
        },
        error: () => {
          this.alert.error('Error loading staff list');
          resolve();
        }
      });
    });
  }

  // ── File upload ────────────────────────────────────────────────────────────

  onFilesSelected(files: File[]): void {
    if (!files?.length) return;

    this.isUploading = true;

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('tenantId', this.tenantId!);

    this.commonApi.uploadImage(formData, 'teacher/task', 'upload').subscribe({
      next: (res: any) => {
        this.isUploading = false;
        if (res?.status) {
          // API may return attachmentUrl or url — handle both
          const url = res.data?.attachmentUrl || res.data?.url || '';
          this.uploadedAttachments = [{ url }];
          this.taskForm.patchValue({ file: this.uploadedAttachments });
          this.alert.success('File uploaded successfully');
        } else {
          this.alert.error('Upload failed');
        }
      },
      error: () => {
        this.isUploading = false;
        this.alert.error('File upload failed');
      }
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  submitTask(): void {
    if (this.taskForm.invalid) {
      this.alert.error('Please fill all required fields');
      this.taskForm.markAllAsTouched();
      return;
    }
    this.isEditMode ? this.updateTask() : this.addTask();
  }

  private addTask(): void {
    const f = this.taskForm.value;
    const payload = {
      tenantId: this.tenantId,
      taskName: f.taskName,
      description: f.description,
      staffId: f.staffId,
      dueDate: new Date(f.dueDate).getTime(),
      attachment: this.uploadedAttachments
    };

    this.commonApi.fetchData(payload, 'teacher/task', 'create').subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Task created successfully');
          this.router.navigate(['/app/task']);
        }
      },
      error: () => this.alert.error('Failed to create task')
    });
  }

  private updateTask(): void {
    const f = this.taskForm.value;
    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskId,
      userId: this.userId,
      dueDate: new Date(f.dueDate).getTime(),
      description: f.description,
      attachmentUrl: this.uploadedAttachments   // edit endpoint uses "attachmentUrl"
    };

    this.commonApi.fetchData(payload, 'teacher/task', 'edit').subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Task updated successfully');
          this.router.navigate(['/app/task']);
        }
      },
      error: () => this.alert.error('Failed to update task')
    });
  }
}