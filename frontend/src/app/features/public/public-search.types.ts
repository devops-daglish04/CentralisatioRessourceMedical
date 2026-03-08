export type StructureTypeFilter = '' | 'Hopital' | 'Pharmacie' | 'Banque';
export type ResourceFilter = '' | 'blood' | 'medicine' | 'oxygen' | 'incubator';

export interface SearchFilters {
  query: string;
  city: string;
  structureType: StructureTypeFilter;
  resource: ResourceFilter;
  bloodGroup: string;
  availability: boolean;
  radius: number;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: '',
  city: 'Yaounde',
  structureType: '',
  resource: '',
  bloodGroup: '',
  availability: true,
  radius: 10
};
