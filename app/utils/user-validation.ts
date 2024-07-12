import { z } from 'zod'

export const EmailSchema = z.string().email()

export const UserNameSchema = z
    .string({
        required_error: 'Username is required',
    })
    .min(3, {message: 'Username must be at least 3 characters long'})
    .max(20, {message: 'Username must be at most 20 characters long'})
    .regex(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only include letters, numbers, and underscores',
	})
    .transform((value) => value.toLowerCase())

export const PasswordSchema = z
    .string({
        required_error: 'Password is required',
    })
    .min(6, {message: 'Password must be at least 6 characters long'})
    .max(20, {message: 'Password must be at most 20 characters long'})