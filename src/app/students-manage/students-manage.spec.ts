import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsManage } from './students-manage';

describe('StudentsManage', () => {
  let component: StudentsManage;
  let fixture: ComponentFixture<StudentsManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsManage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
