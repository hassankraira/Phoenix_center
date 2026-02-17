import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';
import { Component, signal, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

interface Teachers{
  Id: number
  First_Name:string
  Last_Name:string
}
interface Group {
  Id: number;
  Name: string;
  Teacher:string
}

interface Schedule {
  schedule_id: number;
  group_id:number
  group_name: string;
  room_id:number
  room_name: string;
  class_date: string;
  start_time: string;
  end_time: string;
  days: string;
  teacher: string;
  is_active: number;

  // 👇 front-end only
  _state?: 'clean' | 'new' | 'updated' | 'deleted';
}

interface Rooms{
  Id:number
  Name:string
  Capacity:number
  Is_Active:number
  Note:string
}
@Component({
  selector: 'app-schedules-component',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './schedules-component.html',
  styleUrl: './schedules-component.css',
})
export class SchedulesComponent {
  days = ['الجمعة','السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  rooms = signal<Rooms[]>([]);
  schedules = signal<Schedule[]>([]);
  hasAutoScrolled = false;
  Teachers=signal<Teachers[]>([])
  loading = signal(true);
$event: any;
constructor(private api:ApisService){
  this.fetchRooms() 
   this.fetchTeachers()

  this.fetchGroups()
  this.fetchSchedules()
  effect(() => {
    if (
      this.rooms().length &&
      this.schedules().length &&
      !this.loading() &&
      !this.hasAutoScrolled
    ) {
      queueMicrotask(() => this.scrollToToday());
      this.hasAutoScrolled = true;
    }
  });
  
}
fetchTeachers(){
  this.loading.set(true)
  this.api.getTeachers().subscribe({
    next: (data:any[])=>{
const mappedTeachers = data.map((row: any[]) => ({
        Id: Number(row[0]),
        First_Name: String(row[1] ?? ''),
        Last_Name:String(row[2])
        
      }));
      this.Teachers.set(mappedTeachers)
      console.log(this.Teachers())
      this.loading.set(false);

      // --- الجزء الجديد: جلب الأعداد الفعلية ---
     
    },
    error: (err) => {
      console.error('خطأ في جلب المجموعات:', err);
      this.loading.set(false);
    }
  });    }


groups = signal<Group[]>([]); // لا تنس جلب البيانات من API

getGroupName(groupId: number): string {
  const group = this.groups().find(g => g.Id === groupId);
  return group ? group.Name : 'غير معروف';
}

getRoomName(roomId: number): string {
  const room = this.rooms().find(r => r.Id === roomId);
  return room ? room.Name : 'غير معروف';
}
originalSchedules: Schedule[] = [];

fetchSchedules() {
  this.loading.set(true);
  this.api.getSchedules().subscribe({
    next: (data: any[]) => {
      const now = dayjs(); 
      const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const today = daysOfWeek[now.day()]; 

      this.schedules.set(
        data.map(item => {
          const start = dayjs(item.START_TIME);
          const end = dayjs(item.END_TIME);
          const startComparison = dayjs().hour(start.hour()).minute(start.minute()).second(0);
          const endComparison = dayjs().hour(end.hour()).minute(end.minute()).second(0);
          const isDayMatch = item.DAY === today;
          const isTimeMatch = now.isAfter(startComparison) && now.isBefore(endComparison);
          const is_active = isDayMatch && isTimeMatch;
          const start_time_str = start.format('HH:mm');
          const end_time_str = end.format('HH:mm');
          return {
         schedule_id: item.SCHEDULE_ID,
      group_id: Number(item.GROUP_ID),     // ✅ مهم
      room_id: Number(item.ROOM_ID),       // ✅ مهم
      group_name: item.GROUP_NAME,
      room_name: item.ROOM_NAME,
      class_date: item.CLASS_DATE?.toString(),
      start_time: start.format('HH:mm'),
      end_time: end.format('HH:mm'),
      days: item.DAY,
      teacher: item.TEACHER,
      is_active: is_active ? 1 : 0,
      _state: 'clean'
    } as Schedule;
        })
      );
      this.originalSchedules = JSON.parse(JSON.stringify(this.schedules())); // clone deep

      this.loading.set(false);
    },
    error: (err) => {
      console.error('خطأ في جلب المواعيد:', err);
      this.loading.set(false);
    }
  });
}
fetchGroups() {
  this.loading.set(true);
  this.api.getGroups().subscribe({
    next: (data: any[]) => {
      
      const mappedGroups = data.map((row: any[]) => ({
        Id: Number(row[0]),
        Name: String(row[1] ?? ''),
        Teacher:String(row[3])
        
      }));
      this.groups.set(mappedGroups)
      console.log(this.groups())
      this.loading.set(false);

      // --- الجزء الجديد: جلب الأعداد الفعلية ---
     
    },
    error: (err) => {
      console.error('خطأ في جلب المجموعات:', err);
      this.loading.set(false);
    }
  });
}
fetchRooms() {
  this.loading.set(true);
this.api.getRooms().subscribe({
  next: (data: any[]) => {
    this.rooms.set(
      data.map(item => ({
        Id: item[0],
        Name: item[1],
        Capacity: item[2],
        Is_Active: item[3],
        Note: item[4]
      }))
    );
    this.loading.set(false);
  },
  error: (err) => {
    console.error('خطأ في جلب القاعات:', err);
    this.loading.set(false);
  }
});
}


 

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  isTransitioning = false;
  isScrolling = false;


  getSchedule(room: string, slot: string): Schedule | undefined {
    return this.scheduleMap().get(`${room}|${slot}`);
  }

schedulesByDay = computed(() => {
  const map: Record<string, Schedule[]> = {};
  for (const day of this.days) {
    map[day] = this.schedules().filter(s => s.days === day);
  }
  return map;
});

timeSlots = computed(() => {
  const slots = [];
  for (let hour = 8; hour < 19; hour++) {
    const start24 = `${hour.toString().padStart(2, '0')}:00`;
    
    const periodStart = hour >= 12 ? 'م' : 'ص';
    const displayHourStart = hour > 12 ? hour - 12 : hour;
    
    const endHour = hour + 1;
    const periodEnd = endHour >= 12 ? 'م' : 'ص';
    const displayHourEnd = endHour > 12 ? endHour - 12 : endHour;

    slots.push({
      searchKey: start24, 
      displayLabel: `${displayHourStart} ${periodStart} - ${displayHourEnd} ${periodEnd}`
    });
  }
  return slots;
});

getSched(day: string, room: string, searchKey: string) {
  return this.scheduleMap().get(`${day}|${room}|${searchKey}`);
}

scheduleMap = computed(() => {
  const map = new Map<string, any>();
  this.schedules().forEach(s => {
    const key = `${s.days}|${s.room_name}|${s.start_time}`;
    map.set(key, s);
  });
  return map;
});

// دالة الجلب المعدلة
// متغيرات للتحكم في السحب
isDown = false;
startX: any;
scrollLeft: any;

// يجب استدعاء هذه الدالة في ngAfterViewInit لضبط البداية على "السبت" الأصلي
initialScroll() {
  const container = this.scrollContainer.nativeElement;
  const dayHeader = container.querySelector('th[colspan="6"]') as HTMLElement;
  if (dayHeader) {
    container.scrollLeft = -dayHeader.offsetWidth; // التحرك لليسار بمقدار يوم واحد (تخطي الجمعة المكرر)
  }
}

currentIndex = 1; // نبدأ من السبت الأصلي
// القاعات التي إذا حجزت إحداها، تتأثر الأخرى
 ROOM_CONFLICTS: Record<string, string[]> = {
  'قاعة 2': ['قاعة 2+1'],
  'قاعة 1': ['قاعة 2+1'],
  'قاعة 2+1': ['قاعة 2', 'قاعة 1']
};
isRoomOccupied(day: string, roomName: string, startTime: string): boolean {
  // 1. جلب القاعات المتعارضة مع القاعة المطلوبة
  const conflicts = this.ROOM_CONFLICTS[roomName] || [];
  const relatedRooms = [roomName, ...conflicts];

  // 2. البحث في مصفوفة المواعيد الحالية
  return this.schedules().some(s => 
    s.days === day && 
    s.start_time === startTime && 
    relatedRooms.includes(s.room_name) &&
    s._state !== 'deleted' // لا نحسب المواعيد التي تم حذفها
  );
}
// دالة لفحص هل المجموعة محجوزة في مكان آخر بنفس الوقت
isGroupOccupied(day: string, startTime: string, groupId: number, currentRoomName: string): boolean {
  if (!groupId) return false;

  return this.schedules().some(s => 
    s.days === day && 
    s.start_time === startTime && 
    s.group_id === groupId && 
    s.room_name !== currentRoomName && 
    s._state !== 'deleted'
  ) || this.originalSchedules.some(s => 
    s.days === day && 
    s.start_time === startTime && 
    s.group_id === groupId && 
    s.room_name !== currentRoomName && 
    s._state !== 'deleted'
  )

}
scroll(direction: number) {
  if (this.isScrolling) return;

  const container = this.scrollContainer.nativeElement;
  const dayHeader = container.querySelector('th[colspan="6"]') as HTMLElement;
  if (!dayHeader) return;

  const dayWidth = dayHeader.offsetWidth;
  this.isScrolling = true;

  // 1. تحديث الـ Index بناءً على الاتجاه (direction: -1 لليمين، 1 لليسار)
  this.currentIndex += direction;

  // 2. تنفيذ الحركة العادية
  container.style.scrollBehavior = 'smooth';
  container.scrollLeft = - (this.currentIndex * dayWidth);

  // 3. التحقق من القفزة "أثناء" أو "بعد" الحركة مباشرة
  setTimeout(() => {
    // إذا وصلنا للسبت المكرر (Index 8) -> اذهب للسبت الأصلي (Index 1)
    if (this.currentIndex === 8) {
      this.jumpTo(1, container, dayWidth);
    } 
    // إذا وصلنا للجمعة المكرر (Index 0) -> اذهب للجمعة الأصلي (Index 7)
    else if (this.currentIndex === 0) {
      this.jumpTo(7, container, dayWidth);
    } else {
      this.isScrolling = false;
    }
  }, 500); // وقت الانيميشن
}

// دالة القفزة السرية
private jumpTo(index: number, container: HTMLElement, dayWidth: number) {
  container.style.scrollBehavior = 'auto'; // إلغاء الأنميشن فوراً
  this.currentIndex = index;
  container.scrollLeft = - (index * dayWidth);
  
  // إعادة السماح بالضغط بعد القفزة مباشرة
  setTimeout(() => {
    container.style.scrollBehavior = 'smooth';
    this.isScrolling = false;
  }, 50);
}
  ngAfterViewInit() {
    const container = this.scrollContainer.nativeElement;

    let startX = 0;
    let currentX = 0;

    /* منع تضارب scroll */
    container.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    /* سحب بالماوس */
    container.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, select')) return;
      startX = e.pageX;
      this.isDown = true;
      container.style.scrollBehavior = 'smooth';
    });

    container.addEventListener('mouseup', (e: MouseEvent) => {
      if (!this.isDown) return;
      this.isDown = false;
      currentX = e.pageX;

      const diff = startX - currentX;
      const threshold = 20;

      if (Math.abs(diff) > threshold) {
        diff > 0 ? this.scroll(-1) : this.scroll(1);
      }
    });

    container.addEventListener('mouseleave', () => {
      this.isDown = false;
    });

}
scrollToToday() {
  const container = this.scrollContainer.nativeElement;
  const jsDayToRelativeIndex: Record<number, number> = {
    0: 2, // الأحد -> Index 2
    1: 3, // الاثنين -> Index 3
    2: 4, // الثلاثاء -> Index 4
    3: 5, // الأربعاء -> Index 5
    4: 6, // الخميس -> Index 6
    5: 7, // الجمعة (الأصلية) -> Index 7
    6: 1  // السبت (الأصلية) -> Index 1
  };

  const todayIndex = jsDayToRelativeIndex[new Date().getDay()];
  
  // تحديث الـ currentIndex العالمي فوراً ليتزامن مع السكرول
  this.currentIndex = todayIndex;

  const dayHeader = container.querySelector('th[colspan="6"]') as HTMLElement;
  if (!dayHeader) return;
  const dayWidth = dayHeader.offsetWidth;

  container.scrollTo({
    left: -(this.currentIndex * dayWidth),
    behavior: 'smooth'
  });
}

isEditMode=signal(false)
enableEdit(day?: string, roomId?: any, slotKey?: string) {
  this.isEditMode.set(true);
  
  // إذا تم تمرير بيانات الخلية، نجعلها هي الخلية النشطة فوراً
  if (day && roomId && slotKey) {
    this.activeCell = { day, roomId, slotKey };
  }
}
cancelEdit() {
  this.isEditMode.set(false);
  // إعادة الجدول للحالة الأصلية
  this.schedules.set(
    JSON.parse(JSON.stringify(this.originalSchedules)).map((s: any) => ({
      ...s,
      _state: 'clean'
    }))
  );
    this.activeCell = null;
}

saveChanges() {
  const changedSchedules = this.schedules()
    .filter(s => s._state === 'new' || s._state === 'updated' || s._state === 'deleted');

  if (!changedSchedules.length) {
    this.isEditMode.set(false);
    return;
  }

  this.loading.set(true);
  this.api.saveScheduleChanges(changedSchedules).subscribe({
    next: (res) => {
      // تحديث المصفوفة: نحذف العناصر التي كانت 'deleted' ونحول الباقي لـ 'clean'
      this.schedules.update(arr => 
        arr.filter(s => s._state !== 'deleted')
           .map(s => ({ ...s, _state: 'clean' }))
      );

      this.originalSchedules = JSON.parse(JSON.stringify(this.schedules()));
      this.isEditMode.set(false);
      this.loading.set(false);

      setTimeout(() => {
        this.scrollToToday();
      }, 100);
    },
    error: (err) => {
      console.error('Error saving schedules:', err);
      alert('حدث خطأ أثناء حفظ التغييرات.');
      this.loading.set(false);
    }
  });
}
activeCell: { day: string, roomId: any, slotKey: string } | null = null;
editThisCill(day: string, time: { searchKey: string }, groupId: string) {
  if (!this.activeCell || !groupId || groupId === 'null') {
    this.activeCell = null;
    return;
  }

  const roomId = this.activeCell.roomId;
  const startTime = time.searchKey;
  const roomName = this.getRoomName(roomId);

  // 1. فحص تعارض المجموعة قبل أي تعديل
  if (this.isGroupOccupied(day, startTime, +groupId, roomName)) {
    alert('تنبيه: هذه المجموعة محجوزة بالفعل في قاعة أخرى في نفس هذا الوقت!');
    this.activeCell = null; // نغلق وضع التعديل للخلية دون تغيير البيانات
    return;
  }

  const endTime = this.calcEndTime(startTime);
  const group = this.groups().find(g => g.Id === +groupId);
  const teacherId = group?.Teacher;
  const findTeacher = this.Teachers().find(t => t.Id.toString() === teacherId?.toString());
  const teacherFullName = findTeacher ? `${findTeacher.First_Name} ${findTeacher.Last_Name}` : 'غير معروف';

  this.schedules.update((arr: Schedule[]) => {
    const index = arr.findIndex(s =>
      s.days === day &&
      s.room_name === roomName &&
      s.start_time === startTime
    );

    if (index !== -1) {
      // UPDATE
      return arr.map((s, i) =>
        i === index
          ? {
              ...s,
              group_id: +groupId,
              group_name: this.getGroupName(+groupId),
              teacher: teacherFullName,
              room_id: roomId,
              _state: s._state === 'new' ? 'new' : 'updated'
            }
          : s
      );
    }

    // INSERT
    return [
      ...arr,
      {
        schedule_id: 0,
        group_id: +groupId,
        group_name: this.getGroupName(+groupId),
        room_id: roomId,
        room_name: roomName,
        start_time: startTime,
        end_time: endTime,
        days: day,
        teacher: teacherFullName,
        is_active: 0,
        _state: 'new'
      } as Schedule
    ];
  });

  this.activeCell = null;
}
deleteSchedule(day: string, roomName: string, startTime: string) {
  this.schedules.update(arr => {
    return arr.map(s => {
      if (s.days === day && s.room_name === roomName && s.start_time === startTime) {
        // إذا كان الموعد جديداً (لم يحفظ بعد في الداتابيز)، نحذفه نهائياً
        if (s._state === 'new') {
          return null; 
        }
        // إذا كان موجوداً مسبقاً، نغير حالته إلى "محذوف" لإرساله للباكيند
        return { ...s, _state: 'deleted' };
      }
      return s;
    }).filter(s => s !== null) as Schedule[];
  });
}

// دالة لتحديد الخلية عند الضغط عليها
selectCellForEdit(day: string, roomId: any, slotKey: string) {
  if (this.isEditMode()) {
    this.activeCell = { day, roomId, slotKey };
  }
}
calcEndTime(startTime: string) {
  const [hour, minute] = startTime.split(':').map(Number);
  let endHour = hour + 1; // افتراض ساعة واحدة لكل حصة
  if (endHour >= 24) endHour -= 24; // تجنب تجاوز 24
  return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
currentDay = signal(this.days[0]);

scrollDay(dir: number) {
  const index = this.days.indexOf(this.currentDay());
  const next = index + dir;

  if (next >= 0 && next < this.days.length) {
    this.currentDay.set(this.days[next]);
  }
}

expandedSlots = signal<Record<string, boolean>>({});

toggleSlot(slotKey: string) {
  this.expandedSlots.update(s => ({
    ...s,
    [slotKey]: !s[slotKey]
  }));
}

isExpanded(slotKey: string) {
  return !!this.expandedSlots()[slotKey];
}

}