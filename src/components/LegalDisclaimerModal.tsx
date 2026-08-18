import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Coins,
  Globe2,
  Scale,
  FileText,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface LegalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const LegalDisclaimerModal: React.FC<LegalDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'creator_gain' | 'markets' | 'risk_rules'>('rules');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
                <span>قوانین، شرایط استفاده و سلب مسئولیت حقوقی ربات</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-normal">
                  مطالعه الزامی
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                قوانین استفاده از سیستم تحلیلی تریدینگ‌ویو، تلگرام و بله (ارز دیجیتال، فارکس، طلا و سهام)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>۱. سلب مسئولیت ۱۰۰٪ کاربر</span>
          </button>

          <button
            onClick={() => setActiveTab('creator_gain')}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'creator_gain'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>۲. عدم سودبری سازنده</span>
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'markets'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>۳. شمول فارکس، کریپتو و طلا</span>
          </button>

          <button
            onClick={() => setActiveTab('risk_rules')}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'risk_rules'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>۴. اصول مدیریت ریسک و سرمایه</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 flex-1">
          {/* TAB 1: User 100% Liability & No Financial Advice */}
          {activeTab === 'rules' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>اصل اساسی: مسئولیت کامل سود، زیان و درستی تحلیل با شخص کاربر است</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  استفاده از این سامانه، ربات تلگرام، ربات بله و تمامی خروجی‌های تحلیلی، به منزله پذیرش قطعی، غیرقابل بازگشت و آگاهانه شرایط و قوانین زیر از سوی کاربر می‌باشد.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    ۱. ماهیت صرفاً کمک‌آموزشی و هوش مصنوعی (Educational & Analytical Tool)
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    تمامی ستاپ‌ها، نقاط ورود، تارگت‌های TP، حد ضررها و ارزیابی‌های روند، صرفاً حاصل محاسبات الگوریتمی ریاضی و مدل‌های پردازش هوش مصنوعی بر اساس دیتای گذشته بازار تریدینگ‌ویو هستند. این خروجی‌ها به هیچ عنوان و تحت هیچ شرایطی <b>پیشنهاد خرید و فروش قطعی، سیگنال تضمینی یا مشاوره مالی/سرمایه‌گذاری (Financial Advice)</b> تلقی نمی‌شوند.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    ۲. سلب مسئولیت کامل از صحت، دقت و خطاهای احتمالی بازار
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    بازارهای مالی همواره در معرض نوسانات شدید، اخبار پیش‌بینی‌نشده جهانی، فتیله‌های قیمتی (Wicks)، اسلیپیج صرافی و گپ‌های قیمتی هستند. هیچ تضمینی در خصوص وین‌ریت ۱۰۰٪ یا عدم وقوع ضرر وجود ندارد و توسعه‌دهنده/سازنده نرم‌افزار، هیچ مسئولیتی در قبال ضرر و زیان مستقیم یا غیرمستقیم حاصل از معاملات کاربر ندارد.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ۳. استقلال در تصمیم‌گیری و تایید نهایی کاربر
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    کاربر موظف است قبل از اقدام به هرگونه ترید روی حساب واقعی، تحلیل شخصی و مدیریت سرمایه خود را اعمال نموده و با اتکا به دانش خود تصمیم‌گیری نماید.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Zero Creator Gain */}
          {activeTab === 'creator_gain' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>شفافیت کامل مالی: سازنده هیچ سود و منفعتی از معاملات شما نمی‌برد</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  جهت جلوگیری از هرگونه شبهه حقوقی و مالی، به صراحت اعلام می‌گردد که این ابزار یک دستیار رایگان/تکنولوژیک است و سازنده در گردش مالی کاربران هیچ سهمی ندارد.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    عدم دریافت هیچ درصدی از سود یا کمیسیون
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    هیچ درصدی از سود معاملات کاربر (Profit Sharing)، هیچ کارمزدی از حجم معاملات و هیچ پورسانتی به سازنده تعلق نمی‌گیرد و پرداخت نمی‌شود.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-sky-400" />
                    عدم دسترسی به کیف‌پول، دارایی یا حساب صرافی
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    ربات و پنل هیچ‌گونه کلید خصوصی (Private Key)، دسترسی به API صرافی برای جابجایی وجه و یا نگهداری ارزها را ندارد. سرمایه شما منحصراً در صرافی/بروکر خودتان باقی می‌ماند.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-400" />
                    عدم وجود قرارداد مدیریت سرمایه یا سبدگردانی
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    این بستر فعالیت سبدگردانی، دریافت سرمایه از غیر، یا تضمین بازدهی ارائه نمی‌دهد و صرفاً ابزاری برای نمایش و ارسال داده‌های تکنیکال است.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    مصونیت کامل حقوقی توسعه‌دهنده
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    کاربر با استفاده از این ابزار حق هرگونه ادعای خسارت، دعوای حقوقی یا مالی علیه پلتفرم یا سازندگان را از خود سلب و ساقط می‌نماید.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Scope of Markets (Forex, Crypto, Gold, Stocks) */}
          {activeTab === 'markets' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-sky-300">
                  <Globe2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>شمول تمامی بازارهای تریدینگ‌ویو (ارزهای دیجیتال، فارکس، طلا، سهام)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  قوانین و سلب مسئولیت‌های ذکر شده، بدون استثنا شامل تمامی دارایی‌ها و بازارهای مالی قابل تحلیل در تریدینگ‌ویو می‌گردد:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">🪙 ۱. بازار ارزهای دیجیتال (Crypto / Futures)</span>
                    <span className="text-[10px] text-slate-500">BTC, ETH, SOL, Alts</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    نوسانات بازار کریپتو بسیار شدید و ۲۴ ساعته است. ترید قراردادهای فیوچرز و لوریج‌دار دارای ریسک لیکویید شدن آنی است.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300">🌍 ۲. بازار تبادلات ارزی فارکس (Forex Markets)</span>
                    <span className="text-[10px] text-slate-500">EUR/USD, GBP/USD, USD/JPY</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    معاملات جفت‌ارزهای بین‌المللی با اهرم‌های بروکرها و اخبار اقتصادی بانک‌های مرکزی (FOMC، نرخ بهره و NFP) همراه با گپ و لغزش قیمتی است.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-yellow-300">🥇 ۳. فلزات گرانبها و کامودیتی‌ها (Gold & Oil)</span>
                    <span className="text-[10px] text-slate-500">XAU/USD, Silver, Crude Oil</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    انس جهانی طلا (XAUUSD) دارای نوسانات سریع دلاری در دقایق انتشار خبر است که نیازمند مدیریت سخت‌گیرانه حد ضرر است.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">📈 ۴. سهام و شاخص‌های بین‌المللی (US Stocks & Indices)</span>
                    <span className="text-[10px] text-slate-500">NVDA, TSLA, NASDAQ, SPX</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    سهام شرکت‌های آمریکایی دارای ساعات بازگشایی و گپ‌های گزارش درآمد (Earnings) هستند که تحلیل‌های تکنیکال را با شوک‌های فاندامنتال مواجه می‌کند.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Mandatory Risk Rules */}
          {activeTab === 'risk_rules' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                  <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>توصیه‌های طلایی مدیریت ریسک و حفظ سرمایه (قوانین ایمنی ترید)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  رعایت این اصول ساده ضامن بقای حساب شما در بازارهای مالی است:
                </p>
              </div>

              <div className="space-y-2 text-slate-300 text-[11px]">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <b className="text-slate-100">تعیین همیشگی حد ضرر (Stop Loss):</b> هرگز بدون ست کردن استاپ‌لاس در صرافی یا بروکر وارد معامله نشوید.
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <b className="text-slate-100">محدودیت ۱ تا ۳ درصد ریسک در هر معامله:</b> هرگز در یک معامله بیشتر از ۲٪ کل موجودی حسابتان را به خطر نیندازید.
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <b className="text-slate-100">سیو سود پله‌ای و ریسک‌فری:</b> پس از رسیدن قیمت به تارگت اول (TP1)، بخشی از حجم را نقد کرده و استاپ‌لاس را به نقطه ورود (Breakeven) انتقال دهید.
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <b className="text-slate-100">قانون طلایی سرمایه اضطراری:</b> هرگز با پولی که از دست دادن آن به زندگی روزمره شما آسیب می‌زند، ترید نکنید.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 text-center sm:text-right">
            <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>با ادامه استفاده از ربات، توافق‌نامه حقوقی و شرایط فوق را می‌پذیرید.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAccept ? (
              <button
                id="accept-legal-rules-btn"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>قوانین را مطالعه کردم و می‌پذیرم</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
              >
                بستن پنجره
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
