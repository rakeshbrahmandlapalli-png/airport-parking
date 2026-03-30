import { Check } from "lucide-react";

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export default function BookingStepper({ currentStep }: StepperProps) {
  const steps = [
    { id: 1, label: "Select Space" },
    { id: 2, label: "Your Details" },
    { id: 3, label: "Secure Payment" },
  ];

  return (
    <div className="max-w-xl mx-auto mb-16 relative">
      <div className="flex items-center justify-between relative">
        {/* Background Connection Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 z-0"></div>
        
        {/* Progress Fill Line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-blue-600 z-0 transition-all duration-700 ease-in-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            {/* Circle */}
            <div 
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500
                ${currentStep > step.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
                  currentStep === step.id ? 'bg-white border-4 border-blue-600 text-blue-600 scale-110' : 
                  'bg-white border-2 border-slate-200 text-slate-300'}
              `}
            >
              {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
            </div>

            {/* Label */}
            <span className={`
              absolute -bottom-8 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-500
              ${currentStep === step.id ? 'text-blue-600' : 'text-slate-400'}
            `}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}