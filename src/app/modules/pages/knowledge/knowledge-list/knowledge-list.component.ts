import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-knowledge-list',
  standalone: false,
  templateUrl: './knowledge-list.component.html',
  styleUrl: './knowledge-list.component.scss'
})
export class KnowledgeListComponent implements OnInit {

  filterForm!: FormGroup;
  tenantId: any;
  deleteModalVisible = false;
  deleteTarget: any = null;
  deleteMessage = '';

  columnsArray = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'classNo', label: 'Class', sortable: false },
    { key: 'subjectName', label: 'Subject', sortable: false },
    { key: 'batchName', label: 'Batch', sortable: false },
    { key: 'availableUntilDate', label: 'Available Until', sortable: true }
  ];

  dataArray: any[] = [];
  totalRecords = 0;
  loading = false;

  class_options = Array.from({ length: 8 }, (_, i) => ({
    label: (i + 6).toString(),
    value: i + 6
  }));

  subjects: any[] = [];
  batch_options: any[] = [];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      callback: (row: any) => this.view(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      callback: (row: any) => this.edit(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#dc3545',
      hoverColor: '#a71d2a',
      callback: (row: any) => this.openDelete(row)
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private fb: FormBuilder
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrumb.set([{ label: 'Knowledge Base' }]);
  }

  ngOnInit(): void {

    this.filterForm = this.fb.group({
      classNo: ['', Validators.required],
      subjectId: ['', Validators.required],
      batchId: ['', Validators.required]
    });

    this.loadSubjects();
    this.loadBatches();
  }

  // =========================
  // Load Subjects
  // =========================

  private loadSubjects() {
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'ims/subject',
      'list?list=full'
    ).subscribe((res: any) => {
      this.subjects = (res?.data || []).map((s: any) => ({
        label: s.subjectName,
        value: s.subjectId
      }));
    });
  }

  // =========================
  // Load Batches
  // =========================

  private loadBatches() {
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'batch',
      'list?list=full'
    ).subscribe((res: any) => {
      this.batch_options = (res?.data || []).map((b: any) => ({
        label: b.batchName,
        value: b.batchCode
      }));
    });
  }

  // =========================
  // Fetch Knowledge List
  // =========================

  fetchTableData(req: {
    page: number;
    pageSize: number;
  }) {

    if (this.filterForm.invalid) return;

    const f = this.filterForm.value;

    this.loading = true;

    const endpoint =
      `list?page=${req.page}&limit=${req.pageSize}` +
      `&classNo=${f.classNo}` +
      // `&subjectId=${f.subjectId}` +
      `&batchId=${f.batchId}`;

    this.commonApi.fetchData(
      { tenantId: this.tenantId },
      'teacher/library',
      endpoint
    ).subscribe((res: any) => {

      this.loading = false;

      if (res?.status) {

        this.totalRecords = res.total || 0;

        this.dataArray = (res.data || []).map((d: any) => ({
          ...d,
          subjectName: d.subjectId?.subjectName || '',
          batchName: d.batchIds[0] || '-',
          availableUntilDate: new Date(d.availableUntil).toLocaleDateString()
        }));
      }
    });
  }

  openDelete(row: any) {
    this.deleteTarget = row;
    this.deleteMessage = `Are you sure you want to delete "${row.title}"?`;
    this.deleteModalVisible = true;
  }

  onDeleteModalClosed(confirmed: boolean) {

    this.deleteModalVisible = false;

    if (!confirmed || !this.deleteTarget) return;

    const payload = {
      tenantId: this.tenantId,
      materialId: this.deleteTarget.materialId
    };

    this.commonApi.fetchData(
      payload,
      'teacher/library',
      'delete'
    ).subscribe((res: any) => {

      if (res?.status) {
        this.deleteTarget = null;

        // reload list
        this.fetchTableData({
          page: 1,
          pageSize: 10
        });
      }
    });
  }

  // =========================
  // Actions
  // =========================

  view(row: any) {
    this.router.navigate(['/app/knowledge/view'], {
      state: { material: row }
    });
  }

  edit(row: any) {
    this.router.navigate(['/app/knowledge/create'], {
      state: { material: row }
    });
  }

}