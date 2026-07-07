import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApisService } from '../apis-service';

interface ServiceItem {
  serviceId: number;
  serviceName: string;
  description: string;
  price: number;
  estimatedDuration: number;
  startWork: string;
  endWork: string;
  serviceProviderId: string;
  providerName: string;
  cityName: string;
  categoryName: string;
  imagePath: string;
}

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './services-page.html',
  styleUrl: './services-page.css',
})
export class ServicesPage implements OnInit {
  services = signal<ServiceItem[]>([]);
  loading = signal(true);
  pageNumber = signal(1);
  pageSize = 9;
  hasMore = signal(false);
  categories = signal<string[]>([]);
  selectedCategory = signal<string | null>(null);

  filteredServices = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return this.services();
    return this.services().filter(s => s.categoryName === cat);
  });

  constructor(private api: ApisService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.loadServices();
  }

  loadServices() {
    this.loading.set(true);
    this.api.getServicesWithPagination(this.pageNumber(), this.pageSize).subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.services.set(res.data);
          this.hasMore.set(res.data.length >= this.pageSize);
          const cats = [...new Set<string>(res.data.map((s: ServiceItem) => s.categoryName))];
          this.categories.set(cats);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  goToPage(page: number) {
    if (page < 1) return;
    this.pageNumber.set(page);
    this.loadServices();
    window.scrollTo(0, 0);
  }

  filterByCategory(category: string | null) {
    this.selectedCategory.set(category);
    this.pageNumber.set(1);
    this.loadServices();
  }
}
