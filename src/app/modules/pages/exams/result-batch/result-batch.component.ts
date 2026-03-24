import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-result-batch',
  standalone: false,
  templateUrl: './result-batch.component.html',
  styleUrl: './result-batch.component.scss'
})
export class ResultBatchComponent implements OnInit {

  loading = false;
  totalRecords = 0;
  examData: any = {};
  examId = '';

  columnsArray = [
    { key: 'batchId', label: 'Batch Code', sortable: false },
    { key: 'statusDisplay', label: 'Status', sortable: false },
    { key: 'studentCount', label: 'Students', sortable: false },
    { key: 'assignedCount', label: 'Assigned', sortable: false },
    { key: 'startedCount', label: 'Started', sortable: false },
    { key: 'completedCount', label: 'Completed', sortable: false }
  ];

  dataArray: any[] = [];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View Results',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewResult(row)
    }
  ];

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrumb: BredcrumpService
  ) {
    const state: any = history.state;
    if (state?.exam) {
      this.examData = state.exam;
      this.examId = state.exam.examId;
    }
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Result - Batches' }
    ]);

    if (!this.examId) {
      this.alert.error('Exam data not found');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.fetchBatches();
  }

  fetchBatches() {
    this.loading = true;
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      examId: this.examId
    };

    this.commonApi.fetchData(payload, 'exam/batch', 'list-by-exam').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.dataArray = (res.data || []).map((item: any) => ({
            ...item,
            statusDisplay: item.status === 'enabled' ? 'Enabled' : 'Disabled'
          }));
          this.totalRecords = res.count || 0;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alert.error('Error loading batches');
      }
    });
  }

  viewResult(row: any) {
    this.router.navigate(['/app/exams/exams/result-view'], {
      state: { batch: row, exam: this.examData }
    });
  }

}
