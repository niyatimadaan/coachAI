// Sign-Up Form Types

export interface SignUpFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface SignUpFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}
