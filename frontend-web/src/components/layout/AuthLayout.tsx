import { Outlet } from 'react-router';
import { Check, Clock } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <section
        aria-hidden
        className="hidden w-[min(620px,45%)] shrink-0 flex-col justify-center gap-[22px] bg-sidebar p-[72px] text-white lg:flex"
      >
        <div className="flex items-center gap-2.5 text-[28px] font-bold">
          <Clock className="size-9" />
          Time Manager
        </div>
        <p className="max-w-[470px] text-xl font-medium leading-relaxed text-sidebar-text">
          Pointez vos heures, suivez votre temps de travail et pilotez vos équipes au même endroit.
        </p>
        <ul className="flex flex-col gap-3">
          {[
            "Pointage d'arrivée et de départ en un clic",
            'Tableaux de bord et KPI par équipe',
            'Conforme RGPD et droit du travail',
          ].map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-[15px]">
              <Check className="size-[18px] text-primary-light" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <main className="grid flex-1 place-items-center p-4">
        <Outlet />
      </main>
    </div>
  );
}
