import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';

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
  templateUrl: './question-creator.component.html',
  styleUrls: ['./question-creator.component.scss']
})
export class QuestionCreatorComponent implements OnInit {
  questionForm!: FormGroup;
  showPassagePopup = false;


  questionTypes = [
    { value: 'mcq-single', label: 'MCQ (Single Answer)' },
    { value: 'mcq-multiple', label: 'MCQ (Multiple Answers)' },
    { value: 'subjective', label: 'Subjective Type' },
    { value: 'true-false', label: 'True/False' },
    { value: 'text-based', label: 'Text Based' },
    { value: 'matrix', label: 'Matrix Type (Match the Questions)' }
  ];

  constructor(private fb: FormBuilder) {
    this.questionForm = this.fb.group({
      enablePassage: [false],
      enableInstruction: [false],
      enableSolution: [false],
      questionType: ['mcq-single', Validators.required],
      questionText: ['', Validators.required],
      positiveMarks: [1, [Validators.required, Validators.min(0)]],
      negativeMarks: [1, [Validators.required, Validators.min(0)]],
      difficulty: ['medium'],
      questionOptions: this.fb.array([]),
      passageId: [null],          // selected passage ID
      passageText: [''],          // display-only content
      instruction: [''],
      solution: [''],
      trueFalseAnswer: [null],
      subjectiveAnswer: [''],
      matrixLeft: this.fb.array([]),
      matrixRight: this.fb.array([])
    });
  }


  ngOnInit(): void {
    // Initialize with default options for MCQ
    this.addOption();
    this.addOption();
    this.addOption();
    this.addOption();
    this.handleOptionalToggles();


    // Listen to question type changes
    this.questionForm.get('questionType')?.valueChanges.subscribe(type => {
      this.onQuestionTypeChange(type);
    });
  }

