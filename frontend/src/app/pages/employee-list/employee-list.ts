import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GraphqlApiService } from '../../core/graphql-api';
import { SessionService } from '../../core/session';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  profilePicture?: string;
};

type EmployeesQueryResponse = {
  employees: Employee[];
};

@Component({
  selector: 'app-employee-list',
  imports: [],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList implements OnInit {
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly graphqlApiService = inject(GraphqlApiService);

  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');

  async ngOnInit(): Promise<void> {
    await this.fetchEmployees();
  }

  async fetchEmployees(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');

    try {
      const data = await this.graphqlApiService.request<EmployeesQueryResponse>(
        `
          query Employees {
            employees {
              id
              firstName
              lastName
              email
              department
              position
              profilePicture
            }
          }
        `,
        {},
        true,
      );

      this.employees.set(data.employees);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Unable to load employees');
      if ((error instanceof Error && error.message === 'Unauthorized') || !this.sessionService.getToken()) {
        this.sessionService.clearToken();
        await this.router.navigate(['/login']);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.sessionService.clearToken();
    await this.router.navigate(['/login']);
  }
}
