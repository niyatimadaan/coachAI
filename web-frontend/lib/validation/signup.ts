/**
 * Sign-up form validation
 * Validates user registration form inputs according to requirements 2.1-2.13
 */

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

/**
 * Validates sign-up form data
 * 
 * @param data - The form data to validate
 * @returns An object containing error messages for invalid fields, or empty object if all valid
 * 
 * Preconditions:
 * - data object is defined and contains all required fields
 * - data.name, data.email, data.password, data.confirmPassword are strings
 * 
 * Postconditions:
 * - Returns empty object {} if all validations pass
 * - Returns object with error messages for each invalid field
 * - Does not mutate input data
 * - All error messages are user-friendly strings
 */
export function validateSignUpForm(data: SignUpFormData): SignUpFormErrors {
  const errors: SignUpFormErrors = {}
  
  // Validate name (Requirements 2.1, 2.2, 2.3)
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Name is required'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  } else if (data.name.length > 100) {
    errors.name = 'Name must not exceed 100 characters'
  }
  
  // Validate email (Requirements 2.4, 2.5, 2.6)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.email || data.email.trim().length === 0) {
    errors.email = 'Email is required'
  } else if (!emailRegex.test(data.email)) {
    errors.email = 'Please enter a valid email address'
  } else if (data.email.length > 255) {
    errors.email = 'Email must not exceed 255 characters'
  }
  
  // Validate password (Requirements 2.7, 2.8, 2.9, 2.10, 2.11)
  if (!data.password || data.password.length === 0) {
    errors.password = 'Password is required'
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = 'Password must contain at least one uppercase letter'
  } else if (!/[a-z]/.test(data.password)) {
    errors.password = 'Password must contain at least one lowercase letter'
  } else if (!/[0-9]/.test(data.password)) {
    errors.password = 'Password must contain at least one number'
  }
  
  // Validate confirm password (Requirements 2.12, 2.13)
  if (!data.confirmPassword || data.confirmPassword.length === 0) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  return errors
}
