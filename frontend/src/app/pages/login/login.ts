import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GraphqlApiService } from '../../core/graphql-api';
import { SessionService } from '../../core/session';

type LoginMutationResponse = {
  login: {
    token: string;
  };
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly graphqlApiService = inject(GraphqlApiService);

  readonly submitted = signal(false);
  readonly apiError = signal('');
  readonly isSubmitting = signal(false);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.apiError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const data = await this.graphqlApiService.request<LoginMutationResponse>(
        `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              token
            }
          }
        `,
        {
          input: {
            email: this.form.controls.email.value,
            password: this.form.controls.password.value,
          },
        },
      );

      this.sessionService.setToken(data.login.token);
      await this.router.navigate(['/employees']);
    } catch (error) {
      this.apiError.set(error instanceof Error ? error.message : 'Unable to login');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
