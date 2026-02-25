import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-knowledge-view',
  standalone: false,
  templateUrl: './knowledge-view.component.html',
  styleUrls: ['./knowledge-view.component.scss']
})
export class KnowledgeViewComponent implements OnInit {

  material: any = null;

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router
  ) {
    this.breadcrumb.set([
      { label: 'Knowledge Base', link: '/app/knowledge' },
      { label: 'View' }
    ]);
    const nav = this.router.getCurrentNavigation();
    const stateMaterial = nav?.extras?.state?.['material'];

    if (stateMaterial) {
      this.material = stateMaterial;
    } else {
      // If user refreshes page, go back to list
      this.router.navigate(['/app/knowledge']);
    }
  }

  ngOnInit(): void {


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

  getBatchDisplay(): string {
    if (!this.material?.batchIds?.length) return '-';
    return this.material.batchIds.join(', ');
  }

  getAttachmentUrl(): string {
    return this.material?.attachmentUrl?.[0]?.url || '';
  }
}