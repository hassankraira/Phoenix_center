import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupsMange } from './groups-mange';

describe('GroupsMange', () => {
  let component: GroupsMange;
  let fixture: ComponentFixture<GroupsMange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupsMange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupsMange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
