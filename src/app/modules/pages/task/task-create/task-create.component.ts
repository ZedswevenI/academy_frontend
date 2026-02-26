import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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

  tenantId: string | null = localStorage.getItem('tenantId');
  userId: string | null = localStorage.getItem('userid');

  isEditMode: boolean = false;
  taskId: string = '';

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private commonApi: CommonapiService,
    private alert: AlertService
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
      this.breadcrump.set([
        { label: 'Task', link: '/app/task' },
        { label: this.isEditMode ? 'Edit' : 'Create' }
      ]);
      this.isEditMode = true;
      this.bindEditData(stateData.taskData);
    } else {
      this.breadcrump.set([
        { label: 'Task', link: '/app/task' },
        { label: 'Create' }
      ]);
    }


  }

  ngOnInit(): void {


    this.getStaffList();




    // Check Edit Mode
    // this.route.queryParams.subscribe(params => {
    //   if (params['taskId']) {
    //     this.isEditMode = true;
    //     this.taskId = params['taskId'];
    //     this.loadTaskDetails(this.taskId);
    //   }
    // });
  }

  // ==============================
  // GET STAFF LIST
  // ==============================

  bindEditData(data: any) {

    this.taskId = data.taskId;

    this.taskForm.patchValue({
      taskName: data.taskName,
      staffId: data.staffId,
      dueDate: new Date(data.dueDate).toISOString().split('T')[0],
      description: data.description
    });

    this.uploadedAttachments = data.attachmentUrl || [];
    this.taskForm.patchValue({
      file: this.uploadedAttachments
    });
  }

  getStaffList() {
    this.commonApi.fetchData(
      { tenantId: this.tenantId },
      'ims/user',
      'list?list=full'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.faculty_options = res.data
            .filter((u: any) => u.staffId) // Only staff users
            .map((u: any) => ({
              label: `${u.name} (${u.roleLabel})`,
              value: u.staffId
            }));
        }
      },
      error: () => {
        this.alert.error('Error loading staff list');
      }
    });
  }

  // ==============================
  // FILE UPLOAD
  // ==============================

  onFilesSelected(files: File[]) {

    if (!files || !files.length) return;

    files.forEach(file => {

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', this.tenantId!);

      // this.commonApi.fileUpload(
      //   formData,
      //   'teacher/task',
      //   'upload'
      // ).subscribe({
      //   next: (res: any) => {
      //     if (res.status) {
      //       this.uploadedAttachments.push({
      //         url: res.data.attachmentUrl
      //       });
      //       this.alert.success('File uploaded successfully');
      //     }
      //   },
      //   error: () => {
      //     this.alert.error('File upload failed');
      //   }
      // });

    });
  }

  // ==============================
  // CREATE TASK
  // ==============================

  addTask() {

    if (this.taskForm.invalid) {
      this.alert.error('Please fill all required fields');
      return;
    }

    const formValue = this.taskForm.value;

    const payload = {
      tenantId: this.tenantId,
      taskName: formValue.taskName,
      description: formValue.description,
      staffId: formValue.staffId,
      dueDate: new Date(formValue.dueDate).getTime(),
      attachment: this.uploadedAttachments
    };

    this.commonApi.fetchData(
      payload,
      'teacher/task',
      'create'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Task created successfully');
          this.router.navigate(['/app/task']);
        }
      },
      error: () => {
        this.alert.error('Failed to create task');
      }
    });
  }

  // ==============================
  // UPDATE TASK
  // ==============================

  updateTask() {

    if (this.taskForm.invalid) {
      this.alert.error('Please fill all required fields');
      return;
    }

    const formValue = this.taskForm.value;

    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskId,
      userId: this.userId,
      dueDate: new Date(formValue.dueDate).getTime(),
      description: formValue.description,
      attachmentUrl: this.uploadedAttachments
    };

    this.commonApi.fetchData(
      payload,
      'teacher/task',
      'edit'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Task updated successfully');
          this.router.navigate(['/app/task']);
        }
      },
      error: () => {
        this.alert.error('Failed to update task');
      }
    });
  }

  // ==============================
  // LOAD TASK DETAILS (EDIT MODE)
  // ==============================

  loadTaskDetails(taskId: string) {

    this.commonApi.fetchData(
      { tenantId: this.tenantId, taskId: taskId },
      'teacher/task',
      'view'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {

          const data = res.data;

          this.taskForm.patchValue({
            taskName: data.taskName,
            staffId: data.staffId,
            dueDate: new Date(data.dueDate),
            description: data.description
          });

          this.uploadedAttachments = data.attachmentUrl || [];
        }
      },
      error: () => {
        this.alert.error('Failed to load task details');
      }
    });
  }

  // ==============================
  // SUBMIT BUTTON HANDLER
  // ==============================

  submitTask() {
    if (this.isEditMode) {
      this.updateTask();
    } else {
      this.addTask();
    }
  }

}