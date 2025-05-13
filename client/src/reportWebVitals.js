/**
 * @fileoverview Performance reporting utility for Core Web Vitals
 * Collects and reports performance metrics to help analyze user experience
 */

/**
 * Report web vitals metrics to the provided callback function
 * 
 * @param {Function} onPerfEntry - Callback to handle performance entries
 * 
 * @example
 * // Log vitals to console
 * reportWebVitals(console.log);
 * 
 * // Send vitals to analytics
 * reportWebVitals((metric) => {
 *   sendToAnalytics(metric);
 * });
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // Dynamically import web-vitals to reduce bundle size
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Cumulative Layout Shift
      getCLS(onPerfEntry);
      // First Input Delay
      getFID(onPerfEntry);
      // First Contentful Paint
      getFCP(onPerfEntry);
      // Largest Contentful Paint
      getLCP(onPerfEntry);
      // Time to First Byte
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;