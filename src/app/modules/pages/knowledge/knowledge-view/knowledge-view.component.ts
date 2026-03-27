import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-knowledge-view',
  standalone: false,
  templateUrl: './knowledge-view.component.html',
  styleUrls: ['./knowledge-view.component.scss']
})
export class KnowledgeViewComponent implements OnInit {

  material: any = null;

  // Add batch
  showAddBatch = false;
  availableBatches: any[] = [];
  newBatchCode = '';
  addBatchLoading = false;

  // Students
  students: any[] = [];
  selectedStudentIds: string[] = [];
  selectAllStudents = false;
  studentsLoading = false;

  // Batch student view
  selectedBatchCode = '';
  batchStudents: any[] = [];
  batchStudentsLoading = false;

  constructor(
    private commonApi: CommonapiService,
    private breadcrumb: BredcrumpService,
    private router: Router,
    private alert: AlertService
  ) {
    this.breadcrumb.set([
      { label: 'Library', link: '/app/knowledge' },
      { label: 'View' }
    ]);
    const nav = this.router.getCurrentNavigation();
    const stateMaterial = nav?.extras?.state?.['material'];

    if (stateMaterial) {
      this.material = stateMaterial;
    } else {
      this.router.navigate(['/app/knowledge']);
    }
  }

  ngOnInit(): void {
    this.loadBatches();
  }

  private loadBatches(): void {
    const tenantId = localStorage.getItem('tenantId');
    this.commonApi.fetchData({ entiId: tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.availableBatches = res?.data || [];
        }
      });
  }

  isBatchAssigned(code: string): boolean {
    return (this.material?.batchIds || []).includes(code);
  }

  onNewBatchChange(batchCode: string): void {
    this.students = [];
    this.selectedStudentIds = [];
    this.selectAllStudents = false;
    if (!batchCode) return;

    this.studentsLoading = true;
    const tenantId = localStorage.getItem('tenantId');
    this.commonApi.fetchData({ entiId: tenantId }, 'student',
      `list?list=full&batchCode=${batchCode}`
    ).subscribe({
      next: (res: any) => {
        this.studentsLoading = false;
        this.students = (res?.data || []).map((s: any) => ({
          label: `${s.student?.name} (${s.admissionNo})`,
          value: s.studentId
        }));
      },
      error: () => {
        this.studentsLoading = false;
      }
    });
  }

  isStudentSelected(value: string): boolean {
    return this.selectedStudentIds.includes(value);
  }

  toggleStudent(value: string, checked: boolean): void {
    if (checked) {
      this.selectedStudentIds = [...this.selectedStudentIds, value];
    } else {
      this.selectedStudentIds = this.selectedStudentIds.filter(id => id !== value);
      this.selectAllStudents = false;
    }
    this.selectAllStudents = this.selectedStudentIds.length === this.students.length;
  }

  toggleAllStudents(checked: boolean): void {
    this.selectAllStudents = checked;
    this.selectedStudentIds = checked ? this.students.map(s => s.value) : [];
  }

  addBatch(): void {
    if (!this.newBatchCode || !this.material) return;

    const tenantId = localStorage.getItem('tenantId');
    const updatedBatchIds = [...(this.material.batchIds || []), this.newBatchCode];
    const updatedStudentIds = [
      ...(this.material.studentIds || []),
      ...this.selectedStudentIds
    ];

    const payload: any = {
      tenantId,
      materialId: this.material.materialId,
      batchIds: updatedBatchIds,
      studentIds: updatedStudentIds
    };

    this.addBatchLoading = true;
    this.commonApi.fetchData(payload, 'institue/library', 'edit')
      .subscribe({
        next: (res: any) => {
          this.addBatchLoading = false;
          if (res?.status) {
            this.material.batchIds = updatedBatchIds;
            this.material.studentIds = updatedStudentIds;
            this.alert.success('Batch added successfully');
            this.newBatchCode = '';
            this.students = [];
            this.selectedStudentIds = [];
            this.selectAllStudents = false;
            this.showAddBatch = false;
          }
        },
        error: () => {
          this.addBatchLoading = false;
          this.alert.error('Error adding batch');
        }
      });
  }

  onBatchClick(batchCode: string): void {
    if (this.selectedBatchCode === batchCode) {
      this.selectedBatchCode = '';
      this.batchStudents = [];
      return;
    }
    this.selectedBatchCode = batchCode;
    this.batchStudents = [];
    this.batchStudentsLoading = true;
    const tenantId = localStorage.getItem('tenantId');
    this.commonApi.fetchData({ entiId: tenantId }, 'student',
      `list?list=full&batchCode=${batchCode}`
    ).subscribe({
      next: (res: any) => {
        this.batchStudentsLoading = false;
        this.batchStudents = (res?.data || []).map((s: any) => ({
          studentId: s.studentId,
          name: s.student?.name || s.studentName || '',
          admissionNo: s.admissionNo || ''
        }));
      },
      error: () => {
        this.batchStudentsLoading = false;
      }
    });
  }

  isAssignedStudent(studentId: string): boolean {
    return (this.material?.studentIds || []).includes(studentId);
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) return '';
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  getAttachmentUrl(): string {
    return this.material?.attachmentUrl?.[0]?.url || '';
  }

  downloadFile(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (res: any) => {
        const fileName = url.split('/').pop() || 'download';
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(res);
        a.href = objectUrl;
        a.download = fileName;
        a.click();
      },
    });
  }
}
