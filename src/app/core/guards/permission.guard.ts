import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requireAdmin = route.data['requireAdmin'] === true;
    const roles = route.data['roles'] as string[] | undefined;
    if (this.authService.canAccess(requireAdmin, roles)) {
      return true;
    }
    return this.router.createUrlTree(['/dashboard']);
  }
}
