import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface QuestionOption {
  optionHtml: string;
  isCorrect: boolean;
}

interface MatrixPair {
  left: string;
  right: string;
}

@Component({
  selector: 'app-question-creator',
  standalone: false,
  templateUrl: './question-view.component.html',
  styleUrls: ['./question-view.component.scss']
})
export class QuestionViewComponent implements OnInit {
  questions: any[] = [];
  loading = false;

  entiId!: string;
  testId!: string;

  constructor(
    private commonApi: CommonapiService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    this.testId = state.questions.testId;

    if (this.testId) {
      this.loadQuestions();
    }
  }

  async loadQuestions() {

    this.loading = true;

    const body = {
      entiId: this.entiId,
      testId: this.testId
    };

    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'assignment/question/list', 'bytest')
      );

      if (res?.status && res?.data?.length) {
        const rawQuestions = res.data[0].questions;
        this.questions = await this.processQuestions(rawQuestions);
      }

    } catch (err) {
      console.error(err);
    }

    this.loading = false;
  }

  async processQuestions(questions: any[]) {

    return Promise.all(
      questions.map(async (q, index) => {

        const questionHtml = await this.replaceDownloadUrls(q.questionHtml);
        const solutionHtml = q.solutionHtml
          ? await this.replaceDownloadUrls(q.solutionHtml)
          : '';

        const options = q.questionOptions?.length
          ? await Promise.all(
            q.questionOptions.map(async (opt: any) => ({
              ...opt,
              textHtml: await this.replaceDownloadUrls(opt.textHtml)
            }))
          )
          : [];

        return {
          ...q,
          questionNumber: index + 1,
          questionHtml: this.sanitizeHtml(questionHtml),
          solutionHtml: this.sanitizeHtml(solutionHtml),
          questionOptions: options.map(o => ({
            ...o,
            textHtml: this.sanitizeHtml(o.textHtml)
          }))
        };
      })
    );
  }

  async replaceDownloadUrls(html: string): Promise<string> {

    if (!html || !html.includes('<img')) return html;

    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];

    let updatedHtml = html;

    for (const match of matches) {

      const originalUrl = match[1];

      try {
        const downloadRes: any = await firstValueFrom(
          this.commonApi.fetchData(
            { url: originalUrl },
            'assignment/question/image',
            'download'
          )
        );

        if (downloadRes?.status) {
          updatedHtml = updatedHtml.replace(originalUrl, downloadRes.url);
        }

      } catch (err) {
        console.error('Image download error:', err);
      }
    }

    return updatedHtml;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  formatQuestionType(type: string): string {

    switch (type) {
      case 'mcq_single':
        return 'MCQ (Single)';
      case 'mcq_multiple':
        return 'MCQ (Multiple)';
      case 'true_false':
        return 'True / False';
      case 'subjective':
        return 'Subjective';
      case 'matrix':
        return 'Matrix Match';
      case 'passage_qns':
        return 'Passage Based';
      default:
        return type;
    }
  }

  editQuestion(question: any) {
    this.router.navigate(
      ['/app/tests/question-create'],
      {
        state: {
          question: {
            testId: question.testId,
            recId: question._id
          }

        }
      }
    );
  }

  deleteQuestion(question: any) {

    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    const body = {
      entiId: this.entiId,
      recId: question._id,
    };

    this.commonApi
      .fetchData(body, 'assignment/question', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.questions = this.questions.filter(
              q => q.questionId !== question.questionId
            );
          }
        },
        error: () => alert('Error deleting question')
      });
  }
}