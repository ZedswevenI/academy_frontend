import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  styleUrl: './table-list.component.scss',
})
export class TableListComponent {
  // In table-list / grid-list:
  @Input() hasSearched = false;
  @Input() filters: any = {};

  ngOnChanges(changes: SimpleChanges) {
    if (this.hasSearched) {
      this.fetchTableData({
        page: 1,
        pageSize: 20,
        search: this.filters?.search || '',
      });
    }
  }
  isChat: boolean = false;
  columnsArray = [
    { key: 'student.name', label: 'Student Name', sortable: false },
    { key: 'admissionNo', label: 'Admission No.', sortable: false },
    { key: 'programName', label: 'Program', sortable: false },
    { key: 'centerName', label: 'Center', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'student.phone', label: 'Mobile', sortable: false },
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
      callback: (row: any) => this.viewStudent(row),
    },
    // {
    //   type: 'icon',
    //   icon: 'fa-solid fa-comments',
    //   tooltip: 'Chat',
    //   color: '#6B7280',
    //   hoverColor: '#0066FF',
    //   callback: (row: any) => this.chatStudent(row),
    // },
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    this.breadcrump.set([{ label: 'Student' }]);
  }

  ngOnInit(): void { }

  fetchTableData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.loading = true;

    const query: any = {
      page: params.page,
      limit: params.pageSize,
    };

    // Apply search from params or filters
    const search = params.search || this.filters?.search || '';
    if (search) query.search = search;

    // Apply filters from parent
    if (this.filters?.programId) query.programId = this.filters.programId;
    if (this.filters?.centerId) query.centerId = this.filters.centerId;
    if (this.filters?.status && this.filters.status !== 'ALL')
      query.status = this.filters.status;

    if (params.sortKey) {
      query.sort =
        params.sortDirection === 'desc' ? `-${params.sortKey}` : params.sortKey;
    }

    const queryString = Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');

    const body = { entiId: localStorage.getItem('tenantId') };

    this.commonApi.fetchData(body, 'student', `list?${queryString}`).subscribe({
      next: (res: any) => {
        this.dataArray = res.data || [];
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alert.error('Error loading students');
      },
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
    online: true,
  };

  messages: Message[] = [
    {
      text: 'Hello Sir 👋',
      sender: 'student',
      time: '10:00 AM',
    },
    {
      text: 'Hello! How can I help you?',
      sender: 'teacher',
      time: '10:01 AM',
    },
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
        minute: '2-digit',
      }),
    });

    this.newMessage = '';
  }
}
