import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-tests',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit {

  loading = false;
  totalRecords = 0;

  private routerSub!: Subscription;

  lastTableParams: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  } | null = null;

  /* ================= TABLE COLUMNS ================= */
  columnsArray = [
    { key: 'testNumber', label: 'Test No', sortable: true },
    // { key: 'testCode', label: 'Test Code', sortable: true },
    // { key: 'testId', label: 'Test ID', sortable: true },
    { key: 'classNo', label: 'Class', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'numberOfQuestions', label: 'No of questions', sortable: false },

  ];

  /* ================= STATIC DATA ================= */
  dataArray = [];

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'dropdown',
      text: 'Actions',
      icon: 'fa-solid fa-ellipsis-vertical',
      color: 'secondary',
      callback: (row: any) => { }, // optional main click
      dropdown: [
        {
          text: 'Edit Test',
          icon: 'fa-regular fa-pen-to-square',
          callback: (row: any) => this.editTest(row)
        },
        {
          text: 'View Questions',
          icon: 'fa-regular fa-eye',
          callback: (row: any) => this.viewQuestions(row)
        },
        {
          text: 'Add Question',
          icon: 'fa-solid fa-file-import',
          callback: (row: any) => this.addQuestions(row)
        },
        {
          text: 'Import Questions',
          icon: 'fa-solid fa-file-import',
          callback: (row: any) => this.importQuestions(row)
        },
        {
          text: 'Print Test',
          icon: 'fa-solid fa-print',
          callback: (row: any) => this.printTest(row)
        },
        {
          text: 'Student Feedbacks',
          icon: 'fa-solid fa-comments',
          callback: (row: any) => this.studentFeedbacks(row)
        },
        {
          text: 'Report',
          icon: 'fa-solid fa-chart-line',
          callback: (row: any) => this.report(row)
        },
        {
          text: 'Update Ans/Solutions',
          icon: 'fa-solid fa-pen',
          callback: (row: any) => this.updateAnswers(row)
        },
        {
          text: 'Delete',
          icon: 'fa-regular fa-trash-can',
          callback: (row: any) => this.deleteTest(row)
        }
      ]
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService

  ) { }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Tests' }
    ]);
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.forceCloseDropdowns();
      }
    });
    this.totalRecords = this.dataArray.length;
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private forceCloseDropdowns(): void {
    // 1. Remove "show" class
    document
      .querySelectorAll('.dropdown-menu.show')
      .forEach(menu => {
        menu.classList.remove('show');
      });

    // 2. Remove orphan dropdowns moved to body (if any)
    document
      .querySelectorAll('body > .dropdown-menu')
      .forEach(menu => {
        menu.remove();
      });

    // 3. Reset aria-expanded
    document
      .querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(toggle => {
        toggle.setAttribute('aria-expanded', 'false');
      });
  }

  /* ================= ACTION HANDLERS ================= */
  viewTest(row: any) {
    console.log('View test', row);
    // this.router.navigate(['/tests/view', row.id]);
  }

  deleteTest(row: any) {
    if (!confirm('Are you sure you want to delete this test?')) {
      return;
    }

    const body = {
      entiId: localStorage.getItem('tenantId'),
      testId: row.testId,
    };

    this.commonApi
      .fetchData(body, 'assignment', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {

            this.alert.success('Deleted successfully');

            // 🔥 Reload table with previous params
            if (this.lastTableParams) {
              this.fetchTableData(this.lastTableParams);
            }
          }
        },
        error: () => {
          this.alert.error('Error deleting question');
        }
      });
  }

  viewQuestions(row: any) {
    console.log('View questions', row);
    this.router.navigate(['/app/tests/question-view'], {
      state: {
        questions: row,
      }
    })
  }

  editTest(row: any) {
     console.log('View questions', row);
    this.router.navigate(['/app/tests/create'], {
      state: {
        test: row,
      }
    })
  }

  importQuestions(row: any) {
    console.log("Rome came ", row);

    this.router.navigate(['/app/tests/question-import'], {
      state: {
        questions: row,
      }
    })
  }

  addQuestions(row: any) {
    this.router.navigate(['/app/tests/question-create'], {
      state: {
        question: row,
      }
    })
  }



  printTest(row: any) {
    console.log('Print test', row);
  }

  studentFeedbacks(row: any) {
    console.log('Student feedbacks', row);
  }

  report(row: any) {
    console.log('Report', row);
  }

  updateAnswers(row: any) {
    console.log('Update answers/solutions', row);
  }

  fetchTableData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.lastTableParams = { ...params };

    this.loading = true;

    let sortParam = '';
    if (params.sortKey) {
      sortParam =
        params.sortDirection === 'desc'
          ? `-${params.sortKey}`
          : params.sortKey;
    }

    const query: any = {
      page: params.page,
      limit: params.pageSize
    };

    if (sortParam) query.sort = sortParam;
    if (params.search) query.search = params.search;

    const queryString = Object.keys(query)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    // 🔥 CHANGE MODULE NAME HERE
    this.commonApi
      .fetchData(body, 'assignment', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              testNumber: item.testNo,
              testCode: item.testCode,
              classNo: item.classNo,
              subject: item.subjectId?.subjectName,
              numberOfQuestions: item.numberOfQuestions,
              status: item.status,
              createdAt: item.createdAt,
              id: item._id
            })); this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.alert.error('Error loading assignments');
        }
      });
  }
}