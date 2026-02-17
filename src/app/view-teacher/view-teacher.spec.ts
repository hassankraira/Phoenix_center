import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTeacher } from './view-teacher';

describe('ViewTeacher', () => {
  let component: ViewTeacher;
  let fixture: ComponentFixture<ViewTeacher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTeacher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewTeacher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
