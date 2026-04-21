/**
 * Utilitário para partilha nativa utilizando a Web Share API.
 * Se não for suportado, copia o link para a área de transferência.
 */
export async function shareContent(title: string, text: string, url: string) {
  const shareData = {
    title: title,
    text: text,
    url: url || window.location.href,
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao partilhar:', err);
      }
    }
  } else {
    // Fallback: Copiar para área de transferência
    try {
      await navigator.clipboard.writeText(shareData.url);
      alert('Link copiado para a área de transferência!');
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  }
}
