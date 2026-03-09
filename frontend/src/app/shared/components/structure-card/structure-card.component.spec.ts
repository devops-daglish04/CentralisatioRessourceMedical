import { TestBed } from '@angular/core/testing';
import { StructureCardComponent } from './structure-card.component';

describe('StructureCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructureCardComponent]
    }).compileComponents();
  });

  it('renders structure name and distance', () => {
    const fixture = TestBed.createComponent(StructureCardComponent);
    fixture.componentRef.setInput('structure', {
      id: 1,
      name: 'Hopital Central',
      type: 'Hopital',
      address: 'Centre ville',
      contact_phone: '+237 699',
      is_active: true,
      availability: true,
      blood_groups: ['O+'],
      latitude: 3.86,
      longitude: 11.51,
      location: { type: 'Point', coordinates: [11.51, 3.86] },
      distance_m: 2100,
      distance: 2.1,
      resources: [
        {
          id: 11,
          resource_type: 'Sang',
          name_or_group: 'O+',
          quantity: 8,
          unit: 'poches',
          status: 'Disponible',
          last_updated: new Date().toISOString()
        }
      ],
      services: []
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hopital Central');
    expect(text).toContain('2.1 km');
  });
});
