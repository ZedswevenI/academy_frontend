import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-result-view',
  standalone: false,
  templateUrl: './result-view.component.html',
  styleUrl: './result-view.component.scss'
})
export class ResultViewComponent implements OnInit {

  loading = false;
  batchData: any = {};
  examData: any = {};

  constructor(
    public router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrumb: BredcrumpService
  ) {
    const state: any = history.state;
    if (state?.batch) {
      this.batchData = state.batch;
    }
    if (state?.exam) {
      this.examData = state.exam;
    }
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Result - Batches', link: '/app/exams/exams/result-batch' },
      { label: 'Results' }
    ]);

    if (!this.batchData?.batchId) {
      this.alert.error('Batch data not found');
      this.router.navigate(['/app/exams/exams']);
      return;
    }
  }
}