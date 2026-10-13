import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs/operators';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { extractYouTubeId } from '../../../../shared/youtube.util';
import { PermissionService } from '../../../../shared/permission.service';

const NEW_MODULE_SENTINEL = '__new__';

interface HelpModule {
  moduleName: string;
  moduleSortOrder: number;
  topicCount: number;
}

interface HelpTopic {
  helpId: string;
  moduleName: string;
  moduleSortOrder: number;
  topic: string;
  description: string;
  videoLink: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-help-center',
  standalone: false,
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.scss',
})
export class HelpCenterComponent implements OnInit {
  private readonly moduleBase = 'help';
  userId: string;

  modules: HelpModule[] = [];
  loadingModules = false;
  selectedModuleName: string | null = null;

  topics: HelpTopic[] = [];
  loadingTopics = false;
  topicSearch = '';

  form!: FormGroup;
  showForm = false;
  formMode: 'create' | 'edit' = 'create';
  saving = false;

  deleteModalVisible = false;
  deleteMessage = '';
  private deleteTarget: HelpTopic | null = null;

  showRenameModal = false;
  renameTarget = '';
  renameValue = '';
  renaming = false;

  readonly newModuleSentinel = NEW_MODULE_SENTINEL;

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private permissionService: PermissionService,
  ) {
    this.userId = localStorage.getItem('userId') || '';
    this.breadcrumb.set([{ label: 'Org-Masters' }, { label: 'Help Center' }]);
  }

  get canEditHelpCenter(): boolean {
    return this.permissionService.hasPermission('orgHelpCenter:edit');
  }

  ngOnInit(): void {
    this.initForm();
    this.loadModules();
  }

  private initForm(): void {
    this.form = this.fb.group({
      helpId: [''],
      moduleSelect: ['', Validators.required],
      newModuleName: [''],
      topic: ['', [Validators.required, Validators.maxLength(160)]],
      description: [''],
      videoLink: ['', Validators.required],
      sortOrder: [0],
      status: ['active'],
    });
  }

  get videoPreviewId(): string | null {
    return extractYouTubeId(this.form.get('videoLink')?.value || '');
  }

  get isNewModuleSelected(): boolean {
    return this.form.get('moduleSelect')?.value === NEW_MODULE_SENTINEL;
  }

  // ====================================================
  // LOAD MODULES
  // ====================================================
  loadModules(selectModuleName?: string): void {
    this.loadingModules = true;
    this.commonApi
      .fetchData({}, this.moduleBase, 'modules')
      .pipe(finalize(() => (this.loadingModules = false)))
      .subscribe({
        next: (res: any) => {
          this.modules = (res?.data || []) as HelpModule[];
          const target =
            selectModuleName ||
            this.selectedModuleName ||
            this.modules[0]?.moduleName ||
            null;
          if (target && this.modules.some((m) => m.moduleName === target)) {
            this.selectModule(target);
          } else {
            this.selectedModuleName = null;
            this.topics = [];
          }
        },
        error: () => this.alert.error('Error loading help modules'),
      });
  }

  // ====================================================
  // LOAD TOPICS
  // ====================================================
  selectModule(moduleName: string): void {
    this.selectedModuleName = moduleName;
    this.topicSearch = '';
    this.loadTopics();
  }

  loadTopics(): void {
    if (!this.selectedModuleName) return;
    this.loadingTopics = true;
    this.commonApi
      .fetchData(
        { moduleName: this.selectedModuleName, list: 'full' },
        this.moduleBase,
        'list',
      )
      .pipe(finalize(() => (this.loadingTopics = false)))
      .subscribe({
        next: (res: any) => {
          const rows = res?.data?.rows || res?.data || [];
          this.topics = rows as HelpTopic[];
        },
        error: () => this.alert.error('Error loading topics'),
      });
  }

  get filteredTopics(): HelpTopic[] {
    const q = this.topicSearch.trim().toLowerCase();
    if (!q) return this.topics;
    return this.topics.filter(
      (t) =>
        t.topic.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q),
    );
  }

  // ====================================================
  // MODULE REORDER (single-item endpoint — fire one call per shifted module)
  // ====================================================
  dropModule(event: CdkDragDrop<HelpModule[]>): void {
    if (!this.canEditHelpCenter) return;
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.modules, event.previousIndex, event.currentIndex);
    const updates = this.modules.map((m, i) => ({ ...m, moduleSortOrder: i }));
    this.modules = updates;

    let pending = updates.length;
    updates.forEach((m) => {
      this.commonApi
        .fetchData(
          { userId: this.userId, moduleName: m.moduleName, moduleSortOrder: m.moduleSortOrder },
          this.moduleBase,
          'module/sort-order',
        )
        .subscribe({
          next: () => {
            pending--;
            if (pending === 0) this.alert.success('Module order saved');
          },
          error: () => {
            pending--;
            this.alert.error(`Failed to save order for "${m.moduleName}"`);
          },
        });
    });
  }

  // ====================================================
  // TOPIC REORDER (bulk endpoint)
  // ====================================================
  dropTopic(event: CdkDragDrop<HelpTopic[]>): void {
    if (!this.canEditHelpCenter) return;
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.topics, event.previousIndex, event.currentIndex);
    const items = this.topics.map((t, i) => {
      t.sortOrder = i + 1;
      return { helpId: t.helpId, sortOrder: t.sortOrder };
    });

    this.commonApi
      .fetchData({ userId: this.userId, items }, this.moduleBase, 'topic/sort-order')
      .subscribe({
        next: () => this.alert.success('Topic order saved'),
        error: () => {
          this.alert.error('Failed to save topic order');
          this.loadTopics();
        },
      });
  }

  // ====================================================
  // CREATE / EDIT
  // ====================================================
  add(): void {
    this.formMode = 'create';
    this.form.reset({
      helpId: '',
      moduleSelect: this.selectedModuleName || '',
      newModuleName: '',
      topic: '',
      description: '',
      videoLink: '',
      sortOrder: 0,
      status: 'active',
    });
    this.showForm = true;
  }

  edit(topic: HelpTopic): void {
    this.formMode = 'edit';
    this.form.reset({
      helpId: topic.helpId,
      moduleSelect: topic.moduleName,
      newModuleName: '',
      topic: topic.topic,
      description: topic.description || '',
      videoLink: topic.videoLink,
      sortOrder: topic.sortOrder ?? 0,
      status: topic.status || 'active',
    });
    this.showForm = true;
  }

  cancel(): void {
    if (this.saving) return;
    this.showForm = false;
  }

  save(): void {
    if (this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alert.error('Please fill required fields');
      return;
    }
    const v = this.form.value;
    const moduleName =
      v.moduleSelect === NEW_MODULE_SENTINEL
        ? (v.newModuleName || '').toString().trim()
        : v.moduleSelect;
    if (!moduleName) {
      this.alert.error('Please enter a module name');
      return;
    }

    const payload: any = {
      userId: this.userId,
      moduleName,
      topic: (v.topic || '').toString().trim(),
      description: (v.description || '').toString().trim(),
      videoLink: (v.videoLink || '').toString().trim(),
      sortOrder: Number(v.sortOrder || 0),
    };

    const endpoint = this.formMode === 'create' ? 'create' : 'update';
    if (this.formMode === 'edit') {
      payload.helpId = v.helpId;
      payload.status = v.status;
    }

    this.saving = true;
    this.commonApi
      .fetchData(payload, this.moduleBase, endpoint)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) {
            this.alert.error(res?.message || 'Save failed');
            return;
          }
          this.alert.success(
            this.formMode === 'create' ? 'Help topic created' : 'Help topic updated',
          );
          this.showForm = false;
          this.loadModules(moduleName);
        },
        error: (err: any) => this.alert.error(err?.error?.message || 'Save failed'),
      });
  }

  // ====================================================
  // DELETE
  // ====================================================
  openDelete(topic: HelpTopic): void {
    this.deleteTarget = topic;
    const mod = this.modules.find((m) => m.moduleName === topic.moduleName);
    const isLastTopic = (mod?.topicCount ?? 0) <= 1;
    this.deleteMessage = isLastTopic
      ? `"${topic.topic}" is the last topic in "${topic.moduleName}" — deleting it will also remove the "${topic.moduleName}" module from the help center. Continue?`
      : `Are you sure you want to delete "${topic.topic}"?`;
    this.deleteModalVisible = true;
  }

  onDeleteModalClosed(confirmed: boolean): void {
    this.deleteModalVisible = false;
    if (!confirmed || !this.deleteTarget) {
      this.deleteTarget = null;
      return;
    }
    const helpId = this.deleteTarget.helpId;
    this.deleteTarget = null;

    this.commonApi.fetchData({ userId: this.userId, helpId }, this.moduleBase, 'delete').subscribe({
      next: (res: any) => {
        if (res?.status === false) {
          this.alert.error(res?.message || 'Delete failed');
          return;
        }
        this.alert.success('Help topic deleted');
        this.loadModules();
      },
      error: (err: any) => this.alert.error(err?.error?.message || 'Delete failed'),
    });
  }

  // ====================================================
  // RENAME MODULE (client-side loop — moduleName is denormalized per topic,
  // no bulk-rename endpoint exists)
  // ====================================================
  openRenameModule(moduleName: string): void {
    this.renameTarget = moduleName;
    this.renameValue = moduleName;
    this.showRenameModal = true;
  }

  cancelRename(): void {
    if (this.renaming) return;
    this.showRenameModal = false;
  }

  confirmRename(): void {
    if (this.renaming) return;
    const newName = this.renameValue.trim();
    if (!newName || newName === this.renameTarget) {
      this.showRenameModal = false;
      return;
    }

    this.renaming = true;
    this.commonApi
      .fetchData({ moduleName: this.renameTarget, list: 'full' }, this.moduleBase, 'list')
      .subscribe({
        next: (res: any) => {
          const rows: HelpTopic[] = res?.data?.rows || res?.data || [];
          if (!rows.length) {
            this.renaming = false;
            this.showRenameModal = false;
            return;
          }
          let pending = rows.length;
          let failed = 0;
          rows.forEach((t) => {
            this.commonApi
              .fetchData(
                { userId: this.userId, helpId: t.helpId, moduleName: newName },
                this.moduleBase,
                'update',
              )
              .subscribe({
                next: (r: any) => {
                  if (r?.status === false) failed++;
                  pending--;
                  this.finishRename(pending, failed, newName);
                },
                error: () => {
                  failed++;
                  pending--;
                  this.finishRename(pending, failed, newName);
                },
              });
          });
        },
        error: () => {
          this.renaming = false;
          this.alert.error('Error loading topics for this module');
        },
      });
  }

  private finishRename(pending: number, failed: number, newName: string): void {
    if (pending > 0) return;
    this.renaming = false;
    this.showRenameModal = false;
    if (failed > 0) {
      this.alert.error(`Rename partially failed for ${failed} topic(s) — module may now be split across both names`);
    } else {
      this.alert.success('Module renamed');
    }
    this.loadModules(newName);
  }
}
