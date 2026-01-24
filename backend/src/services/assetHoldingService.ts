import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class AssetHoldingService {
  // Obter todos os holdings de um usuário
  static async getHoldingsByUserId(userId: string) {
    return await prisma.assetHolding.findMany({
      where: { userId },
      include: {
        asset: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
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

    return holding;
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
    }

    return holding;
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

    return await prisma.assetHolding.update({
      where: { id: holdingId },
      data: {
        currentValue: new Decimal(newValue),
      },
      include: {
        asset: true,
      },
    });
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
        return null;
      } else {
        // Atualizar o valor
        return await prisma.assetHolding.update({
          where: { id: holding.id },
          data: {
            currentValue: new Decimal(newValue),
          },
          include: {
            asset: true,
          },
        });
      }
    }

    return null;
  }
}
