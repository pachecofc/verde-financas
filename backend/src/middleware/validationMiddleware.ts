import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Middleware genérico de validação usando Zod
 * Valida o req.body contra um schema Zod fornecido
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valida e transforma o body, removendo campos extras
      const validatedData = schema.parse(req.body);
      
      // Substitui req.body pelos dados validados
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formata erros do Zod de forma amigável
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Se houver apenas um erro, usar a mensagem específica como erro principal
        // Se houver múltiplos erros, usar mensagem genérica e incluir detalhes
        const errorMessage = errors.length === 1 
          ? errors[0].message 
          : 'Dados de entrada inválidos';

        return res.status(400).json({
          error: errorMessage,
          details: errors.length > 1 ? errors : undefined,
        });
      }

      // Erro inesperado - logar apenas o tipo de erro, sem expor dados sensíveis
      console.error('Erro de validação:', error instanceof Error ? error.message : 'Erro desconhecido');
      return res.status(500).json({
        error: 'Erro interno ao validar dados',
      });
    }
  };
}
