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
    // 🟢 FIXED: Increased mb-16 to mb-20 and added pb-10. 
    // This ensures the absolute labels (-bottom-8) have physical space on the live site.
    <div className="max-w-xl mx-auto mb-20 pb-10 relative subpixel-antialiased">
      <div className="flex items-center justify-between relative px-2">
        {/* Background Connection Line */}
        {/* 🟢 FIXED: Changed h-0.5 to h-[3px] for better visibility in production */}
        <div className="absolute top-5 left-0 w-full h-[3px] bg-slate-200 z-0 rounded-full"></div>
        
        {/* Progress Fill Line */}
        <div 
          className="absolute top-5 left-0 h-[3px] bg-blue-600 z-0 transition-all duration-700 ease-in-out rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            {/* Circle */}
            <div 
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500
                ${currentStep > step.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
                  currentStep === step.id ? 'bg-white border-[3px] border-blue-600 text-blue-600 scale-110 shadow-xl' : 
                  'bg-white border-2 border-slate-200 text-slate-300'}
              `}
            >
              {currentStep > step.id ? <Check className="w-5 h-5 stroke-[3px]" /> : step.id}
            </div>

            {/* Label */}
            {/* 🟢 FIXED: Increased text size to 11px and adjusted tracking to prevent production "thinning" */}
            <span className={`
              absolute -bottom-10 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500
              ${currentStep === step.id ? 'text-blue-600 translate-y-0 opacity-100' : 'text-slate-400 translate-y-1 opacity-70'}
            `}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}