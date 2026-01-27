import { UserService } from './userService';

/**
 * Serviço de cron job para executar tarefas agendadas
 * Roda diariamente à meia-noite para deletar usuários que passaram dos 30 dias
 */
export class CronService {
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Inicia o cron job para hard delete de usuários expirados
   * Executa diariamente à meia-noite
   */
  static start() {
    // Calcular milissegundos até a próxima meia-noite
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    // Executar na próxima meia-noite
    setTimeout(() => {
      this.runHardDelete();
      // Depois, executar a cada 24 horas
      this.intervalId = setInterval(() => {
        this.runHardDelete();
      }, 24 * 60 * 60 * 1000); // 24 horas
    }, msUntilMidnight);

    console.log('✅ Cron job iniciado. Hard delete será executado diariamente à meia-noite.');
  }

  /**
   * Para o cron job
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Cron job parado.');
    }
  }

  /**
   * Executa o hard delete de usuários que passaram dos 30 dias
   */
  private static async runHardDelete() {
    try {
      console.log('🔄 Executando hard delete de usuários expirados...');
      const deletedCount = await UserService.hardDeleteExpiredUsers();
      console.log(`✅ Hard delete concluído. ${deletedCount} usuário(s) deletado(s) permanentemente.`);
    } catch (error) {
      console.error('❌ Erro ao executar hard delete:', error);
    }
  }
}
