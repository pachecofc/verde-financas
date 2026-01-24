import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AccountService } from '../services/accountService';
import { AccountType } from '@prisma/client'; // Importar o enum AccountType

export class AccountController {
  // Criar uma nova conta
  static async createAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, balance, currency, type, bankName, color } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      if (!name || balance === undefined || !type) {
        return res.status(400).json({ error: 'Nome, saldo e tipo da conta são obrigatórios.' });
      }
      if (!Object.values(AccountType).includes(type)) {
        return res.status(400).json({ error: `Tipo de conta inválido. Tipos permitidos: ${Object.values(AccountType).join(', ')}` });
      }

      const newAccount = await AccountService.createAccount(userId, {
        name,
        balance,
        currency,
        type,
        bankName,
        color,
      });

      res.status(201).json(newAccount);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao criar conta.',
      });
    }
  }

  // Obter todas as contas do usuário
  static async getAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const accounts = await AccountService.getAccountsByUserId(userId);
      res.status(200).json(accounts);
    } catch (error) {
      console.error('Erro ao obter contas:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao obter contas.',
      });
    }
  }

  // Obter uma única conta por ID
  static async getAccountById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const account = await AccountService.getAccountById(id, userId);
      res.status(200).json(account);
    } catch (error) {
      console.error('Erro ao obter conta por ID:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Conta não encontrada.',
      });
    }
  }

  // Atualizar uma conta existente
  static async updateAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, balance, currency, type, bankName, color } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      if (type && !Object.values(AccountType).includes(type)) {
        return res.status(400).json({ error: `Tipo de conta inválido. Tipos permitidos: ${Object.values(AccountType).join(', ')}` });
      }

      const updatedAccount = await AccountService.updateAccount(userId, id, {
        name,
        balance,
        currency,
        type,
        bankName,
        color,
      });

      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      // Retorna 404 se a conta não for encontrada ou não pertencer ao usuário
      if (error instanceof Error && error.message.includes('Conta não encontrada ou não pertence ao usuário')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao atualizar conta.',
      });
    }
  }

  // Excluir conta
  static async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const forceDeleteTransactions = req.query.force === 'true'; // Parâmetro de query para forçar exclusão

      const result = await AccountService.deleteAccount(userId, id, forceDeleteTransactions);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      // Retorna 409 Conflict se houver transações e não for forçado
      if (error instanceof Error && error.message.includes('transações associadas')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Falha ao excluir conta.' });
    }
  }
}
