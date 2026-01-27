import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-knowledge-create',
  standalone: false,
  templateUrl: './knowledge-create.component.html',
  styleUrl: './knowledge-create.component.scss'
})
export class KnowledgeCreateComponent {
  knowledgeForm!: FormGroup;

  class_options = [
    { label: 'JEE', value: 'JEE' },
    { label: 'NEET', value: 'NEET' },
    { label: 'IIT', value: 'IIT' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Knowledge Base', link: '/app/knowledge' }, { label: 'Create'}])
  }

  ngOnInit(): void {
    this.knowledgeForm = this.fb.group({
      title: ['', [Validators.required]],
      class: ['', [Validators.required]],
      desc: [''],
      file: [''],
      batch: ['', [Validators.required]],
      date: ['', [Validators.required]]
    })
  }

  //importfile
  onFilesSelected(files: File[]) {
    console.log(files);
  }

  addKnowledge() {
    this.router.navigate(['/app/knowledge'])
  }
}
