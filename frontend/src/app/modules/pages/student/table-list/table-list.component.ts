import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

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
    { key: 'studentName', label: 'Student Name', sortable: true },
    { key: 'admission', label: 'Admission No.', sortable: true },
    { key: 'program', label: 'Program', sortable: true },
    { key: 'address', label: 'Center', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'mobile', label: 'Mobile', sortable: true },
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

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

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Student' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { studentName: 'Arun Kumar', admission: 'ADM001', program: 'ICON - Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543210' },
      { studentName: 'Priya Sharma', admission: 'ADM002', program: 'NEET Crash Course', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543211' },
      { studentName: 'Rahul Singh', admission: 'ADM003', program: 'JEE Foundation', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543212' },
      { studentName: 'Anjali Verma', admission: 'ADM004', program: 'ICON - One Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543213' },
      { studentName: 'Vikram Patil', admission: 'ADM005', program: 'NEET Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543214' },
      { studentName: 'Sneha Gupta', admission: 'ADM006', program: 'JEE Crash Course', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543215' },
      { studentName: 'Karan Mehta', admission: 'ADM007', program: 'ICON - Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543216' },
      { studentName: 'Radhika Joshi', admission: 'ADM008', program: 'NEET Foundation', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543217' },
      { studentName: 'Saurabh Kumar', admission: 'ADM009', program: 'JEE Advanced Program', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543218' },
      { studentName: 'Pooja Reddy', admission: 'ADM010', program: 'ICON - One Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543219' },
      { studentName: 'Amit Jain', admission: 'ADM011', program: 'NEET Crash Course', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543220' },
      { studentName: 'Neha Kapoor', admission: 'ADM012', program: 'JEE Two Year Program', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543221' },
      { studentName: 'Manish Sharma', admission: 'ADM013', program: 'ICON - Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543222' },
      { studentName: 'Shivani Singh', admission: 'ADM014', program: 'NEET One Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543223' },
      { studentName: 'Rohit Verma', admission: 'ADM015', program: 'JEE Crash Course', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543224' },
      { studentName: 'Alok Patel', admission: 'ADM016', program: 'ICON - Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543225' },
      { studentName: 'Isha Agarwal', admission: 'ADM017', program: 'NEET Two Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543226' },
      { studentName: 'Nikhil Reddy', admission: 'ADM018', program: 'JEE Foundation', address: 'Coimbatore - Sub Main', status: 'Inactive', mobile: '9876543227' },
      { studentName: 'Tanya Kapoor', admission: 'ADM019', program: 'ICON - One Year Program', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543228' },
      { studentName: 'Aditya Singh', admission: 'ADM020', program: 'NEET Crash Course', address: 'Coimbatore - Sub Main', status: 'Active', mobile: '9876543229' }
    ];

    this.loadTableData({ page: 1, pageSize: 5 });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.originalData];

    // SEARCH
    if (req.search) {
      const value = req.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(value)
        )
      );
    }

    // SORT
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!];
        const y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    // PAGINATION
    this.totalRecords = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray = filtered.slice(start, end);
  }

  viewStudent(row: any) {
    this.router.navigate(['/app/student/view'])
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
