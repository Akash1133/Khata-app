'use client';

/**
 * scoreEngine.js — Business Intelligence Algorithm
 *
 * Profit Score (0–100) with 5 weighted signals:
 *   1. Profit Growth     (30%) — last 7d vs prior 7d
 *   2. Margin %          (25%) — avg sell margin on products sold
 *   3. Sales Consistency (15%) — days with sales in last 14d
 *   4. Product Diversity (15%) — how spread revenue is across products
 *   5. Expense Ratio     (15%) — cost of goods sold vs revenue
 */

// ── Clamp to [0, 1]
const norm = (v) => Math.max(0, Math.min(1, v));

// ── Score label + color based on final score
export function getScoreLabel(score) {
  if (score >= 80) return { label: 'Strong Business', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', emoji: '🟢', tier: 'strong' };
  if (score >= 60) return { label: 'Stable — Room to Grow', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '🟡', tier: 'stable' };
  if (score >= 40) return { label: 'Needs Attention', color: '#f97316', bg: 'rgba(249,115,22,0.12)', emoji: '🟠', tier: 'caution' };
  return { label: 'Critical — Act Now', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', emoji: '🔴', tier: 'critical' };
}

// ── Smart insight messages per component
export function getComponentInsight(key, rawScore, data) {
  const pct = Math.round(rawScore * 100);
  switch (key) {
    case 'profitGrowth':
      if (rawScore >= 0.75) return `Profit grew ${data.growthPct?.toFixed(0)}% vs last week 🚀`;
      if (rawScore >= 0.5) return `Profit is stable compared to last week`;
      if (data.prev7profit === 0) return `No sales last week to compare against`;
      return `Profit dropped ${Math.abs(data.growthPct)?.toFixed(0)}% vs last week`;
    case 'margin':
      if (rawScore >= 0.75) return `Healthy avg margin of ${data.avgMargin?.toFixed(1)}%`;
      if (rawScore >= 0.5) return `Margin is ${data.avgMargin?.toFixed(1)}% — consider pricing`;
      return `Low margin at ${data.avgMargin?.toFixed(1)}% — review buy prices`;
    case 'consistency':
      return `Sold on ${data.activeDays}/14 days — ${rawScore >= 0.7 ? 'consistent traffic' : 'boost daily sales'}`;
    case 'diversity':
      if (rawScore >= 0.75) return `Revenue well spread across products`;
      return `${data.topProductPct?.toFixed(0)}% of revenue from 1 product — diversify`;
    case 'expenseRatio':
      if (rawScore >= 0.75) return `Cost at ${data.expenseRatio?.toFixed(0)}% of revenue — very efficient`;
      if (rawScore >= 0.5) return `Cost is ${data.expenseRatio?.toFixed(0)}% of revenue`;
      return `High cost at ${data.expenseRatio?.toFixed(0)}% of revenue — margins at risk`;
    default:
      return '';
  }
}

/**
 * Main score calculator.
 * @param {Array} transactions — all transactions from TransactionStore.getAll()
 * @param {Array} products     — all products from ProductStore.getAll()
 * @returns {{ score, grade, components, topProducts, recommendations }}
 */
export function computeBusinessScore(transactions, products) {
  const now = new Date();
  const dayMs = 86400000;

  const saleOf = (t) => t.type === 'sale';
  const inWindow = (t, daysBack, daysEnd = 0) => {
    const d = new Date(t.date).getTime();
    const end = now.getTime() - daysEnd * dayMs;
    const start = now.getTime() - daysBack * dayMs;
    return d >= start && d <= end;
  };

  // ── Raw data slices
  const last7Sales   = transactions.filter(t => saleOf(t) && inWindow(t, 7));
  const prev7Sales   = transactions.filter(t => saleOf(t) && inWindow(t, 14, 7));
  const last14Sales  = transactions.filter(t => saleOf(t) && inWindow(t, 14));

  const sumProfit = (txns) => txns.reduce((acc, t) => {
    return acc + (t.items || []).reduce((s, item) => {
      const buy = item.buyPrice ?? item.product?.buyPrice ?? 0;
      return s + (Number(item.price) - Number(buy)) * Number(item.quantity);
    }, 0);
  }, 0);

  const sumRevenue = (txns) => txns.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const last7profit  = sumProfit(last7Sales);
  const prev7profit  = sumProfit(prev7Sales);
  const last7revenue = sumRevenue(last7Sales);

  // ── 1. Profit Growth (30%)
  let growthPct = 0;
  let growthScore = 0.5; // neutral if no prior data
  if (prev7profit > 0) {
    growthPct = ((last7profit - prev7profit) / Math.abs(prev7profit)) * 100;
    // +50% growth → 1.0, -50% or worse → 0
    growthScore = norm((growthPct + 50) / 100);
  } else if (last7profit > 0) {
    growthScore = 0.85; // first week with profit is great
  }

  // ── 2. Margin % (25%)
  let totalCogs = 0, totalRev7 = 0;
  last7Sales.forEach(t => {
    totalRev7 += Number(t.amount || 0);
    (t.items || []).forEach(item => {
      const buy = Number(item.buyPrice ?? item.product?.buyPrice ?? 0);
      totalCogs += buy * Number(item.quantity);
    });
  });
  const avgMargin = totalRev7 > 0 ? ((totalRev7 - totalCogs) / totalRev7) * 100 : 0;
  // 50%+ margin → perfect, 0% → 0
  const marginScore = norm(avgMargin / 50);

  // ── 3. Sales Consistency (15%)
  const activeDaysSet = new Set(
    last14Sales.map(t => new Date(t.date).toDateString())
  );
  const activeDays = activeDaysSet.size;
  const consistencyScore = norm(activeDays / 12); // 12/14 days = perfect

  // ── 4. Product Diversity (15%)
  // If top product > 80% of revenue → risky. <30% → great.
  const prodRevMap = {};
  last7Sales.forEach(t => {
    (t.items || []).forEach(item => {
      const name = item.product?.name || 'Unknown';
      prodRevMap[name] = (prodRevMap[name] || 0) + Number(item.price) * Number(item.quantity);
    });
  });
  const revenues = Object.values(prodRevMap);
  const totalProdRev = revenues.reduce((a, b) => a + b, 0);
  const topProductRev = revenues.length > 0 ? Math.max(...revenues) : 0;
  const topProductPct = totalProdRev > 0 ? (topProductRev / totalProdRev) * 100 : 0;
  // 100% concentration → 0, 20% concentration → 1
  const diversityScore = norm(1 - (topProductPct - 20) / 80);

  // ── 5. Expense Ratio (15%)
  // expenseRatio = COGS / Revenue. Lower is better.
  const expenseRatio = last7revenue > 0 ? (totalCogs / last7revenue) * 100 : 100;
  // 0% expense → perfect (impossible), 50% → 0.5, 100%+ → 0
  const expenseScore = norm(1 - expenseRatio / 100);

  // ── Weighted final score
  const weights = { profitGrowth: 0.30, margin: 0.25, consistency: 0.15, diversity: 0.15, expenseRatio: 0.15 };
  const rawScores = { profitGrowth: growthScore, margin: marginScore, consistency: consistencyScore, diversity: diversityScore, expenseRatio: expenseScore };

  const finalRaw = Object.entries(weights).reduce((acc, [k, w]) => acc + rawScores[k] * w, 0);
  const score = Math.round(finalRaw * 100);

  // ── Component data for display
  const componentData = {
    profitGrowth: { growthPct, last7profit, prev7profit },
    margin: { avgMargin, totalCogs, totalRev7 },
    consistency: { activeDays },
    diversity: { topProductPct },
    expenseRatio: { expenseRatio },
  };

  const components = Object.entries(rawScores).map(([key, raw]) => ({
    key,
    label: {
      profitGrowth: 'Profit Growth',
      margin: 'Profit Margin',
      consistency: 'Sales Consistency',
      diversity: 'Product Diversity',
      expenseRatio: 'Expense Efficiency',
    }[key],
    weight: Math.round(weights[key] * 100),
    score: Math.round(raw * 100),
    rawScore: raw,
    insight: getComponentInsight(key, raw, componentData[key]),
    contribution: Math.round(raw * weights[key] * 100),
  }));

  // ── Top products by "opportunity score": margin × velocity
  // Compute for all products with sales in last 30 days
  const last30Sales = transactions.filter(t => saleOf(t) && inWindow(t, 30));
  const productScoreMap = {};

  last30Sales.forEach(t => {
    (t.items || []).forEach(item => {
      const name = item.product?.name || 'Unknown';
      const buy = Number(item.buyPrice ?? item.product?.buyPrice ?? 0);
      const sell = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      const margin = sell > 0 ? ((sell - buy) / sell) * 100 : 0;
      const profit = (sell - buy) * qty;

      if (!productScoreMap[name]) {
        productScoreMap[name] = {
          name,
          qtySold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          margin,
          sell,
          buy,
          category: item.product?.category || '',
        };
      }
      productScoreMap[name].qtySold += qty;
      productScoreMap[name].totalRevenue += sell * qty;
      productScoreMap[name].totalProfit += profit;
    });
  });

  // Normalize qtySold and profit across products
  const allProds = Object.values(productScoreMap);
  const maxQty = Math.max(...allProds.map(p => p.qtySold), 1);
  const maxProfit = Math.max(...allProds.map(p => p.totalProfit), 1);

  const topProducts = allProds
    .map(p => ({
      ...p,
      // opportunity score: 60% profit contribution + 40% sales velocity
      opportunityScore: Math.round(
        (norm(p.totalProfit / maxProfit) * 0.6 + norm(p.qtySold / maxQty) * 0.4) * 100
      ),
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);

  // ── Smart recommendations
  const recommendations = [];
  if (growthScore < 0.5 && prev7profit > 0) {
    recommendations.push({ icon: '📉', text: `Profit fell ${Math.abs(growthPct).toFixed(0)}% this week. Review what changed in sales or costs.`, priority: 'high' });
  }
  if (marginScore < 0.4) {
    recommendations.push({ icon: '💸', text: `Avg margin is ${avgMargin.toFixed(1)}%. Try increasing sell prices or negotiate lower buy prices.`, priority: 'high' });
  }
  if (topProductPct > 70 && revenues.length > 1) {
    const topName = Object.entries(prodRevMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    recommendations.push({ icon: '⚖️', text: `${topProductPct.toFixed(0)}% of revenue comes from "${topName}". Push other products to reduce risk.`, priority: 'medium' });
  }
  if (consistencyScore < 0.5) {
    recommendations.push({ icon: '📅', text: `Only ${activeDays} of 14 days had sales. Try daily promotions or flash discounts.`, priority: 'medium' });
  }
  if (expenseScore < 0.4) {
    recommendations.push({ icon: '🏭', text: `Cost of goods is ${expenseRatio.toFixed(0)}% of revenue. Look for bulk purchase discounts.`, priority: 'high' });
  }
  if (topProducts.length > 0 && recommendations.length < 3) {
    recommendations.push({ icon: '🚀', text: `Stock more of "${topProducts[0].name}" — your highest opportunity product.`, priority: 'low' });
  }

  return {
    score,
    grade: getScoreLabel(score),
    components,
    topProducts,
    recommendations,
    meta: { last7profit, prev7profit, avgMargin, activeDays, last7revenue, totalCogs },
  };
}
