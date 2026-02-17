import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentFinance } from './student-finance';

describe('StudentFinance', () => {
  let component: StudentFinance;
  let fixture: ComponentFixture<StudentFinance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentFinance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentFinance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
