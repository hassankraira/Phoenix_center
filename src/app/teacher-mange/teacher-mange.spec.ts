import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherMange } from './teacher-mange';

describe('TeacherMange', () => {
  let component: TeacherMange;
  let fixture: ComponentFixture<TeacherMange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherMange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherMange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
