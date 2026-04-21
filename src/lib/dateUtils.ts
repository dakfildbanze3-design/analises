/**
 * Formata um timestamp para uma string relativa amigável ao utilizador (ex: "Há 2 horas")
 */
export function formatRelativeTime(date: any): string {
  if (!date) return 'agora';
  
  const now = new Date();
  const past = date.toDate ? date.toDate() : new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'agora';
  }
  
  if (diffInMinutes < 60) {
    return `há ${diffInMinutes} min`;
  }
  
  if (diffInHours < 24) {
    return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }
  
  if (diffInDays < 7) {
    return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
  }

  // Se for mais de uma semana, retorna a data simples
  return past.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' });
}
