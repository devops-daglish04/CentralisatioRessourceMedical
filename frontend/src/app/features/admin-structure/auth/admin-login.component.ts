import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  email = '';
  password = '';
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  onSubmit(): void {
    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Veuillez renseigner email et mot de passe.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.api.login(this.email.trim(), this.password).subscribe({
      next: (tokens) => {
        this.auth.setTokens(tokens.access, tokens.refresh);
        this.isLoading.set(false);
        const roleFromResponse = tokens.role;
        const role = roleFromResponse || this.auth.getRole();
        if (role === 'SUPER_ADMIN' || this.auth.hasRole('SUPER_ADMIN')) {
          void this.router.navigateByUrl('/super-admin/dashboard');
          return;
        }
        if (
          role === 'ADMIN_STRUCTURE' ||
          role === 'STRUCTURE_ADMIN' ||
          this.auth.hasRole('ADMIN_STRUCTURE') ||
          this.auth.hasRole('STRUCTURE_ADMIN')
        ) {
          void this.router.navigateByUrl('/structure-admin/dashboard');
          return;
        }
        this.auth.clearTokens();
        this.errorMessage.set("Ce compte n'a pas accès à l'interface d'administration.");
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Identifiants invalides ou accès refusé.');
      }
    });
  }
}


