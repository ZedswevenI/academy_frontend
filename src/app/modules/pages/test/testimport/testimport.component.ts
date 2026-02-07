import { Component } from '@angular/core';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

type ExcelRow = {
  classNo: any;
  subject: any;
  topic: any;
  subTopic: any;
  examCategory: any;
  examSubCategory: any;
  testNo: any;
  testCode: any;
  numberOfQuestions: any;
  status?: any;
  __error?: string;
};

@Component({
  selector: 'app-testimport',
  standalone: false,
  templateUrl: './testimport.component.html',
  styleUrl: './testimport.component.scss'
})
export class TestimportComponent {
  constructor(private commonApi: CommonapiService, private alert: AlertService) {}

  mode: 'insert' | 'upsert' = 'insert';
  loading = false;

  excelRows: ExcelRow[] = [];
  rowErrors: { row: number; message: string }[] = [];
  validCount = 0;

  // master data caches
  subjects: any[] = [];
  topics: any[] = [];
  subTopics: any[] = [];
  examCategories: any[] = [];
  examSubCategories: any[] = [];

  // fast lookup maps
  subjectByKey = new Map<string, any>();
  categoryByKey = new Map<string, any>();
  subCategoryByKey = new Map<string, any>();
  topicByKey = new Map<string, any>();
  subTopicByKey = new Map<string, any>();

  private tenantId(): string {
    return String(localStorage.getItem('tenantId') || '').trim();
  }

  private userId(): string | null {
    const v = String(localStorage.getItem('userId') || '').trim();
    return v || null;
  }

  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private must(v: any): boolean {
    return String(v ?? '').trim().length > 0;
  }

