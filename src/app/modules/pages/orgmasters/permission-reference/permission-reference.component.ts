import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';
import {
  PermissionCatalogService,
  PermissionModuleGroup,
  computeModuleLabels,
} from '../../../../shared/permission-catalog.service';

interface DisplayGroup extends PermissionModuleGroup {
  moduleLabel: string;
}

@Component({
  selector: 'app-permission-reference',
  standalone: false,
  templateUrl: './permission-reference.component.html',
  styleUrl: './permission-reference.component.scss',
})
export class PermissionReferenceComponent implements OnInit {
  loading = false;
  search = '';
  groups: DisplayGroup[] = [];
  totalKeys = 0;

  constructor(
    private router: Router,
    private alert: AlertService,
    private breadcrumb: BredcrumpService,
    private authService: AuthService,
    private permissionCatalogService: PermissionCatalogService,
  ) {
    this.breadcrumb.set([
      { label: 'Org-Master' },
      { label: 'Users', link: '/app/org-master/users' },
      { label: 'Permission Reference' },
    ]);
  }

  ngOnInit(): void {
    // Admin-only, same convention as Manage Access — not tied to any single
    // permission key since this page cross-references the whole catalog.
    if (!this.authService.getIsAdmin()) {
      this.alert.error('Only the institute admin can view the permission reference.');
      this.router.navigate(['/app/org-master/users']);
      return;
    }
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading = true;
    this.permissionCatalogService.getCatalog().subscribe({
      next: (groups) => {
        this.loading = false;
        const labels = computeModuleLabels(groups);
        this.groups = groups
          .map((g) => ({ ...g, moduleLabel: labels.get(g.module) || g.module }))
          .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
        this.totalKeys = groups.reduce((n, g) => n + g.permissions.length, 0);
      },
      error: () => {
        this.loading = false;
        this.alert.error('Failed to load permission catalog');
      },
    });
  }

  get filteredGroups(): DisplayGroup[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.groups;
    return this.groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.permissionKey.toLowerCase().includes(q) ||
            p.label?.toLowerCase().includes(q) ||
            g.moduleLabel.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }
}
