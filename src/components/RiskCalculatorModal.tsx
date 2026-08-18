import React, { useState, useEffect } from 'react';
import { TradeSetup } from '../types';
import { X, Calculator, ShieldAlert, Target, DollarSign, Layers, AlertCircle } from 'lucide-react';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  setup?: TradeSetup | null;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  setup,
}) => {
  const [balance, setBalance] = useState<number>(1000);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [leverage, setLeverage] = useState<number>(setup?.leverageValue || 10);
  const [entryPrice, setEntryPrice] = useState<number>(setup?.optimalEntry || 96000);
  const [stopLossPrice, setStopLossPrice] = useState<number>(setup?.stopLoss.price || 94500);
  const [tp1Price, setTp1Price] = useState<number>(setup?.takeProfits[0]?.price || 98500);
  const [tp2Price, setTp2Price] = useState<number>(setup?.takeProfits[1]?.price || 101000);
  const [isLong, setIsLong] = useState<boolean>(setup?.action !== 'SHORT');

  useEffect(() => {
    if (setup) {
      setLeverage(setup.leverageValue || 10);
      setEntryPrice(setup.optimalEntry);
      setStopLossPrice(setup.stopLoss.price);
      setTp1Price(setup.takeProfits[0]?.price || setup.optimalEntry * 1.02);
      setTp2Price(setup.takeProfits[1]?.price || setup.optimalEntry * 1.05);
      setIsLong(setup.action !== 'SHORT');
    }
  }, [setup]);

  if (!isOpen) return null;

  // Calculations
  const maxRiskAmount = (balance * riskPercent) / 100;
  const slDistancePercent = Math.abs(entryPrice - stopLossPrice) / entryPrice;
  const positionSizeUsdt = slDistancePercent > 0 ? maxRiskAmount / slDistancePercent : 0;
  const marginRequired = leverage > 0 ? positionSizeUsdt / leverage : 0;

  const profitTp1 = positionSizeUsdt * (Math.abs(tp1Price - entryPrice) / entryPrice);
  const profitTp2 = positionSizeUsdt * (Math.abs(tp2Price - entryPrice) / entryPrice);

  // Liquidation estimate (approx)
  const liqPrice = isLong
    ? entryPrice * (1 - 1 / leverage * 0.9)
    : entryPrice * (1 + 1 / leverage * 0.9);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              محاسبه‌گر حرفه‌ای حجم معامله و حد ضرر فیوچرز (Position & Risk Calculator)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Direction Toggle */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsLong(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isLong ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
              }`}
            >
              🟢 معامله لانگ (LONG)
            </button>
            <button
              onClick={() => setIsLong(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isLong ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400'
              }`}
            >
              🔴 معامله شورت (SHORT)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">سرمایه حساب (Balance $):</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">درصد ریسک مجاز (%):</label>
              <input
                type="number"
                step="0.5"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">اهرم / لوریج (Leverage):</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">قیمت ورود (Entry $):</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">قیمت حد ضرر (SL $):</label>
              <input
                type="number"
                step="any"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-300 mono-num focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">قیمت تارگت ۱ (TP1 $):</label>
              <input
                type="number"
                step="any"
                value={tp1Price}
                onChange={(e) => setTp1Price(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              نتایج محاسبه دقیق مدیریت ریسک و سود:
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">حداکثر ضرر در صورت استاپ (Max Risk):</span>
                <span className="mono-num font-bold text-rose-400">${maxRiskAmount.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">({riskPercent}% از بالانس)</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">مارجین لازم (Margin Required):</span>
                <span className="mono-num font-bold text-slate-100">${marginRequired.toFixed(2)} USDT</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">کل حجم پوزیشن (Position Size):</span>
                <span className="mono-num font-bold text-purple-300">${positionSizeUsdt.toFixed(2)}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">سود خالص در تارگت ۱ (TP1 Profit):</span>
                <span className="mono-num font-bold text-emerald-400">+${profitTp1.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                قیمت تقریبی لیکوئید (Liquidation):
              </span>
              <span className="mono-num font-bold text-amber-300">${liqPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
