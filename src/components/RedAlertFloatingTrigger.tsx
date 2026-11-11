import React, { useState, useRef, useEffect } from "react";
import { Radio, ShieldAlert, X, Phone, PhoneCall, ArrowRight } from "lucide-react";
import { LocationOption, User } from "../types";
const h = React.createElement;
export interface RedAlertFloatingTriggerProps {
  userId?: string;
  userName?: string;
  currentUser?: User;
  currentLocation?: LocationOption;
  activeCount?: number;
  onOpenActiveList?: () => void;
  onOpenSosTracker?: () => void;
  onOpenCreateModal?: () => void;
  onRequestIgnoreBattery?: () => void;
}
const EMERGENCY_HOTLINES = [{
  number: "119",
  nameSi: "පොලිස් හදිසි ඇමතුම්",
  nameEn: "Police Emergency",
  icon: "🚓",
  color: "bg-blue-600"
}, {
  number: "1990",
  nameSi: "සුවසැරිය ගිලන්රථ සේවය",
  nameEn: "Suwa Seriya Ambulance",
  icon: "🚑",
  color: "bg-emerald-600"
}, {
  number: "117",
  nameSi: "ආපදා කළමනාකරණ (DMC)",
  nameEn: "Disaster Management",
  icon: "🌊",
  color: "bg-amber-600"
}, {
  number: "110",
  nameSi: "ගිනි නිවන හදිසි සේවය",
  nameEn: "Fire & Rescue",
  icon: "🚒",
  color: "bg-rose-600"
}, {
  number: "1919",
  nameSi: "රජයේ තොරතුරු කේන්ද්‍රය",
  nameEn: "Government Info Center",
  icon: "ℹ️",
  color: "bg-indigo-600"
}, {
  number: "0112691111",
  nameSi: "කොළඹ ජාතික රෝහල",
  nameEn: "National Hospital",
  icon: "🏥",
  color: "bg-teal-600"
}];
export const RedAlertFloatingTrigger = ({
  activeCount = 0,
  onOpenActiveList,
  onOpenSosTracker,
  onOpenCreateModal
}: RedAlertFloatingTriggerProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return {
        x: 16,
        y: Math.max(260, window.innerHeight - 96)
      };
    }
    return {
      x: 16,
      y: 560
    };
  });
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({
    x: 0,
    y: 0,
    initialBubbleX: 0,
    initialBubbleY: 0
  });
  const hasMovedRef = useRef(false);
  const handleTouchStart = (e: any) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPos.current = {
      x: clientX,
      y: clientY,
      initialBubbleX: position.x,
      initialBubbleY: position.y
    };
  };
  const handleTouchMove = (e: any) => {
    if (!isDraggingRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dist >= 12) {
      if (e.cancelable) {
        e.preventDefault();
      }
      hasMovedRef.current = true;
      const maxX = window.innerWidth - 70;
      const maxY = window.innerHeight - 70;
      const newX = Math.min(Math.max(10, dragStartPos.current.initialBubbleX + deltaX), maxX);
      const newY = Math.min(Math.max(240, dragStartPos.current.initialBubbleY + deltaY), maxY);
      setPosition({
        x: newX,
        y: newY
      });
    }
  };
  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };
  useEffect(() => {
    const onMove = (e: any) => handleTouchMove(e);
    const onTouchMove = (e: any) => handleTouchMove(e);
    const onUp = () => handleTouchEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, {
      passive: false
    });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [position.x, position.y]);
  return h(React.Fragment, null, h("div", {
    style: {
      left: String(position.x) + "px",
      bottom: "20px",
      touchAction: "none"
    },
    className: "fixed z-30 select-none flex items-start gap-1"
  }, h("button", {
    type: "button",
    onMouseDown: handleTouchStart,
    onTouchStart: handleTouchStart,
    onClick: (e: any) => {
      e.stopPropagation();
      if (!hasMovedRef.current) {
        setIsMenuOpen(prev => !prev);
      }
      hasMovedRef.current = false;
    },
    className: "relative group w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white flex flex-col items-center justify-center shadow-xl border-2 border-red-300 transition-transform active:scale-95 cursor-grab active:cursor-grabbing " + (isMenuOpen ? "ring-4 ring-red-400" : ""),
    title: "හදිසි ආපදා සහන කේන්ද්‍රය (SOS & Red Alert Menu)"
  }, h("span", {
    className: "text-lg sm:text-xl leading-none"
  }, "🚨"), h("span", {
    className: "text-[8px] font-black tracking-tighter uppercase text-white leading-tight"
  }, "SOS / රතු"), activeCount >= 1 ? h("span", {
    className: " -top-1 -right-1 absolute px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black border-2 border-red-600 shadow-md"
  }, String(activeCount)) : null)), isMenuOpen ? h("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center sm:items-end sm:justify-start p-4 sm:p-6 bg-black/60 backdrop-blur-xs",
    onClick: () => setIsMenuOpen(false)
  }, h("div", {
    onClick: (e: any) => e.stopPropagation(),
    className: "bg-slate-950 border-2 border-red-600/80 rounded-3xl p-5 w-full max-w-sm shadow-2xl text-white space-y-4 my-auto sm:my-0 sm:ml-4 sm:mb-20"
  }, h("div", {
    className: "flex items-center justify-between border-b border-red-900/50 pb-3"
  }, h("div", {
    className: "flex items-center gap-2 text-red-400"
  }, h("div", {
    className: "p-2 rounded-xl bg-red-950/80 border border-red-600/40"
  }, h(ShieldAlert, {
    className: "w-5 h-5 text-red-500 animate-pulse"
  })), h("div", null, h("h3", {
    className: "font-black text-sm text-white leading-tight"
  }, "හදිසි ආපදා සහ SOS කේන්ද්‍රය"), h("p", {
    className: "text-[10px] text-red-300"
  }, "SOS Live & Red Alert Center"))), h("button", {
    type: "button",
    onClick: () => setIsMenuOpen(false),
    className: "p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
  }, h(X, {
    className: "w-4 h-4"
  }))), h("div", {
    className: "space-y-2.5"
  }, h("button", {
    type: "button",
    onClick: () => {
      setIsMenuOpen(false);
      if (onOpenCreateModal) onOpenCreateModal();
    },
    className: "w-full p-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 rounded-2xl flex items-center justify-between font-black text-xs text-white shadow-lg border border-red-400/40 cursor-pointer group"
  }, h("div", {
    className: "flex items-center gap-3"
  }, h("span", {
    className: "text-2xl"
  }, "🚨"), h("div", {
    className: "text-left"
  }, h("div", {
    className: "text-sm font-black tracking-wide"
  }, "රතු එළිය (RED ALERT)"), h("div", {
    className: "text-[10px] text-red-100 font-normal"
  }, "හදිසි ආපදා අනතුරු ඇඟවීමක් පළ කරන්න"))), h(ArrowRight, {
    className: "w-4 h-4 text-white"
  })), onOpenSosTracker ? h("button", {
    type: "button",
    onClick: () => {
      setIsMenuOpen(false);
      onOpenSosTracker();
    },
    className: "w-full p-3.5 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-600 hover:to-blue-600 rounded-2xl flex items-center justify-between font-black text-xs text-white shadow-lg border border-indigo-400/40 cursor-pointer group"
  }, h("div", {
    className: "flex items-center gap-3"
  }, h(Radio, {
    className: "w-6 h-6 text-cyan-300 animate-pulse"
  }), h("div", {
    className: "text-left"
  }, h("div", {
    className: "text-sm font-black tracking-wide"
  }, "📡 SOS LIVE TRACKER"), h("div", {
    className: "text-[10px] text-indigo-200 font-normal"
  }, "සජීවී GPS Tracking සහ ආපදා සහන කේන්ද්‍රය"))), h(ArrowRight, {
    className: "w-4 h-4 text-cyan-200"
  })) : null), h("div", {
    className: "space-y-2 pt-2 border-t border-zinc-900"
  }, h("div", {
    className: "flex items-center justify-between text-[11px] font-bold text-zinc-400"
  }, h("span", {
    className: "flex items-center gap-1"
  }, h(PhoneCall, {
    className: "w-3.5 h-3.5 text-emerald-400"
  }), h("span", null, "හදිසි ඇමතුම් අංක (Emergency Hotlines):"))), h("div", {
    className: "grid grid-cols-2 gap-2"
  }, EMERGENCY_HOTLINES.map(hotline => h("a", {
    key: hotline.number,
    href: "tel:" + hotline.number,
    className: "p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-between gap-1.5 transition-all text-left group"
  }, h("div", {
    className: "min-w-0"
  }, h("div", {
    className: "flex items-center gap-1 font-black text-xs text-white"
  }, h("span", null, hotline.icon), h("span", {
    className: "text-emerald-400 group-hover:underline"
  }, hotline.number)), h("div", {
    className: "text-[9px] text-zinc-400 truncate leading-tight"
  }, hotline.nameSi)), h(Phone, {
    className: "w-3.5 h-3.5 text-emerald-400 shrink-0"
  }))))), activeCount >= 1 && onOpenActiveList ? h("button", {
    type: "button",
    onClick: () => {
      setIsMenuOpen(false);
      onOpenActiveList();
    },
    className: "w-full py-2 bg-red-950/60 border border-red-800/80 rounded-xl text-xs font-black text-red-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
  }, h("span", {
    className: "w-2 h-2 rounded-full bg-red-500 animate-ping"
  }), h("span", null, "ක්‍රියාකාරී අනතුරු ඇඟවීම් " + String(activeCount) + " ක් බලන්න")) : null)) : null);
};
