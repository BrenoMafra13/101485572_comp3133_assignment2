import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GraphqlApiService } from '../../core/graphql-api';

type SignupMutationResponse = {
  signup: {
    id: string;
  };
};

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly router = inject(Router);
  private readonly graphqlApiService = inject(GraphqlApiService);
  readonly submitted = signal(false);
  readonly apiError = signal('');
  readonly isSubmitting = signal(false);

  readonly form = new FormGroup(
    {
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
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsMatchValidator },
  );

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.apiError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      await this.graphqlApiService.request<SignupMutationResponse>(
        `
          mutation Signup($input: SignupInput!) {
            signup(input: $input) {
              id
            }
          }
        `,
        {
          input: {
            firstName: this.form.controls.firstName.value,
            lastName: this.form.controls.lastName.value,
            email: this.form.controls.email.value,
            password: this.form.controls.password.value,
          },
        },
      );

      await this.router.navigate(['/login']);
    } catch (error) {
      this.apiError.set(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
