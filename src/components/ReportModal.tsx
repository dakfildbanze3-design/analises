import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, X, Loader2 } from 'lucide-react';
import { reportService, ReportData } from '../services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'product' | 'short' | 'user';
  reportedUserId?: string;
}

const REPORT_REASONS = [
  "Spam ou fraude",
  "Nudez ou conteúdo sexual",
  "Discurso de ódio ou assédio",
  "Informação falsa",
  "Bens ou serviços ilegais",
  "Roubo de propriedade intelectual",
  "Outro motivo"
];

export default function ReportModal({ isOpen, onClose, targetId, targetType, reportedUserId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    try {
      await reportService.submitReport({
        targetId,
        targetType,
        reportedUserId,
        reason: selectedReason,
        description: description.trim()
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setTimeout(() => {
          setSuccess(false);
          setSelectedReason('');
          setDescription('');
        }, 300);
      }, 2000);
    } catch (error: any) {
      alert("Erro ao enviar denúncia: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-surface-container-high w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Flag size={20} className="text-error" />
              <h3 className="text-lg font-bold text-on-surface">Denunciar</h3>
            </div>
            <button 
              onClick={onClose}
              disabled={isSubmitting || success}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-full transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto">
            {success ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <Flag size={32} className="text-green-500" />
                </div>
                <h4 className="text-xl font-bold text-on-surface mb-2">Denúncia Enviada</h4>
                <p className="text-on-surface-variant text-sm">
                  Obrigado por partilhar connosco. A nossa equipa irá analisar o teu relatório e tomar medidas se violar as nossas diretrizes.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant mb-4 font-medium">
                  Porquê queres denunciar isto?
                </p>

                <div className="flex flex-col gap-2 mb-6">
                  {REPORT_REASONS.map((reason) => (
                    <label 
                      key={reason} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedReason === reason 
                          ? 'border-primary bg-primary/5' 
                          : 'border-outline-variant/20 hover:bg-surface-container-highest'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="w-4 h-4 text-primary focus:ring-primary border-outline-variant"
                      />
                      <span className={`text-sm font-medium ${selectedReason === reason ? 'text-primary' : 'text-on-surface'}`}>
                        {reason}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-on-surface-variant mb-2 font-medium">
                    Detalhes adicionais (Opcional)
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Fornece mais detalhes sobre o que aconteceu..."
                    className="w-full bg-surface-container rounded-lg p-3 text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50 min-h-[100px] resize-none"
                  />
                </div>
                
                <button 
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="w-full py-4 rounded-xl bg-error text-white font-bold tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Denúncia'
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
