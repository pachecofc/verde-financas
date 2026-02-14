import { prisma } from '../prisma';

export interface FaqItemDto {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface FaqCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  items: FaqItemDto[];
}

export class FaqService {
  static async getAll(): Promise<FaqCategoryDto[]> {
    const categories = await prisma.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.items.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
      })),
    }));
  }
}
