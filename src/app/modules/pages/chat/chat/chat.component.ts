import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

interface ChatItem {
  id: number;
  name: string;
  type: 'group' | 'direct';
  lastMessage: string;
  time?: string;
  readOnly?: boolean;
  online?: boolean;
  messages: Message[];
}

interface Message {
  text: string;
  sender: 'teacher' | 'student';
  time: string;
}

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
searchText: string = '';

  batchGroups: ChatItem[] = [
    {
      id: 1, name: 'Batch A', type: 'group', lastMessage: 'Assignment posted', time: '10:30 AM', readOnly: true, messages: [
        { text: 'Hello sir', sender: 'student', time: '09:10 AM' },
        { text: 'Yes, tell me', sender: 'teacher', time: '09:11 AM' },
        { text: 'Assignment submitted?', sender: 'student', time: '09:12 AM' }
      ]
    },
    {
      id: 2, name: 'Batch B', type: 'group', lastMessage: 'Class at 4 PM', time: '09:15 AM', readOnly: false, messages: [
        { text: 'Sir, class today?', sender: 'student', time: '10:00 AM' },
        { text: 'Yes, at 4 PM', sender: 'teacher', time: '10:05 AM' }
      ]
    },
  ];

  directChats: ChatItem[] = [
    {
      id: 3, name: 'Student 1', type: 'direct', lastMessage: 'Sir, I have a doubt', online: false, messages: [
        { text: 'Sir, I have a doubt', sender: 'student', time: '11:00 AM' }
      ]
    },
    {
      id: 4, name: 'Student 2', type: 'direct', lastMessage: 'Thank you sir', online: false, messages: [
        { text: 'Thank you sir', sender: 'student', time: '11:20 AM' }
      ]
    }
  ];

  filteredBatchGroups: ChatItem[] = [];
  filteredDirectChats: ChatItem[] = [];

  // messages = [
  //   { text: 'Hello sir', sender: 'other', time: '09:10 AM' },
  //   { text: 'Yes, tell me', sender: 'me', time: '09:11 AM' },
  //   { text: 'Assignment submitted?', sender: 'other', time: '09:12 AM' },
  // ];

  newMessage = '';

  // selectedChat: ChatItem | null = this.batchGroups[0];
  selectedChat: ChatItem | null = null;
  messages: Message[] = [];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Chat' }]);
    // Initialize filtered lists
    this.filteredBatchGroups = [...this.batchGroups];
    this.filteredDirectChats = [...this.directChats];
  }

  ngOnInit() {
    this.resetChats();
    this.selectChat(this.batchGroups[0]);
  }

  resetChats() {
    this.filteredBatchGroups = [...this.batchGroups];
    this.filteredDirectChats = [...this.directChats];
  }

  onSearch() {
    const search = this.searchText.toLowerCase().trim();

    this.filteredBatchGroups = this.batchGroups.filter(chat =>
      chat.name.toLowerCase().includes(search) ||
      chat.lastMessage.toLowerCase().includes(search)
    );

    this.filteredDirectChats = this.directChats.filter(chat =>
      chat.name.toLowerCase().includes(search) ||
      chat.lastMessage.toLowerCase().includes(search)
    );
  }

  clearSearch(): void {
    this.searchText = '';
    this.resetChats();
  }

  selectedFilter: 'all' | 'group' | 'direct' = 'all';

  setFilter(filter: 'all' | 'group' | 'direct') {
    this.selectedFilter = filter;

    this.filteredBatchGroups = this.batchGroups.filter(chat =>
      filter === 'all' || (filter === 'group' && chat.type === 'group')
    );

    this.filteredDirectChats = this.directChats.filter(chat =>
      filter === 'all' || (filter === 'direct' && chat.type === 'direct')
    );
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat) return;

    const msg: Message = {
      text: this.newMessage,
      sender: 'teacher',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    this.selectedChat.messages.push(msg);
    this.messages = this.selectedChat.messages;

    // update last message in left panel
    this.selectedChat.lastMessage = this.newMessage;

    this.newMessage = '';
  }


  selectChat(chat: ChatItem) {
    this.selectedChat = chat;
    this.messages = chat.messages;
  }
}
