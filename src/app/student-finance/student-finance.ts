import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';
import { Component, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StudentGroupFees {
  Group_Id: number;
  Group_Name: string;
  Fee_Month: number;
  Fee_Year: number;
  Is_Paid: number;
  Amount_Paid: number;
}
interface CashTransaction {
  createdAt: string;
  studentName: string;
  groupName: string;
  amount: number;
  paidMonth: string;   // ✅ شهر الدفع
}

type CashReportMode = 'daily' | 'monthly' | 'yearly';



@Component({
  selector: 'app-student-finance',
  imports: [FormsModule,CommonModule],
  templateUrl: './student-finance.html',
  styleUrl: './student-finance.css',
})
export class StudentFinance implements OnInit{
  
      fees = signal<StudentGroupFees[]>([]);
      loading = signal(false);
      saving=signal(false)
      studentId = 1;
      year = signal(2026);
      savingPayment = signal<{ groupId: number, month: number } | null>(null);
      today = signal(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD

  studentName = signal('');

  months = [
    { id: 1, name: 'يناير' },
    { id: 2, name: 'فبراير' },
    { id: 3, name: 'مارس' },
    { id: 4, name: 'أبريل' },
    { id: 5, name: 'مايو' },
    { id: 6, name: 'يونيو' },
    { id: 7, name: 'يوليو' },
    { id: 8, name: 'أغسطس' },
    { id: 9, name: 'سبتمبر' },
    { id: 10, name: 'أكتوبر' },
    { id: 11, name: 'نوفمبر' },
    { id: 12, name: 'ديسمبر' },
  ];

  ngOnInit() {
  
  }
  

  groups = computed(() => {
    const map = new Map<number, any>();
  
    for (const f of this.fees()) {
      if (!map.has(f.Group_Id)) {
        map.set(f.Group_Id, {
          groupId: f.Group_Id,
          groupName: f.Group_Name,
          payments: {} 
        });
      }
  
      if (f.Fee_Month) {
        map.get(f.Group_Id).payments[f.Fee_Month] = {
          Is_Paid: f.Is_Paid ?? 0,
          Amount_Paid: f.Amount_Paid ?? 0
        };
      }
    }
  
    for (const g of map.values()) {
      for (const m of this.months) {
        if (!g.payments[m.id]) {
          g.payments[m.id] = { Is_Paid: 0, Amount_Paid: 0 };
        }
      }
    }
  
    return Array.from(map.values());
  });
  

  totalPaid = computed(() =>
    this.fees().reduce((sum, f) => sum + (f.Is_Paid ? f.Amount_Paid : 0), 0)
  );

  

  cashLoading = signal(false);

      constructor(private api: ApisService) {
       
        effect(() => {
          this.reportMode();
          this.fetchCashReport();
        });
        
        this.api.paymentAdded$.subscribe(payment => {
          this.injectPaymentIntoReport(payment);
        });
      }
   
      
      fetchStudentFees() {
        this.loading.set(true);
      
        this.api.getStudentFinance(this.studentId, this.year()).subscribe({
          next: (data: any[]) => {
            this.fees.set(
              data.map(item => ({
                Group_Id: item[0],
                Group_Name: item[1],
                Fee_Month: item[2],
                Fee_Year: item[3],
                Is_Paid: item[4],
                Amount_Paid: item[5],
              }))
            );
      
            console.log(this.fees());
            this.loading.set(false);
          },
          error: (err:any) => {
            console.error('خطأ في جلب الرسوم:', err);
            this.loading.set(false);
          }
        });
      }
      
      searchName: string = '';

searchStudent() {
  if (!this.searchName.trim()) {
    alert('من فضلك أدخل اسم الطالب');

    return;
  }

  this.loading.set(true);

  this.api.searchStudentByName(this.searchName).subscribe({
    next: (data: any) => {
      if (data.length === 0) {
        alert('لا يوجد طالب بهذا الاسم');
        this.loading.set(false);

      } else {
        const student = data[0];
        this.studentId = student.id;
        this.studentName.set(student.name);
        this.loading.set(false);

        this.fetchStudentFees();
      }
    },
    error: (err: any) => {
      console.error('خطأ في البحث عن الطالب:', err);
      this.loading.set(false);
    }
  });
}


activePayment: { groupId: number, month: number } | null = null;

enableEditPayment(groupId: number, month: number) {
  this.activePayment = { groupId, month };
}
savePayment(amount: number) {
  if (!this.activePayment) return;

  const { groupId, month } = this.activePayment;

  const createdAt = this.getLocalDateTime();

  this.savingPayment.set({ groupId, month });
  this.saving.set(true);

  // 🔹 نسخة من الرسوم الحالية
  const feesCopy = [...this.fees()];

  // 🔹 تحقق إذا كانت الدفعة موجودة
  const idx = feesCopy.findIndex(f => f.Group_Id === groupId && f.Fee_Month === month);

  if (idx !== -1) {
    // تحديث الدفعة
    feesCopy[idx].Amount_Paid = amount;
    feesCopy[idx].Is_Paid = amount > 0 ? 1 : 0;
  } else {
    // إضافة دفعة جديدة
    const group = this.groups().find(g => g.groupId === groupId);
    feesCopy.push({
      Group_Id: groupId,
      Group_Name: group?.groupName ?? `مجموعة ${groupId}`,
      Fee_Month: month,
      Fee_Year: this.year(),
      Is_Paid: amount > 0 ? 1 : 0,
      Amount_Paid: amount
    });
  }

  // 🔹 تحديث الرسوم في الواجهة فورًا
  this.fees.set(feesCopy);

  // 🔹 إرسال البيانات للسيرفر
  this.api.updateStudentPayment(
    this.studentId,
    this.year(),
    groupId,
    month,
    amount,
    amount > 0 ? 1 : 0,
    createdAt
  ).subscribe({
    next: () => {
      const monthName =
        this.months.find(m => m.id === month)?.name ?? '';

      const transaction = {
        createdAt,
        studentName: this.studentName(),
        groupName: this.groups().find(g => g.groupId === groupId)?.groupName ?? '',
        amount,
        paidMonth: monthName
      };

      this.injectPaymentIntoReport(transaction);

      this.saving.set(false);
      this.savingPayment.set(null);
    },
    error: (err) => {
      console.error('خطأ أثناء حفظ الدفعة في الباك إند', err);
      alert('حدث خطأ أثناء حفظ الدفعة!');
      this.saving.set(false);
      this.savingPayment.set(null);
    }
  });

  this.activePayment = null;
}



getLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

isSaving(g: any, m: any) {
  return this.savingPayment()?.groupId === g.groupId && this.savingPayment()?.month === m.id;
}
reportMode = signal<CashReportMode>('daily');

selectedMonth = signal(new Date().getMonth() + 1); // افتراضي الشهر الحالي
selectedDay = signal(new Date().getDate());
monthlyReport = computed(() => {
  return this.fees().filter(f =>
    f.Fee_Year === this.year() &&
    f.Fee_Month === this.selectedMonth() &&
    f.Is_Paid === 1
  );
});
yearlyReport = computed(() => {
  return this.fees().filter(f =>
    f.Fee_Year === this.year() &&
    f.Is_Paid === 1
  );
});
cashTransactions = signal<CashTransaction[]>([]);
getDateKey(date: Date, mode: CashReportMode): string {
  if (mode === 'daily') {
    return date.toISOString().slice(0, 10); // 2026-01-26
  }

  if (mode === 'monthly') {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }

  return `${date.getFullYear()}`; // yearly
}
cashReport = computed(() => {
  const map = new Map<string, {
    period: string;
    total: number;
    count: number;
    transactions: CashTransaction[];
  }>();

  for (const t of this.cashTransactions()) {
    const date = new Date(t.createdAt.replace(' ', 'T'));
    let key: string;

    if (this.reportMode() === 'yearly') {
      key = this.months[date.getMonth()].name; // اسم الشهر
    } else {
      key = this.getDateKey(date, this.reportMode());
    }

    if (!map.has(key)) {
      map.set(key, {
        period: key,
        total: 0,
        count: 0,
        transactions: []
      });
    }

    const item = map.get(key)!;
    item.total += t.amount;
    item.count++;
    item.transactions.push(t);
  }

  // ترتيب الأشهر في التقرير السنوي
  if (this.reportMode() === 'yearly') {
    return Array.from(map.values()).sort((a, b) => {
      const idxA = this.months.findIndex(m => m.name === a.period);
      const idxB = this.months.findIndex(m => m.name === b.period);
      return idxB - idxA;
    });
  }

  return Array.from(map.values());
});

fetchCashReport() {
  this.cashLoading.set(true);

  const mode = this.reportMode();

  let obs;

  if (mode === 'daily') {
    obs = this.api.getCashReport('daily', {
      day: this.today()
    });
  }

  if (mode === 'monthly') {
    obs = this.api.getCashReport('monthly', {
      year: this.year(),
      month: this.selectedMonth()
    });
  }

  if (mode === 'yearly') {
    obs = this.api.getCashReport('yearly', {
      year: this.year()
    });
  }

  obs?.subscribe({
    next: data => this.cashTransactions.set(data),
    complete: () => this.cashLoading.set(false),
    error: () => this.cashLoading.set(false)
  });
}

injectPaymentIntoReport(payment: CashTransaction) {
  const dateKey = new Date(payment.createdAt)
    .toLocaleDateString('en-CA');

  if (this.reportMode() === 'daily') {
    if (dateKey !== this.today()) return;
  }

  this.cashTransactions.update(list => [payment, ...list]);
}

}