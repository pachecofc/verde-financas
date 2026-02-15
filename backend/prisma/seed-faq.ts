/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const faqData = [
  {
    name: 'Primeiros Passos',
    sortOrder: 1,
    items: [
      {
        question: 'Como devo começar a organizar minhas finanças aqui?',
        answer:
          'Recomendamos um passo de cada vez. Comece cadastrando o saldo atual da sua conta principal. Em seguida, registre suas despesas e receitas do dia a dia. Quando se sentir confortável, crie seu primeiro Orçamento para a categoria onde você mais gasta (como Alimentação ou Transporte).',
        sortOrder: 1,
      },
      {
        question: 'Qual a diferença entre "Orçamento" e "Meta"?',
        answer:
          'O Orçamento é o seu limite de gastos para o mês atual (ex: "Quero gastar no máximo R$ 800 com mercado"). A Meta é um objetivo de economia para o futuro (ex: "Juntar R$ 5.000 para uma viagem" ou "Criar minha Reserva de Emergência").',
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Transações e Contas',
    sortOrder: 2,
    items: [
      {
        question: 'Como funcionam as transferências entre contas?',
        answer:
          'Quando você registra uma transferência (ex: da Conta Corrente para a Poupança), o sistema entende que você não gastou nem ganhou dinheiro novo. O valor apenas mudou de lugar, mantendo o seu patrimônio total intacto.',
        sortOrder: 1,
      },
      {
        question: 'Esqueci de registrar uma conta no passado. Posso adicionar com data retroativa?',
        answer:
          'Sim! Você pode escolher qualquer data ao adicionar uma transação. O Verde Finanças recalculará seus relatórios e saldos automaticamente para refletir a realidade.',
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Gamificação e Score Verde',
    sortOrder: 3,
    items: [
      {
        question: 'O que é o Score Verde e como ele é calculado?',
        answer:
          'O Score Verde é o termômetro da sua saúde financeira, variando de 0 a 1000. Todo usuário começa com 500 pontos. Você ganha pontos cultivando bons hábitos (como fechar o mês no azul ou bater uma meta) e perde pontos com ações de risco (como estourar um orçamento).',
        sortOrder: 1,
      },
      {
        question: 'Os pontos do Score Verde têm algum valor financeiro real?',
        answer:
          'Não. O Score e as conquistas (Badges) são ferramentas motivacionais e educativas para ajudar você a manter o foco e a disciplina, mas não possuem valor monetário nem podem ser trocados por dinheiro real.',
        sortOrder: 2,
      },
      {
        question: 'Como funciona o ranking de pontuação?',
        answer:
          'O ranking mostra os 10 usuários com maior Score Verde, em ordem decrescente de pontuação. Em caso de empate, quem criou a conta primeiro fica à frente. Sua posição e sua pontuação aparecem sempre, mesmo que você não esteja entre os 10. Você pode ocultar seu nome do ranking nas Configurações da conta (aba Segurança), marcando "Ocultar meu nome do ranking"; nesse caso, será exibido "Usuário" no lugar do seu nome.',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Inteligência Artificial e Plano Premium',
    sortOrder: 4,
    items: [
      {
        question: 'Como funciona a Análise IA Verde?',
        answer:
          'Disponível no plano Premium, nossa IA analisa seus padrões de gastos, orçamentos e metas para oferecer conselhos personalizados e imparciais. É como ter um mentor financeiro disponível 24 horas por dia, focado em fazer seu patrimônio crescer de forma sustentável.',
        sortOrder: 1,
      },
      {
        question: 'Como posso gerenciar ou cancelar minha assinatura Premium?',
        answer:
          'Você tem total controle. Acesse as configurações do seu perfil e clique em "Gerenciar Assinatura". Você será redirecionado para o portal seguro de pagamentos, onde poderá alterar seu cartão ou cancelar a renovação automática a qualquer momento, sem burocracia.',
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Segurança e Privacidade',
    sortOrder: 5,
    items: [
      {
        question: 'Meus dados financeiros estão seguros?',
        answer:
          'Sim. A sua tranquilidade é nossa prioridade. Utilizamos criptografia de ponta para proteger suas senhas e infraestrutura de nuvem segura. Não vendemos seus dados para terceiros e você pode solicitar a exclusão definitiva da sua conta e dos seus registros a qualquer momento.',
        sortOrder: 1,
      },
      {
        question: 'O aplicativo tem acesso direto à minha conta no banco?',
        answer:
          'Não. O Verde Finanças funciona através dos registros que você insere manualmente. Isso garante que você tenha total controle sobre o que entra no sistema e elimina o risco de movimentações não autorizadas em seu banco real.',
        sortOrder: 2,
      },
    ],
  },
];

async function main() {
  const existing = await prisma.faqCategory.count();
  if (existing > 0) {
    console.log('FAQ já populado. Pulando seed.');
    return;
  }

  for (const cat of faqData) {
    const category = await prisma.faqCategory.create({
      data: {
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });
    for (const item of cat.items) {
      await prisma.faqItem.create({
        data: {
          categoryId: category.id,
          question: item.question,
          answer: item.answer,
          sortOrder: item.sortOrder,
        },
      });
    }
  }
  console.log('FAQ populado com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
