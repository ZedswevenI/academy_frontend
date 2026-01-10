import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

// Define ChatItem interface
interface ChatItem {
  id: number;
  name: string;
  type: 'group' | 'direct';
  lastMessage: string;
  time?: string;
  readOnly?: boolean;
  online?: boolean;
}

// Define Message interface
interface Message {
  text: string;
  sender: 'teacher' | 'student';
  time: string;
}

@Component({
  selector: 'app-communication',
  standalone: false,
  templateUrl: './communication.component.html',
  styleUrl: './communication.component.scss'
})
export class CommunicationComponent {
  searchText: string = '';

  batchGroups: ChatItem[] = [
    { id: 1, name: 'Batch A', type: 'group', lastMessage: 'Assignment posted', time: '10:30 AM', readOnly: true },
    { id: 2, name: 'Batch B', type: 'group', lastMessage: 'Class at 4 PM', time: '09:15 AM', readOnly: false }
  ];

  directChats: ChatItem[] = [
    { id: 3, name: 'Student 1', type: 'direct', lastMessage: 'Sir, I have a doubt', online: true },
    { id: 4, name: 'Student 2', type: 'direct', lastMessage: 'Thank you sir', online: false }
  ];

  filteredBatchGroups: ChatItem[] = [];
  filteredDirectChats: ChatItem[] = [];

  selectedChat: ChatItem | null = this.batchGroups[0];

  messages: Message[] = [
    { text: 'Sir, will there be class tomorrow?', sender: 'student', time: '09:45 AM' },
    { text: 'Yes, class is scheduled at 10 AM.', sender: 'teacher', time: '09:46 AM' }
  ];

  newMessage = '';

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Communiation' }]);
    // Initialize filtered lists
    this.filteredBatchGroups = [...this.batchGroups];
    this.filteredDirectChats = [...this.directChats];
  }

  onSearch() { }

  clearSearch(): void {
    this.searchText = '';
    this.onSearch();
  }

  selectedFilter: 'all' | 'group' | 'direct' = 'all';

  setFilter(filter: 'all' | 'group' | 'direct') {
    this.selectedFilter = filter;

    // Optional: filter chats dynamically
    this.filteredBatchGroups = this.batchGroups.filter(chat =>
      filter === 'all' || (filter === 'group' && chat.type === 'group')
    );

    this.filteredDirectChats = this.directChats.filter(chat =>
      filter === 'all' || (filter === 'direct' && chat.type === 'direct')
    );
  }

  selectChat(chat: any){}
}
