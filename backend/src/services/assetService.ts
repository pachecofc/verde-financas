import { prisma } from '../prisma';
import { GamificationService } from './gamificationService';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';

export class AssetService {
  // Listar todos os ativos do usuário
  static async getAssetsByUserId(userId: string) {
    const assets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return assets.map((a) => ({ ...a, name: decrypt(userId, a.name) ?? a.name }));
  }

  static async getAssetById(userId: string, assetId: string) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      throw new Error('Ativo não encontrado ou não pertence ao usuário.');
    }

    return { ...asset, name: decrypt(userId, asset.name) ?? asset.name };
  }

  // Criar novo ativo
  static async createAsset(
    userId: string,
    data: {
      name: string;
      incomeType: 'fixed' | 'variable';
      color?: string | null;
    }
  ) {
    const { name, incomeType, color } = data;

    // Validações básicas
    if (!name || !incomeType) {
      throw new Error('name e incomeType são obrigatórios.');
    }

    if (incomeType !== 'fixed' && incomeType !== 'variable') {
      throw new Error('incomeType deve ser "fixed" ou "variable".');
    }

    const assetCount = await prisma.asset.count({ where: { userId } });
    const encryptedName = encrypt(userId, name) ?? name;
    const newAsset = await prisma.asset.create({
      data: {
        name: encryptedName,
        incomeType,
        color: color || null,
        userId,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ASSET_CREATE',
      resourceType: 'assets',
      resourceId: newAsset.id,
    });

    if (assetCount === 0) {
      await GamificationService.registerEvent(userId, 'FIRST_ASSET').catch(() => {});
    }
    return { ...newAsset, name: decrypt(userId, newAsset.name) ?? newAsset.name };
  }

  // Atualizar ativo existente
  static async updateAsset(
    userId: string,
    assetId: string,
    data: {
      name?: string;
      incomeType?: 'fixed' | 'variable';
      color?: string | null;
    }
  ) {
    // Verificar se o ativo existe e pertence ao usuário
    const existingAsset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!existingAsset) {
      throw new Error('Ativo não encontrado ou não pertence ao usuário.');
    }

    // Validar incomeType se estiver sendo alterado
    if (data.incomeType !== undefined && data.incomeType !== 'fixed' && data.incomeType !== 'variable') {
      throw new Error('incomeType deve ser "fixed" ou "variable".');
    }

    const updatePayload: Record<string, unknown> = {
      ...(data.incomeType !== undefined && { incomeType: data.incomeType }),
      ...(data.color !== undefined && { color: data.color || null }),
    };
    if (data.name !== undefined) {
      updatePayload.name = encrypt(userId, data.name) ?? data.name;
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: updatePayload as Parameters<typeof prisma.asset.update>[0]['data'],
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ASSET_UPDATE',
      resourceType: 'assets',
      resourceId: assetId,
    });

    return { ...updatedAsset, name: decrypt(userId, updatedAsset.name) ?? updatedAsset.name };
  }

  // Deletar ativo
  static async deleteAsset(userId: string, assetId: string) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      throw new Error('Ativo não encontrado ou não pertence ao usuário.');
    }

    await prisma.asset.delete({
      where: { id: assetId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ASSET_DELETE',
      resourceType: 'assets',
      resourceId: assetId,
    });

    return { message: 'Ativo excluído com sucesso.' };
  }
}
