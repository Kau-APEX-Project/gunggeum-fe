import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { isOnboarded } from "@/lib/onboarding";

export function Splash() {
  const { go } = useApp();
  return <div className="splash screen-pad">
    <div className="splash-mark"><Icon name="tour" size={42} /></div>
    <h1>GungGeum</h1><p>Your palace guide<br />in your language</p>
    <div className="no-signup"><Icon name="check" size={17} /> No sign-up needed</div>
    <Button onClick={() => go(isOnboarded() ? "T-10" : "T-01")}>{isOnboarded() ? "Continue" : "Start"}</Button>
    <button className="guide-entry" onClick={() => go("G-01")}>I'm a palace guide <Icon name="chevron" size={15} /></button>
  </div>;
}
