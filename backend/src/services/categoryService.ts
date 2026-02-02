import { prisma } from '../prisma';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';

function decryptCategory(userId: string, cat: { name: string; parent?: { name: string } | null; children?: Array<{ name: string }> }) {
  return {
    ...cat,
    name: decrypt(userId, cat.name) ?? cat.name,
    parent: cat.parent ? { ...cat.parent, name: decrypt(userId, cat.parent.name) ?? cat.parent.name } : cat.parent,
    children: cat.children?.map((c) => ({ ...c, name: decrypt(userId, c.name) ?? c.name })) ?? cat.children,
  };
}

export type CategoryTypeString = 'income' | 'expense';

export class CategoryService {
  // Listar todas as categorias do usuário
  static async getCategories(userId: string) {
    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => decryptCategory(userId, c));
  }

  // Criar nova categoria
  static async createCategory(userId: string, data: {
    name: string;
    type: string;
    icon?: string;
    color?: string;
    parentId?: string;
    isDefault?: boolean;
  }) {
    const { name, type, icon, color, parentId, isDefault } = data;

    // Validar tipo (apenas "income" ou "expense")
    if (type !== 'income' && type !== 'expense') {
      throw new Error('Type must be "income" or "expense"');
    }

    // Se tiver parentId, verificar se a categoria pai existe e pertence ao usuário
    if (parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: { id: parentId, userId },
      });

      if (!parentCategory) {
        throw new Error('Parent category not found');
      }
    }

    const encryptedName = encrypt(userId, name) ?? name;
    const category = await prisma.category.create({
      data: {
        userId,
        name: encryptedName,
        type,
        ...(icon ? { icon } : {}),
        ...(color ? { color } : {}),
        parentId: parentId || null,
        isDefault: isDefault || false,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'CATEGORY_CREATE',
      resourceType: 'categories',
      resourceId: category.id,
    });

    return { ...category, name: decrypt(userId, category.name) ?? category.name };
  }

  // Atualizar categoria
  static async updateCategory(
    userId: string,
    categoryId: string,
    data: {
      name?: string;
      type?: string;
      icon?: string;
      color?: string;
      parentId?: string;
    }
  ) {
    const { name, type, icon, color, parentId } = data;

    // Verificar se a categoria existe e pertence ao usuário
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Validar tipo se estiver sendo alterado
    if (type && type !== 'income' && type !== 'expense') {
      throw new Error('Type must be "income" or "expense"');
    }

    const updatePayload: Record<string, unknown> = {
      ...(type && { type }),
      ...(icon && { icon }),
      ...(color && { color }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    };
    if (name !== undefined) updatePayload.name = encrypt(userId, name) ?? name;

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: updatePayload as Parameters<typeof prisma.category.update>[0]['data'],
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'CATEGORY_UPDATE',
      resourceType: 'categories',
      resourceId: categoryId,
    });

    return { ...updated, name: decrypt(userId, updated.name) ?? updated.name };
  }

  // Deletar categoria
  static async deleteCategory(userId: string, categoryId: string) {
    // Verificar se a categoria existe e pertence ao usuário
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Verificar se há transações vinculadas
    const transactionCount = await prisma.transaction.count({
      where: { categoryId },
    });

    if (transactionCount > 0) {
      throw new Error(
        'Cannot delete category with existing transactions'
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'CATEGORY_DELETE',
      resourceType: 'categories',
      resourceId: categoryId,
    });

    return;
  }

  // Método para criar categorias em batelada, útil para categorias padrão
  static async createMultipleCategories(
    userId: string,
    categoriesData: Array<{
      tempId: string; // Adicionar um ID temporário do frontend para mapeamento
      name: string;
      type: CategoryTypeString;
      icon?: string;
      color?: string;
      parentId?: string; // Este parentId será o tempId do pai
      isDefault?: boolean;
    }>
  ) {
    const createdCategoriesMap = new Map<string, string>(); // Mapa: tempId -> realId
    const categoriesToCreate = [...categoriesData]; // Copia para poder ordenar

    // Ordenar para garantir que pais sejam processados antes dos filhos
    // Isso é crucial para a validação de parentId
    categoriesToCreate.sort((a, b) => {
      if (!a.parentId && b.parentId) return -1; // a é raiz, b é filho
      if (a.parentId && !b.parentId) return 1;  // a é filho, b é raiz
      return 0; // ambos raiz ou ambos filhos
    });

    await prisma.$transaction(async (tx) => {
      for (const catData of categoriesToCreate) {
        let realParentId: string | undefined;
        if (catData.parentId) {
          realParentId = createdCategoriesMap.get(catData.parentId);
          if (!realParentId) {
            // Isso significa que o pai não foi criado ainda ou o parentId é inválido
            // Para categorias padrão, isso indica um problema na ordem ou nos dados
            throw new Error(`Parent category with tempId ${catData.parentId} not found for category ${catData.name}.`);
          }
        }

        const encryptedCatName = encrypt(userId, catData.name) ?? catData.name;
        const newCat = await tx.category.create({
          data: {
            userId,
            name: encryptedCatName,
            type: catData.type,
            icon: catData.icon,
            color: catData.color,
            parentId: realParentId,
            isDefault: catData.isDefault ?? false,
          },
        });
        createdCategoriesMap.set(catData.tempId, newCat.id); // Mapear tempId para realId
      }
    }, {
      timeout: 15000, // Aumenta o timeout para 15 segundos (15000 ms). O padrão é 5000 ms.
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'CATEGORY_CREATE',
      resourceType: 'categories',
      metadata: { batch: true, count: categoriesData.length },
    });

    const categories = await prisma.category.findMany({
      where: { userId },
      include: { parent: true, children: true },
    });
    return categories.map((c) => decryptCategory(userId, c));
  }
}