  private toNum(v: any): number {
    const n = Number(String(v ?? '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  // -------------------------
  // EXCEL HANDLING
  // -------------------------
  onFileChange(evt: any) {
    const file = evt?.target?.files?.[0];
    if (!file) return;

    this.excelRows = [];
    this.rowErrors = [];
    this.validCount = 0;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // Normalize rows with expected keys
        const rows: ExcelRow[] = (json || []).map((r: any) => ({
          classNo: r['classNo'],
          subject: r['subject'],
          topic: r['topic'],
          subTopic: r['subTopic'],
          examCategory: r['examCategory'],
          examSubCategory: r['examSubCategory'],
          testNo: r['testNo'],
          testCode: r['testCode'],
          numberOfQuestions: r['numberOfQuestions'],
          status: r['status'] || 'active'
        }));

        if (!rows.length) {
          this.alert.error('No rows found in Excel');
          return;
        }

        this.excelRows = rows;

        // Load masters & build maps once
        await this.loadMasterData();
        this.validateAndMarkErrors();

      } catch (err) {
        this.alert.error('Unable to read Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  downloadSample() {
    // create a simple sample sheet and download (browser)
    const sample = [
      {
        classNo: 12,
        subject: 'CHE',
        topic: 'Chemical Bonding',
        subTopic: 'Ionic Bond',
        examCategory: 'Weekly Test',
        examSubCategory: 'Chapter Test',
        testNo: '1605',
        testCode: '1605',
        numberOfQuestions: 10,
        status: 'active'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'tests');
    XLSX.writeFile(wb, 'tests-import-sample.xlsx');
  }

  // -------------------------
  // MASTER DATA LOAD
  // -------------------------
  private async loadMasterData(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId) {
      this.alert.error('TenantId missing');
      return;
    }

    // Convert observable to promise in your style (minimal)
    const p = (body: any, base: string, path: string) =>
      new Promise<any>((resolve, reject) => {
        this.commonApi.fetchData(body, base, path).subscribe({
          next: (res: any) => resolve(res),
          error: (e: any) => reject(e)
        });
      });

    const body = { entiId: tenantId };

    const [subRes, topicRes, subTopicRes, catRes, subCatRes] = await Promise.all([
      p(body, 'ims/subject', 'list?list=full'),
      p(body, 'ims/topic', 'list?list=full'),
      p(body, 'ims/subtopic', 'list?list=full'),
      p(body, 'ims/exam/category', 'list?list=full'),
      p(body, 'ims/exam/subcategory', 'list?list=full')
    ]);

    this.subjects = subRes?.data || [];
    this.topics = topicRes?.data || [];
    this.subTopics = subTopicRes?.data || [];
    this.examCategories = catRes?.data || [];
    this.examSubCategories = subCatRes?.data || [];

    // build lookup maps
    this.subjectByKey.clear();
    for (const s of this.subjects) {
      const id = String(s?._id || '').trim();
      const code = this.norm(s?.subjectCode);
      const name = this.norm(s?.subjectName);
      if (code) this.subjectByKey.set(code, s);
      if (name) this.subjectByKey.set(name, s);
      if (id) this.subjectByKey.set(this.norm(id), s);
    }

    this.categoryByKey.clear();
    for (const c of this.examCategories) {
      const key1 = this.norm(c?.categoryId);
      const key2 = this.norm(c?.categoryName);
      if (key1) this.categoryByKey.set(key1, c);
      if (key2) this.categoryByKey.set(key2, c);
    }

    this.subCategoryByKey.clear();
    for (const sc of this.examSubCategories) {
      const key1 = this.norm(sc?.subCategoryId);
      const key2 = this.norm(sc?.subCategoryName);
      if (key1) this.subCategoryByKey.set(key1, sc);
      if (key2) this.subCategoryByKey.set(key2, sc);
    }

    // Topics + SubTopics must also match classNo + subject
    // We'll use composite keys to avoid wrong matches
    // topicKey: `${classNo}|${subjectObjectId}|${topicNameOrId}`
    this.topicByKey.clear();
    for (const t of this.topics) {
      const classNo = Number(t?.classNo || 0);
      const subjectObjId = this.norm(t?.subjectId?._id || t?.subjectId);
      const topicId = this.norm(t?.topicId);
      const topicName = this.norm(t?.topicName);
      if (classNo && subjectObjId) {
        if (topicId) this.topicByKey.set(`${classNo}|${subjectObjId}|${topicId}`, t);
        if (topicName) this.topicByKey.set(`${classNo}|${subjectObjId}|${topicName}`, t);
      }
    }

    // subTopicKey: `${classNo}|${subjectObjectId}|${topicId}|${subTopicNameOrId}`
    this.subTopicByKey.clear();
    for (const st of this.subTopics) {
      const classNo = Number(st?.classNo || 0);
      const subjectObjId = this.norm(st?.subjectId?._id || st?.subjectId);
      const topicId = this.norm(st?.topicId);
      const subTopicId = this.norm(st?.subTopicId);
      const subTopicName = this.norm(st?.subTopicName);
      if (classNo && subjectObjId && topicId) {
        if (subTopicId) this.subTopicByKey.set(`${classNo}|${subjectObjId}|${topicId}|${subTopicId}`, st);
        if (subTopicName) this.subTopicByKey.set(`${classNo}|${subjectObjId}|${topicId}|${subTopicName}`, st);
      }
    }
  }

  // -------------------------
  // VALIDATE + MAP IDs
  // -------------------------
  private validateAndMarkErrors() {
    this.rowErrors = [];
    this.validCount = 0;

    for (let i = 0; i < this.excelRows.length; i++) {
      const r = this.excelRows[i];
      r.__error = '';

      const classNo = this.toNum(r.classNo);
      const subjKey = this.norm(r.subject);
      const topicKey = this.norm(r.topic);
      const subTopicKey = this.norm(r.subTopic);
      const catKey = this.norm(r.examCategory);
      const subCatKey = this.norm(r.examSubCategory);

      if (!classNo) r.__error += 'classNo missing. ';
      if (!this.must(r.subject)) r.__error += 'subject missing. ';
      if (!this.must(r.topic)) r.__error += 'topic missing. ';
      if (!this.must(r.subTopic)) r.__error += 'subTopic missing. ';
      if (!this.must(r.examCategory)) r.__error += 'examCategory missing. ';
      if (!this.must(r.examSubCategory)) r.__error += 'examSubCategory missing. ';
      if (!this.must(r.testNo)) r.__error += 'testNo missing. ';
      if (!this.must(r.testCode)) r.__error += 'testCode missing. ';
      if (this.toNum(r.numberOfQuestions) <= 0) r.__error += 'numberOfQuestions invalid. ';

      const subj = this.subjectByKey.get(subjKey);
      if (!subj) r.__error += 'Subject not found. ';

      const cat = this.categoryByKey.get(catKey);
      if (!cat) r.__error += 'Exam Category not found. ';

      const subCat = this.subCategoryByKey.get(subCatKey);
      if (!subCat) r.__error += 'Exam SubCategory not found. ';
      if (cat && subCat && String(subCat?.categoryId || '') !== String(cat?.categoryId || '')) {
        r.__error += 'SubCategory not under Category. ';
      }

      // topic/subtopic depends on class+subject
      if (subj && classNo) {
        const subjectObjId = this.norm(subj?._id);
        const t = this.topicByKey.get(`${classNo}|${subjectObjId}|${topicKey}`);
        if (!t) {
          r.__error += 'Topic not found for class+subject. ';
        } else {
          const st = this.subTopicByKey.get(`${classNo}|${subjectObjId}|${this.norm(t.topicId)}|${subTopicKey}`);
          if (!st) r.__error += 'SubTopic not found for topic+class+subject. ';
        }
      }

      if (r.__error) {
        this.rowErrors.push({ row: i + 2, message: r.__error.trim() }); // +2 because header row + 1-index
      } else {
        this.validCount++;
      }
    }
  }

  // -------------------------
  // IMPORT
  // -------------------------
  importNow() {
    if (!this.excelRows.length) {
      this.alert.error('No rows to import');
      return;
    }

    // refresh errors
    this.validateAndMarkErrors();

    const validRows = this.excelRows.filter((r) => !r.__error);
    if (!validRows.length) {
      this.alert.error('No valid rows found. Fix errors and try again.');
      return;
    }

    const rowsPayload = validRows.map((r) => {
      const classNo = this.toNum(r.classNo);
      const subj = this.subjectByKey.get(this.norm(r.subject));
      const subjectObjId = String(subj?._id || '').trim();

      const topic = this.topicByKey.get(`${classNo}|${this.norm(subjectObjId)}|${this.norm(r.topic)}`);
      const topicId = String(topic?.topicId || '').trim();

      const subTopic = this.subTopicByKey.get(`${classNo}|${this.norm(subjectObjId)}|${this.norm(topicId)}|${this.norm(r.subTopic)}`);
      const subTopicId = String(subTopic?.subTopicId || '').trim();

      const cat = this.categoryByKey.get(this.norm(r.examCategory));
      const subCat = this.subCategoryByKey.get(this.norm(r.examSubCategory));

      return {
        classNo,
        subjectId: subjectObjId,
        topicId: topicId,
        subTopicId: subTopicId,
        categoryId: String(cat?.categoryId || '').trim(),
        subCategoryId: String(subCat?.subCategoryId || '').trim(),
        testNo: String(r.testNo ?? '').trim(),
        testCode: String(r.testCode ?? '').trim(),
        numberOfQuestions: this.toNum(r.numberOfQuestions),
        status: String(r.status || 'active').trim().toLowerCase()
      };
    });

    const payload = {
      entiId: this.tenantId(),
      userId: this.userId(),
      mode: this.mode,
      rows: rowsPayload
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'assignment', 'import').subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status) {
          const inserted = res?.data?.inserted || 0;
          const upserted = res?.data?.upserted || 0;
          const modified = res?.data?.modified || 0;

          const rowErrors = Array.isArray(res?.rowErrors) ? res.rowErrors : [];
          if (rowErrors.length) {
            this.alert.error(`Imported with errors. Inserted:${inserted} Upserted:${upserted} Modified:${modified}`);
          } else {
            this.alert.success(`Import success. Inserted:${inserted} Upserted:${upserted} Modified:${modified}`);
          }
        } else {
          this.alert.error(res?.message || 'Import failed');
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Import failed');
      }
    });
  }
}