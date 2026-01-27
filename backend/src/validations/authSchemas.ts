import { z } from 'zod';

// Função helper para validar senha forte
const strongPasswordSchema = z
  .string()
  .min(12, 'Senha deve ter pelo menos 12 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um símbolo');

// Schema para signup
export const signupSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
  password: strongPasswordSchema,
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo')
    .optional(),
}).strict(); // .strict() garante que campos extras sejam rejeitados

// Schema para login
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .max(100, 'Senha muito longa'),
}).strict();

// Schema para verificação de 2FA no login
export const verifyLoginTwoFactorSchema = z.object({
  userId: z
    .string()
    .uuid('ID de usuário inválido')
    .min(1, 'ID de usuário é obrigatório'),
  twoFactorCode: z
    .string()
    .length(6, 'Código 2FA deve ter exatamente 6 dígitos')
    .regex(/^\d+$/, 'Código 2FA deve conter apenas números'),
}).strict();

// Schema para solicitar redefinição de senha
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
}).strict();

// Schema para redefinir senha
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Token é obrigatório')
    .max(255, 'Token inválido'),
  newPassword: strongPasswordSchema,
}).strict();

// Schema para alterar senha
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória')
    .max(100, 'Senha muito longa'),
  newPassword: strongPasswordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).strict()
.refine((data) => data.newPassword === data.confirmPassword, {
  message: 'A nova senha e a confirmação não coincidem',
  path: ['confirmPassword'],
});

// Tipos TypeScript inferidos dos schemas
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyLoginTwoFactorInput = z.infer<typeof verifyLoginTwoFactorSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
