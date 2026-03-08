import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_SEARCH_FILTERS,
  SearchFilters
} from '../../../features/public/public-search.types';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.css']
})
export class FilterPanelComponent implements OnInit, OnChanges {
  @Input() value: SearchFilters = DEFAULT_SEARCH_FILTERS;
  @Input() collapsible = true;
  @Input() initiallyCollapsed = true;
  @Input() submitLabel = 'Appliquer';
  @Input() includeCity = true;
  @Output() valueChange = new EventEmitter<SearchFilters>();
  @Output() submitFilters = new EventEmitter<SearchFilters>();

  model: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };
  collapsed = true;

  ngOnInit(): void {
    this.collapsed = this.collapsible ? this.initiallyCollapsed : false;
    this.model = { ...DEFAULT_SEARCH_FILTERS, ...this.value };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.model = { ...DEFAULT_SEARCH_FILTERS, ...this.value };
    }
  }

  toggle(): void {
    if (!this.collapsible) {
      return;
    }
    this.collapsed = !this.collapsed;
  }

  emitChange(): void {
    this.valueChange.emit({ ...this.model });
  }

  onSubmit(): void {
    this.submitFilters.emit({ ...this.model });
  }
}
