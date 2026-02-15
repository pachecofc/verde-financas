import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../contexts/AuthContext';

const TOUR_STEPS: { route: string; element: string; description: string }[] = [
  { route: '/', element: '[data-tour-id="tour-sidebar"]', description: 'Aqui você navega entre as principais áreas: Transações, Orçamentos, Programação, Investimentos e mais.' },
  { route: '/', element: '[data-tour-id="tour-dashboard-resumo"]', description: 'O Dashboard mostra seu saldo, receitas e despesas do mês em um só lugar.' },
  { route: '/', element: '[data-tour-id="tour-dashboard-fluxo"]', description: 'O fluxo de caixa combina o que já aconteceu com o que está previsto nos agendamentos.' },
  { route: '/categories', element: '[data-tour-id="tour-sidebar-categories"]', description: 'O sistema já contém algumas categorias padrão, mas você sempre poderá alterá-las, excluí-las ou criar novas. Para isso, acesse Categorias e clique em Adicionar categorias.' },
  { route: '/accounts', element: '[data-tour-id="tour-sidebar-accounts"]', description: 'Aqui você pode adicionar suas contas, seja conta corrente, investimento, cartão de crédito, ou outras.' },
  { route: '/transactions', element: '[data-tour-id="tour-scanner"]', description: 'Se você é usuário Premium, ao clicar nesse botão, conseguirá escanear recibos ou comprovantes de pagamento para o Verde Finanças lançar as transações automaticamente!' },
  { route: '/transactions', element: '[data-tour-id="tour-import-export"]', description: 'Importar csv é útil se você tem um extrato bancário e quer que o Verde Finanças importe automaticamente suas transações. Exportar csv pode ser útil se você quiser salvar uma cópia de suas transações como csv em seu computador ou dispositivo móvel.' },
  { route: '/transactions', element: '[data-tour-id="tour-novo-lancamento"]', description: 'Você sempre poderá efetuar o lançamento manual de suas receitas, despesas e transferências por aqui.' },
  { route: '/budgets', element: '[data-tour-id="tour-sidebar-budgets"]', description: 'Aqui é onde o VF vai te ajudar a tomar controle das rédeas de suas finanças. Definir orçamentos é primordial para que você defina quanto pode gastar em cada categoria.' },
  { route: '/budgets', element: '[data-tour-id="tour-orcamento-inteligente"]', description: 'Se você é Premium, o VF cria um orçamento automático baseado no histórico de 90 dias de seu hábito financeiros.' },
  { route: '/budgets', element: '[data-tour-id="tour-definir-orcamento"]', description: 'Você sempre poderá definir orçamentos, de forma manual, clicando nesse botão. Lembre-se: esta é uma etapa muito importante para sua liberdade financeira. NÃO subestime o poder dos orçamentos!' },
  { route: '/schedule', element: '[data-tour-id="tour-sidebar-schedule"]', description: 'Aqui você pode definir aquelas contas que se repetem periodicamente, como uma conta de luz, com frequência mensal. Quando tiver contas programadas, poderá pagá-las ou recebê-las por aqui mesmo e o VF já vai lançá-las em suas transações ;)' },
  { route: '/investments', element: '[data-tour-id="tour-adicionar-ativo"]', description: 'Antes de investir, você precisa definir onde investir. É aqui que você pode fazer isto ao informar ativos como tesouro direto, ações, etc.' },
  { route: '/investments', element: '[data-tour-id="tour-nova-meta"]', description: 'Defina metas desafiadoras, mas realistas, aqui e acompanhe o progresso de conquista daquele tão sonhado objetivo' },
  { route: '/health', element: '[data-tour-id="tour-status-score"]', description: 'Ao começar no VF, você já ganha 500 pontos, que podem aumentar ou diminuir conforme seus hábitos financeiros. Fique de olho nas Suas Conquistas e divirta-se enquanto controla suas finanças!' },
  { route: '/health', element: '[data-tour-id="tour-ranking"]', description: 'Veja como você se compara aos demais usuários do VF e tente ganhar deles neste jogo de proficiência financeira' },
  { route: '/reports', element: '[data-tour-id="tour-reports"]', description: 'O VF traz vários relatórios básicos e avançados para você saber de onde vem e para onde vai seu dinheiro. Todos são exportáveis para pdf, caso deseje ;)' },
  { route: '__current__', element: '[data-tour-id="tour-header-avatar"]', description: 'Acesse seu perfil, gerencie sua assinatura e defina autenticação em dois fatores clicando aqui.' },
  { route: '__current__', element: '[data-tour-id="tour-ai-button"]', description: 'Use nosso poderoso assistente de IA para tirar dúvidas e obter insights sobre suas finanças. Exclusivo para usuários Premium.' },
  { route: '/help', element: '[data-tour-id="tour-sidebar-help"]', description: 'Se ainda ficou alguma dúvida, consulte nosso FAQ ou submeta um pedido de ajuda para que nosso time de suporte o auxilie.' },
];

const NAV_WAIT_MS = 450;

export function useOnboardingTour() {
  const navigate = useNavigate();
  const { markOnboardingTourCompleted } = useAuth();

  const startTour = useCallback(
    async (isReplay = false) => {
      const steps: DriveStep[] = TOUR_STEPS.map((s) => ({
        element: s.element,
        popover: {
          description: s.description,
          side: 'bottom' as const,
          align: 'start' as const,
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: 'Próximo',
          prevBtnText: 'Anterior',
          doneBtnText: 'Finalizar',
          showProgress: true,
        },
      }));

      let driverObj: Driver | null = null;

      const getCurrentPath = () => {
        if (typeof window === 'undefined') return '/';
        const hash = window.location.hash;
        if (hash) {
          const path = hash.slice(1) || '/';
          return path.startsWith('/') ? path : `/${path}`;
        }
        return window.location.pathname || '/';
      };

      const goToRouteIfNeeded = (targetRoute: string): Promise<void> => {
        if (targetRoute === '__current__') return Promise.resolve();
        const currentPath = getCurrentPath();
        const normalizedTarget = targetRoute === '/' ? '/' : targetRoute;
        const normalizedCurrent = currentPath === '/' ? '/' : currentPath;
        if (normalizedTarget !== normalizedCurrent) {
          navigate(targetRoute);
          return new Promise((resolve) => setTimeout(resolve, NAV_WAIT_MS));
        }
        return Promise.resolve();
      };

      driverObj = driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        steps,
        onNextClick: async (element, step, options) => {
          const currentIndex = options.state?.activeIndex ?? 0;
          const nextIndex = currentIndex + 1;
          if (nextIndex < TOUR_STEPS.length) {
            const nextStep = TOUR_STEPS[nextIndex];
            await goToRouteIfNeeded(nextStep.route);
          }
          options.driver.moveNext();
        },
        onPrevClick: async (element, step, options) => {
          const currentIndex = options.state?.activeIndex ?? 0;
          const prevIndex = currentIndex - 1;
          if (prevIndex >= 0) {
            const prevStep = TOUR_STEPS[prevIndex];
            await goToRouteIfNeeded(prevStep.route);
          }
          options.driver.movePrevious();
        },
        onDestroyed: () => {
          if (!isReplay) {
            markOnboardingTourCompleted().catch(() => {});
          }
        },
      });

      // Navegar para a primeira rota se necessário antes de iniciar
      await goToRouteIfNeeded(TOUR_STEPS[0].route);
      driverObj.drive();
    },
    [navigate, markOnboardingTourCompleted]
  );

  return { startTour };
}
