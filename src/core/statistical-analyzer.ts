import * as ss from 'simple-statistics';
import type { TTestResult, StatisticalComparison, VersionResult, TestCaseResult } from '../types/test.js';

/**
 * StatisticalAnalyzer performs statistical analysis on test results
 */
export class StatisticalAnalyzer {
  /**
   * Perform independent two-sample t-test
   * Tests whether the means of two samples are significantly different
   */
  static tTest(sampleA: number[], sampleB: number[]): TTestResult {
    const meanA = ss.mean(sampleA);
    const meanB = ss.mean(sampleB);
    const difference = meanB - meanA;
    
    // Calculate standard deviations
    const stdDevA = sampleA.length > 1 ? ss.standardDeviation(sampleA) : 0;
    const stdDevB = sampleB.length > 1 ? ss.standardDeviation(sampleB) : 0;
    
    // Sample sizes
    const nA = sampleA.length;
    const nB = sampleB.length;
    
    // Calculate pooled standard error
    // For unequal variances (Welch's t-test approximation)
    const seA = stdDevA / Math.sqrt(nA);
    const seB = stdDevB / Math.sqrt(nB);
    const standardError = Math.sqrt(seA * seA + seB * seB);
    
    // Calculate t-statistic
    const tStatistic = standardError > 0 ? difference / standardError : 0;
    
    // Approximate degrees of freedom (Welch-Satterthwaite equation)
    let degreesOfFreedom = nA + nB - 2;
    if (stdDevA > 0 && stdDevB > 0) {
      const varA = stdDevA * stdDevA;
      const varB = stdDevB * stdDevB;
      const num = Math.pow(varA / nA + varB / nB, 2);
      const den = (varA * varA) / (nA * nA * (nA - 1)) + (varB * varB) / (nB * nB * (nB - 1));
      degreesOfFreedom = den > 0 ? num / den : nA + nB - 2;
    }
    
    // Calculate p-value using t-distribution approximation
    // Using a simplified approximation for the t-distribution CDF
    const pValue = this.calculatePValue(Math.abs(tStatistic), degreesOfFreedom);
    
    // 95% confidence interval
    const criticalValue = this.getTCriticalValue(degreesOfFreedom);
    const marginOfError = criticalValue * standardError;
    const confidenceInterval: [number, number] = [
      Number((difference - marginOfError).toFixed(4)),
      Number((difference + marginOfError).toFixed(4))
    ];
    
    return {
      meanA: Number(meanA.toFixed(4)),
      meanB: Number(meanB.toFixed(4)),
      difference: Number(difference.toFixed(4)),
      pValue: Number(pValue.toFixed(6)),
      significant: pValue < 0.05,
      confidenceInterval,
      sampleSizeA: nA,
      sampleSizeB: nB,
    };
  }

  /**
   * Compare two version results statistically
   */
  static compareVersions(resultA: VersionResult, resultB: VersionResult): StatisticalComparison {
    // Filter only successful test cases
    const successfulA = resultA.testCases.filter(tc => tc.success);
    const successfulB = resultB.testCases.filter(tc => tc.success);

    // Extract metrics for comparison
    const latencyA = successfulA.map(tc => tc.latency);
    const latencyB = successfulB.map(tc => tc.latency);

    const costA = successfulA.map(tc => tc.cost);
    const costB = successfulB.map(tc => tc.cost);

    // Total tokens (input + output)
    const tokensA = successfulA.map(tc => tc.inputTokens + tc.outputTokens);
    const tokensB = successfulB.map(tc => tc.inputTokens + tc.outputTokens);

    return {
      latency: this.tTest(latencyA, latencyB),
      cost: this.tTest(costA, costB),
      tokens: this.tTest(tokensA, tokensB),
    };
  }

  /**
   * Calculate p-value from t-statistic and degrees of freedom
   * Uses an approximation of the t-distribution CDF
   */
  private static calculatePValue(tStat: number, df: number): number {
    if (tStat === 0) return 1;
    if (df <= 0) return 1;
    
    // Use the fact that t^2 follows F(1, df) distribution
    // For large df, t-distribution approximates normal
    if (df > 30) {
      // Normal approximation
      const z = tStat;
      // Error function approximation for normal CDF
      const p = 0.5 * (1 + this.erf(z / Math.sqrt(2)));
      return 2 * (1 - p); // Two-tailed test
    }
    
    // For smaller df, use a simplified approximation
    // This is a rough approximation using the relationship between t and F distributions
    const x = df / (df + tStat * tStat);
    // Incomplete beta function approximation
    const p = 0.5 * this.incompleteBeta(x, df / 2, 0.5);
    return Math.min(2 * p, 1); // Two-tailed, capped at 1
  }

  /**
   * Approximation of the error function
   */
  private static erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);

    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return sign * y;
  }

  /**
   * Approximation of the incomplete beta function
   * Simplified for use in t-distribution CDF
   */
  private static incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    // For small x, use series expansion
    if (x < (a + 1) / (a + b + 2)) {
      return this.betaContinuedFraction(x, a, b);
    }
    
    // Use symmetry relation
    return 1 - this.betaContinuedFraction(1 - x, b, a);
  }

  /**
   * Continued fraction approximation for incomplete beta
   */
  private static betaContinuedFraction(x: number, a: number, b: number): number {
    const maxIterations = 200;
    const epsilon = 1e-10;
    
    let am = 1;
    let bm = 1;
    let az = 1;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let bz = 1 - qab * x / qap;
    
    for (let m = 1; m <= maxIterations; m++) {
      const m2 = 2 * m;
      let d = m * (b - m) * x / ((qam + m2) * (a + m2));
      const ap = az + d * am;
      const bp = bz + d * bm;
      d = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      const app = ap + d * az;
      const bpp = bp + d * bz;
      const aold = az;
      am = ap / bpp;
      bm = bp / bpp;
      az = app / bpp;
      bz = 1;
      
      if (Math.abs(az - aold) < epsilon * Math.abs(az)) {
        break;
      }
    }
    
    return az * Math.pow(x, a) * Math.pow(1 - x, b) / a;
  }

  /**
   * Get critical t-value for 95% confidence (two-tailed)
   * Uses approximation of t-distribution quantile
   */
  private static getTCriticalValue(df: number): number {
    // For large df, approaches 1.96 (normal distribution)
    if (df > 100) return 1.96;
    
    // Approximate critical values for common df
    const criticalValues: Record<number, number> = {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
      11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
      16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
      21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
      26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
    };
    
    if (df in criticalValues) {
      return criticalValues[df];
    }
    
    // Linear interpolation for intermediate values
    const lower = Math.floor(df);
    const upper = Math.ceil(df);
    if (lower >= 1 && upper <= 30) {
      const t1 = criticalValues[lower];
      const t2 = criticalValues[upper];
      return t1 + (t2 - t1) * (df - lower);
    }
    
    return 1.96;
  }
}
