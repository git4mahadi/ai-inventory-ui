import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService, AuthUser } from '../../../../core/services/auth.service';
import {
  collectDefaultExpandedIds,
  findExpandedIdsForUrl,
  SIDEBAR_MENU,
  SidebarMenuNode,
} from '../../menu/sidebar-menu';

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly collapseStorageKey = 'ai-inventory-sidebar-collapsed';
  private readonly expandedStorageKey = 'ai-inventory-sidebar-expanded';
  private routerSub?: Subscription;

  currentUser: AuthUser | null = null;
  /** Mobile drawer open/closed */
  sidebarOpen = false;
  /** Desktop minimized rail */
  sidebarCollapsed = false;

  /** Dynamic tree from separate menu file */
  readonly menuTree: SidebarMenuNode[] = SIDEBAR_MENU;

  /** Expanded parent node ids */
  expandedIds = new Set<string>();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.sidebarCollapsed = localStorage.getItem(this.collapseStorageKey) === '1';
    this.expandedIds = this.readExpandedIds();
  }

  ngOnInit(): void {
    this.syncExpandedWithRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncExpandedWithRoute(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get userInitials(): string {
    const name =
      this.currentUser?.username?.trim() ||
      this.currentUser?.name?.trim() ||
      'User';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  hasChildren(node: SidebarMenuNode): boolean {
    return !!node.children?.length;
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedIds.has(nodeId);
  }

  onParentClick(node: SidebarMenuNode, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
      localStorage.setItem(this.collapseStorageKey, '0');
      if (!this.expandedIds.has(node.id)) {
        this.expandedIds.add(node.id);
        this.expandedIds = new Set(this.expandedIds);
        this.persistExpandedIds();
      }
      return;
    }

    this.toggleExpanded(node.id);
  }

  toggleExpanded(nodeId: string): void {
    if (this.expandedIds.has(nodeId)) {
      this.expandedIds.delete(nodeId);
    } else {
      this.expandedIds.add(nodeId);
    }
    this.expandedIds = new Set(this.expandedIds);
    this.persistExpandedIds();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleCollapse(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem(
      this.collapseStorageKey,
      this.sidebarCollapsed ? '1' : '0',
    );
  }

  logout(): void {
    this.authService.logout();
  }

  private syncExpandedWithRoute(url: string): void {
    const routeParents = findExpandedIdsForUrl(this.menuTree, url);
    if (!routeParents.length) {
      return;
    }
    for (const id of routeParents) {
      this.expandedIds.add(id);
    }
    this.expandedIds = new Set(this.expandedIds);
    this.persistExpandedIds();
  }

  private readExpandedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.expandedStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    return new Set(collectDefaultExpandedIds(this.menuTree));
  }

  private persistExpandedIds(): void {
    localStorage.setItem(
      this.expandedStorageKey,
      JSON.stringify([...this.expandedIds]),
    );
  }
}
