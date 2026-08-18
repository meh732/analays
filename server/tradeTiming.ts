export type TradeTimeHorizon = 'scalp_minutes' | 'intraday_hours' | 'swing_days' | 'position_weeks';

export interface TradeTimingDetails {
  horizon: TradeTimeHorizon;
  horizonLabelFa: string;
  horizonLabelEn: string;
  entryValidityWindowFa: string;
  estimatedHoldingTimeFa: string;
  estimatedHoldingTimeEn: string;
  tp1EstimatedTimeFa: string;
  tp2EstimatedTimeFa: string;
  tp3EstimatedTimeFa: string;
  invalidationTimeoutFa: string;
}

/**
 * Infer or calculate trade timing details based on user selected horizon and timeframe
 */
export function calculateTradeTiming(
  timeHorizon?: TradeTimeHorizon | string,
  timeframe?: string
): TradeTimingDetails {
  let resolvedHorizon: TradeTimeHorizon = 'intraday_hours';

  if (timeHorizon) {
    if (timeHorizon === 'scalp_minutes' || timeHorizon === 'scalp' || timeHorizon === 'minutes') {
      resolvedHorizon = 'scalp_minutes';
    } else if (timeHorizon === 'intraday_hours' || timeHorizon === 'intraday' || timeHorizon === 'hours') {
      resolvedHorizon = 'intraday_hours';
    } else if (timeHorizon === 'swing_days' || timeHorizon === 'swing' || timeHorizon === 'days') {
      resolvedHorizon = 'swing_days';
    } else if (timeHorizon === 'position_weeks' || timeHorizon === 'position' || timeHorizon === 'weeks') {
      resolvedHorizon = 'position_weeks';
    }
  } else if (timeframe) {
    // Infer from timeframe
    if (timeframe === '1m' || timeframe === '5m' || timeframe === '15m') {
      resolvedHorizon = 'scalp_minutes';
    } else if (timeframe === '1h' || timeframe === '4h') {
      resolvedHorizon = 'intraday_hours';
    } else if (timeframe === '1D') {
      resolvedHorizon = 'swing_days';
    } else {
      resolvedHorizon = 'position_weeks';
    }
  }

  switch (resolvedHorizon) {
    case 'scalp_minutes':
      return {
        horizon: 'scalp_minutes',
        horizonLabelFa: '⚡ اسکلپ سریع (۵ الی ۳۰ دقیقه)',
        horizonLabelEn: 'Fast Scalp (5 to 30 mins)',
        entryValidityWindowFa: 'معتبر برای ورود تا ۱۵ الی ۳۰ دقیقه آینده',
        estimatedHoldingTimeFa: '۱۵ الی ۴۵ دقیقه',
        estimatedHoldingTimeEn: '15 to 45 minutes',
        tp1EstimatedTimeFa: '۵ الی ۱۵ دقیقه',
        tp2EstimatedTimeFa: '۱۵ الی ۳۰ دقیقه',
        tp3EstimatedTimeFa: '۳۰ الی ۶۰ دقیقه',
        invalidationTimeoutFa: 'ابطال ستاپ در صورت عدم لمس نقطه ورود تا ۱ ساعت آینده',
      };

    case 'intraday_hours':
      return {
        horizon: 'intraday_hours',
        horizonLabelFa: '⏱️ معاملات درون‌روز (۱ الی ۴ ساعت)',
        horizonLabelEn: 'Intraday (1 to 4 hours)',
        entryValidityWindowFa: 'معتبر برای ورود تا ۱ الی ۲ ساعت آینده',
        estimatedHoldingTimeFa: '۱ الی ۶ ساعت',
        estimatedHoldingTimeEn: '1 to 6 hours',
        tp1EstimatedTimeFa: '۳۰ الی ۶۰ دقیقه',
        tp2EstimatedTimeFa: '۱ الی ۳ ساعت',
        tp3EstimatedTimeFa: '۳ الی ۶ ساعت',
        invalidationTimeoutFa: 'ابطال ستاپ در صورت عدم لمس نقطه ورود تا ۴ ساعت آینده',
      };

    case 'swing_days':
      return {
        horizon: 'swing_days',
        horizonLabelFa: '📅 سوینگ چندروزه (۱ الی ۳ روز)',
        horizonLabelEn: 'Swing Trading (1 to 3 days)',
        entryValidityWindowFa: 'معتبر برای ورود تا ۶ الی ۱۲ ساعت آینده',
        estimatedHoldingTimeFa: '۱ الی ۳ روز',
        estimatedHoldingTimeEn: '1 to 3 days',
        tp1EstimatedTimeFa: '۸ الی ۱۶ ساعت',
        tp2EstimatedTimeFa: '۱ الی ۲ روز',
        tp3EstimatedTimeFa: '۲ الی ۴ روز',
        invalidationTimeoutFa: 'ابطال ستاپ در صورت عدم لمس نقطه ورود تا ۲۴ ساعت آینده',
      };

    case 'position_weeks':
      return {
        horizon: 'position_weeks',
        horizonLabelFa: '🗓️ پوزیشن هفتگی / میان‌مدت (۱ الی ۲ هفته)',
        horizonLabelEn: 'Position Trading (1 to 2 weeks)',
        entryValidityWindowFa: 'معتبر برای ورود تا ۲۴ الی ۴۸ ساعت آینده',
        estimatedHoldingTimeFa: '۱ الی ۲ هفته',
        estimatedHoldingTimeEn: '1 to 2 weeks',
        tp1EstimatedTimeFa: '۲ الی ۴ روز',
        tp2EstimatedTimeFa: '۵ الی ۸ روز',
        tp3EstimatedTimeFa: '۱۰ الی ۱۵ روز',
        invalidationTimeoutFa: 'ابطال ستاپ در صورت عدم لمس نقطه ورود تا ۳ روز آینده',
      };
  }
}
