import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, AuditLogItem } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-history-page.component.html',
  styleUrls: ['./admin-history-page.component.css']
})
export class AdminHistoryPageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly logs = signal<AuditLogItem[]>([]);
  readonly message = signal('');
  actionFilter = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  onApplyFilter(): void {
    this.loadLogs();
  }

  trackByLogId = (_: number, log: AuditLogItem): number => log.id;

  metadataPreview(metadata: unknown): string {
    if (!metadata || typeof metadata !== 'object') {
      return '-';
    }
    const raw = JSON.stringify(metadata);
    if (raw.length <= 80) {
      return raw;
    }
    return `${raw.slice(0, 80)}...`;
  }

  private loadLogs(): void {
    this.isLoading.set(true);
    this.message.set('');
    const params = this.actionFilter.trim() ? { action: this.actionFilter.trim() } : undefined;
    this.api.getAuditLogs(params).subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.message.set('Impossible de charger l’historique.');
      }
    });
  }
}