  handleOptionalToggles(): void {

    // Passage
    this.questionForm.get('enablePassage')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          passageId: null,
          passageText: ''
        });
      }
    });

    // Instruction
    this.questionForm.get('enableInstruction')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          instruction: ''
        });
      }
    });

    // Solution
    this.questionForm.get('enableSolution')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          solution: ''
        });
      }
    });
  }

  get options(): FormArray {
    return this.questionForm.get('questionOptions') as FormArray;
  }

  get matrixLeft(): FormArray {
    return this.questionForm.get('matrixLeft') as FormArray;
  }

  get matrixRight(): FormArray {
    return this.questionForm.get('matrixRight') as FormArray;
  }

  addOption(): void {
    const optionGroup = this.fb.group({
      text: ['', Validators.required],
      isCorrect: [false]
    });
    this.options.push(optionGroup);
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.removeAt(index);
    }
  }

  addMatrixPair(): void {
    this.matrixLeft.push(this.fb.control(''));
    this.matrixRight.push(this.fb.control(''));
  }

  removeMatrixPair(index: number): void {
    if (this.matrixLeft.length > 1) {
      this.matrixLeft.removeAt(index);
      this.matrixRight.removeAt(index);
    }
  }

  onQuestionTypeChange(type: string): void {
    // Clear options if switching to/from matrix type
    if (type === 'matrix') {
      this.options.clear();
      if (this.matrixLeft.length === 0) {
        this.addMatrixPair();
        this.addMatrixPair();
        this.addMatrixPair();
      }
    } else if (type === 'mcq-single' || type === 'mcq-multiple') {
      this.matrixLeft.clear();
      this.matrixRight.clear();
      if (this.options.length === 0) {
        this.addOption();
        this.addOption();
        this.addOption();
        this.addOption();
      }
    } else {
      this.options.clear();
      this.matrixLeft.clear();
      this.matrixRight.clear();
    }
  }

  onOptionChange(index: number, type: string): void {
    if (type === 'mcq-single') {
      // For single answer, uncheck all other options
      this.options.controls.forEach((control, i) => {
        if (i !== index) {
          control.get('isCorrect')?.setValue(false);
        }
      });
    }
  }

  getSelectedQuestionType(): string {
    return this.questionForm.get('questionType')?.value || 'mcq-single';
  }

  logInvalidControls(form: FormGroup | FormArray, path: string = ''): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      const controlPath = path ? `${path}.${key}` : key;

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.logInvalidControls(control, controlPath);
      } else {
        if (control?.invalid) {
          console.log('❌ Invalid control:', controlPath, control.errors);
        }
      }
    });
  }

  onSubmit(): void {
    this.logInvalidControls(this.questionForm);
    if (this.questionForm.valid) {
      // const questionData = this.prepareQuestionData();
      this.prepareQuestionData().then(payload => {
        console.log('Question Data:', payload);
      });
      // Here you would typically send this data to your backend
      alert('Question saved successfully!');
    } else {
      alert('Please fill all required fields');
    }
  }

  execCommandFor(editorId: string, command: string, value: string | null = null) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value || '');
  }

  execCommand(command: string, value: string | null = null) {
    document.execCommand(command, false, value || '');
  }

  onEditorInput(event: Event, controlName: string) {
    const target = event.target as HTMLDivElement;
    if (!target) return;

    this.questionForm.patchValue({
      [controlName]: target.innerHTML
    });
  }

  onOptionEditorInput(index: number, event: Event) {
    const optionGroup = this.options.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  onMatrixRightEditorInput(index: number, event: Event) {
    const optionGroup = this.matrixRight.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  onMatrixLeftEditorInput(index: number, event: Event) {
    const optionGroup = this.matrixLeft.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  extractBase64Images(html: string): { images: string[]; cleanedHtml: string } {
    const images: string[] = [];
    let cleanedHtml = html;

    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return { images, cleanedHtml };
  }

  // uploadImage(base64: string): Promise<string> {
  // return this.http
  //   .post<{ url: string }>('/api/upload-image', { image: base64 })
  //   .toPromise()
  //   .then(res => res.url);
// }

  async replaceImagesWithUrls(html: string): Promise<string> {
    const { images } = this.extractBase64Images(html);
    let updatedHtml = html;
    for (const base64 of images) {
      // const imageUrl = await this.uploadImage(base64);
      updatedHtml = updatedHtml.replace(
        base64,
        ""
      );
    }

    return updatedHtml;
  }


  async prepareQuestionData(): Promise<any> {
    const formValue = this.questionForm.value;
    const questionType = formValue.questionType;

    // 🔹 Process common rich-text fields
    const questionText = await this.replaceImagesWithUrls(formValue.questionText);
    const instruction = await this.replaceImagesWithUrls(formValue.instruction);
    const solution = await this.replaceImagesWithUrls(formValue.solution);

    const baseData = {
      enablePassage: formValue.enablePassage,
      enableInstruction: formValue.enableInstruction,
      enableSolution: formValue.enableSolution,
      questionType: questionType,
      instruction,
      solution,
      questionHtml : questionText,
      positiveMarks: formValue.positiveMarks,
      negativeMarks: formValue.negativeMarks,
      difficulty: formValue.difficulty
    };

    switch (questionType) {

      /* ================= MCQ ================= */
      case 'mcq-single':
      case 'mcq-multiple': {
        const processedOptions = await Promise.all(
          formValue.questionOptions.map(async (opt: QuestionOption) => ({
            ...opt,
            textHtml: await this.replaceImagesWithUrls(opt.optionHtml) // ✅ option images handled
          }))
        );

        return {
          ...baseData,
          questionOptions: processedOptions,
          correctAnswers: processedOptions
            .map((opt, idx) => opt.isCorrect ? idx : null)
            .filter((idx: number | null) => idx !== null)
        };
      }

      /* ================= TRUE / FALSE ================= */
      case 'true-false':
        return {
          ...baseData,
          correctAnswer: formValue.trueFalseAnswer
        };

      /* ================= SUBJECTIVE ================= */
      case 'subjective': {
        const sampleAnswer = await this.replaceImagesWithUrls(formValue.subjectiveAnswer);

        return {
          ...baseData,
          sampleAnswer
        };
      }

      /* ================= TEXT BASED ================= */
      case 'text-based':
        return {
          ...baseData
        };

      /* ================= MATRIX ================= */
      case 'matrix': {
        const leftColumn = await Promise.all(
          formValue.matrixLeft.map(async (item: any) => ({
            ...item,
            text: await this.replaceImagesWithUrls(item.text)
          }))
        );

        const rightColumn = await Promise.all(
          formValue.matrixRight.map(async (item: any) => ({
            ...item,
            text: await this.replaceImagesWithUrls(item.text)
          }))
        );

        return {
          ...baseData,
          leftColumn,
          rightColumn
        };
      }

      default:
        return baseData;
    }
  }

  resetForm(): void {
    this.questionForm.reset({
      questionType: 'mcq-single',
      marks: 1,
      difficulty: 'medium'
    });
    this.options.clear();
    this.matrixLeft.clear();
    this.matrixRight.clear();
    this.addOption();
    this.addOption();
    this.addOption();
    this.addOption();
  }



  execOptionCommand(index: number, command: string) {
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, '');
  }

  insertOptionTable(index: number) {
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let i = 0; i < +rows; i++) {
      html += '<tr>';
      for (let j = 0; j < +cols; j++) {
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }

  insertOptionLatex(index: number) {
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html =
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;

    document.execCommand('insertHTML', false, html);

    // If using MathJax
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }

  execMatrixLeftCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();
    document.execCommand(command, false);
  }

  insertMatrixLeftTable(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }

  insertMatrixLeftLatex(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }

  execMatrixRightCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();
    document.execCommand(command, false);
  }
  insertMatrixRightTable(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:8px;border:1px solid #ddd">Cell</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }


  insertMatrixRightLatex(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }

  insertTable(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:10px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }



  insertLatex(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }



  onPasteImage(event: ClipboardEvent, editorId: string) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 🔥 Detect image
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault(); // stop default paste

        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
          const editor = document.getElementById(editorId) as HTMLDivElement;
          if (!editor) return;

          editor.focus();

          // Insert image HTML
          const imgHtml = `
          <img 
            src="${reader.result}" 
            style="max-width:100%; height:auto; margin:8px 0; border-radius:4px;" 
          />
        `;

          document.execCommand('insertHTML', false, imgHtml);
        };

        reader.readAsDataURL(file);
      }
    }
  }



  passages = [
    { id: 1, title: 'Physics Passage 1', content: '<p>Newton’s laws...</p>' },
    { id: 2, title: 'Chemistry Passage', content: '<table border=\"1\" style=\"width: 100%;\"><tbody><tr><td style=\"padding: 10px; border-width: 1px; border-color: rgb(221, 221, 221); border-image: initial;\">fdfdff</td><td style=\"padding: 10px; border-width: 1px; border-color: rgb(221, 221, 221); border-image: initial;\">fd</td></tr><tr><td style=\"padding: 10px; border-width: 1px; border-color: rgb(221, 221, 221); border-image: initial;\">fdfd</td><td style=\"padding: 10px; border-width: 1px; border-color: rgb(221, 221, 221); border-image: initial;\">fdfd</td></tr></tbody></table><p></p>' }
  ];

  openPassagePopup(): void {
    this.showPassagePopup = true;
  }

  onPassageSelected(passage: any): void {
    this.questionForm.patchValue({
      passageId: passage.id,
      passageText: passage.content
    });
    this.showPassagePopup = false;
  }

  closePassagePopup(): void {
    this.showPassagePopup = false;
  }

}