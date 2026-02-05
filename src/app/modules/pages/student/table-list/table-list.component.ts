import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

interface Message {
  text: string;
  sender: 'teacher' | 'student';
  time: string;
}

interface Chat {
  name: string;
  online?: boolean;
}

@Component({
  selector: 'app-table-list',
  standalone: false,
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.scss'
})
export class TableListComponent {
  isChat: boolean = false;
  columnsArray = [
    { key: 'student.name', label: 'Student Name', sortable: true },
    { key: 'admissionNo', label: 'Admission No.', sortable: true },
    { key: 'programName', label: 'Program', sortable: true },
    { key: 'centerName', label: 'Center', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'student.phone', label: 'Mobile', sortable: true },
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;
  loading = false;


  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewStudent(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-comments',
      tooltip: 'Chat',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.chatStudent(row)
    },
  ]

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Student' }])
  }

  ngOnInit(): void {}

  fetchTableData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.loading = true;

    // Pagination & Sort
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

    //filter (optional)
    // if (this.statusFilter && this.statusFilter !== 'all') {
    //   query.status = this.statusFilter;
    // }
    // if (this.selectedProgram) {
    //   query.programId = this.selectedProgram;
    // }
    // if (this.selectedCenter) {
    //   query.centerId = this.selectedCenter;
    // }

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'student', `list?${queryString}`).subscribe({
      next: (res: any) => {
        this.dataArray = res.data;
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.alert.error('Error loading admissions');
      }
    });
  }


  viewStudent(row: any) {
    // this.router.navigate(['/app/student/view'])
    const s = row?._raw || row;
    this.router.navigate(['/app/student/view', s.studentId]);
  }

  chatStudent(row: any) {
    this.isChat = true;
  }

  selectedChat: Chat | null = {
    name: 'Student Chat',
    online: true
  };

  messages: Message[] = [
    {
      text: 'Hello Sir 👋',
      sender: 'student',
      time: '10:00 AM'
    },
    {
      text: 'Hello! How can I help you?',
      sender: 'teacher',
      time: '10:01 AM'
    }
  ];

  // New message
  newMessage = '';
  closeChat() {
    this.isChat = false;
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.messages.push({
      text: this.newMessage,
      sender: 'teacher',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    });

    this.newMessage = '';
  }

}
