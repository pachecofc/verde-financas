import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../prisma';
import { AuditService } from './auditService';
import { decrypt } from './encryptionService';

function mapHoldingWithDecryptedAsset<T extends { asset: { name: string } }>(userId: string, holding: T): T {
  return {
    ...holding,
    asset: holding.asset
      ? { ...holding.asset, name: decrypt(userId, holding.asset.name) ?? holding.asset.name }
      : holding.asset,
  };
}

export class AssetHoldingService {
  // Obter todos os holdings de um usuário
  static async getHoldingsByUserId(userId: string) {
    const holdings = await prisma.assetHolding.findMany({
      where: { userId },
      include: {
        asset: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return holdings.map((h) => mapHoldingWithDecryptedAsset(userId, h));
  }

  // Obter um holding específico por ID
  static async getHoldingById(userId: string, holdingId: string) {
    const holding = await prisma.assetHolding.findFirst({
      where: { id: holdingId, userId },
      include: {
        asset: true,
      },
    });

    if (!holding) {
      throw new Error('Asset holding not found');
    }

    return mapHoldingWithDecryptedAsset(userId, holding);
  }

  // Obter ou criar um holding para um ativo
  static async getOrCreateHolding(userId: string, assetId: string, initialValue: number) {
    // Verificar se já existe um holding para este ativo
    let holding = await prisma.assetHolding.findUnique({
      where: {
        assetId_userId: {
          assetId,
          userId,
        },
      },
      include: {
        asset: true,
      },
    });

    if (holding) {
      // Se já existe, incrementar o valor atual
      holding = await prisma.assetHolding.update({
        where: { id: holding.id },
        data: {
          currentValue: {
            increment: new Decimal(initialValue),
          },
        },
        include: {
          asset: true,
        },
      });

      await AuditService.log({
        actorType: 'user',
        actorId: userId,
        action: 'ASSET_HOLDING_UPDATE',
        resourceType: 'asset_holdings',
        resourceId: holding.id,
      });
    } else {
      // Se não existe, criar novo
      holding = await prisma.assetHolding.create({
        data: {
          userId,
          assetId,
          currentValue: new Decimal(initialValue),
        },
        include: {
          asset: true,
        },
      });

      await AuditService.log({
        actorType: 'user',
        actorId: userId,
        action: 'ASSET_HOLDING_CREATE',
        resourceType: 'asset_holdings',
        resourceId: holding.id,
      });
    }

    return mapHoldingWithDecryptedAsset(userId, holding);
  }

  // Atualizar o valor atual de um holding
  static async updateHoldingValue(userId: string, holdingId: string, newValue: number) {
    // Verificar se o holding existe e pertence ao usuário
    const holding = await prisma.assetHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new Error('Asset holding not found');
    }

    const updated = await prisma.assetHolding.update({
      where: { id: holdingId },
      data: {
        currentValue: new Decimal(newValue),
      },
      include: {
        asset: true,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ASSET_HOLDING_UPDATE',
      resourceType: 'asset_holdings',
      resourceId: holdingId,
    });

    return mapHoldingWithDecryptedAsset(userId, updated);
  }

  // Deletar um holding (quando todas as transações relacionadas são removidas)
  static async deleteHolding(userId: string, holdingId: string) {
    const holding = await prisma.assetHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new Error('Asset holding not found');
    }

    await prisma.assetHolding.delete({
      where: { id: holdingId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ASSET_HOLDING_DELETE',
      resourceType: 'asset_holdings',
      resourceId: holdingId,
    });
  }

  // Decrementar valor de um holding (quando uma transação de investimento é removida)
  static async decrementHolding(userId: string, assetId: string, amount: number) {
    const holding = await prisma.assetHolding.findUnique({
      where: {
        assetId_userId: {
          assetId,
          userId,
        },
      },
    });

    if (holding) {
      const newValue = holding.currentValue.toNumber() - amount;

      if (newValue <= 0) {
        // Se o valor ficar zero ou negativo, deletar o holding
        await prisma.assetHolding.delete({
          where: { id: holding.id },
        });

        await AuditService.log({
          actorType: 'user',
          actorId: userId,
          action: 'ASSET_HOLDING_DELETE',
          resourceType: 'asset_holdings',
          resourceId: holding.id,
        });

        return null;
      } else {
        // Atualizar o valor
        const updated = await prisma.assetHolding.update({
          where: { id: holding.id },
          data: {
            currentValue: new Decimal(newValue),
          },
          include: {
            asset: true,
          },
        });

        await AuditService.log({
          actorType: 'user',
          actorId: userId,
          action: 'ASSET_HOLDING_UPDATE',
          resourceType: 'asset_holdings',
          resourceId: holding.id,
        });

        return mapHoldingWithDecryptedAsset(userId, updated);
      }
    }

    return null;
  }
}
