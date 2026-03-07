import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

type EmployeeQueryResponse = {
  employee: Employee | null;
};

type AddEmployeeMutationResponse = {
  addEmployee: Employee;
};

type UpdateEmployeeMutationResponse = {
  updateEmployee: Employee;
};

type DeleteEmployeeMutationResponse = {
  deleteEmployee: boolean;
};

type SearchEmployeesQueryResponse = {
  searchEmployees: Employee[];
};

@Component({
  selector: 'app-employee-list',
  imports: [ReactiveFormsModule, TitleCasePipe],
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
  readonly actionError = signal('');
  readonly isSubmitting = signal(false);
  readonly formVisible = signal(false);
  readonly formMode = signal<'add' | 'edit'>('add');
  readonly selectedEmployee = signal<Employee | null>(null);
  readonly formSubmitted = signal(false);
  readonly currentEditId = signal<string | null>(null);

  readonly searchForm = new FormGroup({
    department: new FormControl('', { nonNullable: true }),
    position: new FormControl('', { nonNullable: true }),
  });

  readonly employeeForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    department: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    position: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    profilePicture: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

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

  openAddForm(): void {
    this.formMode.set('add');
    this.currentEditId.set(null);
    this.formSubmitted.set(false);
    this.actionError.set('');
    this.employeeForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      position: '',
      profilePicture: '',
    });
    this.formVisible.set(true);
  }

  openEditForm(employee: Employee): void {
    this.formMode.set('edit');
    this.currentEditId.set(employee.id);
    this.formSubmitted.set(false);
    this.actionError.set('');
    this.employeeForm.setValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      profilePicture: employee.profilePicture || '',
    });
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formSubmitted.set(false);
    this.actionError.set('');
  }

  async saveEmployee(): Promise<void> {
    this.formSubmitted.set(true);
    this.actionError.set('');

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const input = {
      firstName: this.employeeForm.controls.firstName.value,
      lastName: this.employeeForm.controls.lastName.value,
      email: this.employeeForm.controls.email.value,
      department: this.employeeForm.controls.department.value,
      position: this.employeeForm.controls.position.value,
      profilePicture: this.employeeForm.controls.profilePicture.value,
    };

    try {
      if (this.formMode() === 'add') {
        await this.graphqlApiService.request<AddEmployeeMutationResponse>(
          `
            mutation AddEmployee($input: EmployeeInput!) {
              addEmployee(input: $input) {
                id
              }
            }
          `,
          { input },
          true,
        );
      } else {
        const editId = this.currentEditId();
        if (!editId) {
          throw new Error('Missing employee id');
        }

        await this.graphqlApiService.request<UpdateEmployeeMutationResponse>(
          `
            mutation UpdateEmployee($id: ID!, $input: EmployeeUpdateInput!) {
              updateEmployee(id: $id, input: $input) {
                id
              }
            }
          `,
          {
            id: editId,
            input,
          },
          true,
        );
      }

      await this.fetchEmployees();
      this.closeForm();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'Unable to save employee');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async viewEmployee(employeeId: string): Promise<void> {
    this.actionError.set('');

    try {
      const data = await this.graphqlApiService.request<EmployeeQueryResponse>(
        `
          query Employee($id: ID!) {
            employee(id: $id) {
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
        { id: employeeId },
        true,
      );

      if (!data.employee) {
        throw new Error('Employee not found');
      }

      this.selectedEmployee.set(data.employee);
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'Unable to load details');
    }
  }

  closeDetails(): void {
    this.selectedEmployee.set(null);
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    this.actionError.set('');

    const confirmed = window.confirm('Delete this employee?');
    if (!confirmed) {
      return;
    }

    try {
      await this.graphqlApiService.request<DeleteEmployeeMutationResponse>(
        `
          mutation DeleteEmployee($id: ID!) {
            deleteEmployee(id: $id)
          }
        `,
        { id: employeeId },
        true,
      );

      if (this.selectedEmployee()?.id === employeeId) {
        this.selectedEmployee.set(null);
      }

      await this.fetchEmployees();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'Unable to delete employee');
    }
  }

  async searchEmployees(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');

    try {
      const data = await this.graphqlApiService.request<SearchEmployeesQueryResponse>(
        `
          query SearchEmployees($department: String, $position: String) {
            searchEmployees(department: $department, position: $position) {
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
        {
          department: this.searchForm.controls.department.value || null,
          position: this.searchForm.controls.position.value || null,
        },
        true,
      );

      this.employees.set(data.searchEmployees);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Unable to search employees');
    } finally {
      this.loading.set(false);
    }
  }

  async clearSearch(): Promise<void> {
    this.searchForm.reset({ department: '', position: '' });
    await this.fetchEmployees();
  }

  async onProfilePictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const value = await this.fileToDataUrl(file);
    this.employeeForm.controls.profilePicture.setValue(value);
    this.employeeForm.controls.profilePicture.markAsTouched();
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(String(reader.result || ''));
      };
      reader.onerror = () => {
        reject(new Error('Unable to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  async logout(): Promise<void> {
    this.sessionService.clearToken();
    await this.router.navigate(['/login']);
  }
}
