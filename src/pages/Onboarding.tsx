import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Video, MessageSquare, ShieldCheck, ChevronRight, ArrowRight } from 'lucide-react';

const steps = [
  {
    title: "Bem-vindo ao Bazar",
    description: "A maior plataforma de compra e venda em Moçambique, agora com vídeos curtos para uma experiência real.",
    icon: <ShoppingBag className="w-12 h-12 text-primary" />,
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Veja antes de comprar",
    description: "Assista a vídeos reais dos produtos (Shorts). Nada de surpresas desagradáveis, veja cada detalhe em movimento.",
    icon: <Video className="w-12 h-12 text-primary" />,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Negocie Direto",
    description: "Converse diretamente com o vendedor via chat ou WhatsApp. Segurança e rapidez nas suas mãos.",
    icon: <MessageSquare className="w-12 h-12 text-primary" />,
    image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Segurança Total",
    description: "Verificamos vendedores e protegemos os seus dados. Compre e venda com tranquilidade.",
    icon: <ShieldCheck className="w-12 h-12 text-primary" />,
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop"
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      navigate('/login');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-[100]">
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={handleSkip}
          className="text-zinc-500 text-[0.875rem] font-medium hover:text-white transition-colors"
        >
          Pular
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {/* Image Section */}
            <div className="h-[50%] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
              <img 
                src={steps[currentStep].image} 
                className="w-full h-full object-cover grayscale-[0.2]" 
                alt={steps[currentStep].title} 
              />
            </div>

            {/* Content Section */}
            <div className="flex-1 px-8 pt-4 pb-12 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6 p-4 bg-primary/10 rounded-3xl"
              >
                {steps[currentStep].icon}
              </motion.div>

              <h1 className="text-[1.75rem] font-black text-white leading-tight mb-4 uppercase italic tracking-tighter">
                {steps[currentStep].title}
              </h1>
              
              <p className="text-[1rem] text-zinc-400 leading-relaxed max-w-sm">
                {steps[currentStep].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 pb-12 flex flex-col items-center gap-8">
        {/* Progress Dots */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleNext}
          className="w-full bg-primary hover:bg-primary-dark text-black font-black h-14 rounded-2xl flex items-center justify-center gap-2 group transition-all active:scale-95"
        >
          {currentStep === steps.length - 1 ? (
            <>
              COMEÇAR AGORA
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              PRÓXIMO
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
