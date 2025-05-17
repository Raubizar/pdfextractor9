
/**
 * Validation result types and utilities
 */

/**
 * Create a validation result object
 * @param {boolean} valid Whether the validation passed
 * @param {number} confidence Confidence score (0-1)
 * @param {string} reason Reason for the validation result
 * @returns {object} Validation result object
 */
export function createValidationResult(valid, confidence, reason) {
  return {
    valid,
    confidence,
    reason
  };
}

/**
 * Create a failed validation result
 * @param {string} reason Reason for failure
 * @returns {object} Failed validation result
 */
export function createFailedValidation(reason = 'Invalid value') {
  return createValidationResult(false, 0, reason);
}

/**
 * Create a successful validation result
 * @param {number} confidence Confidence score (0-1)
 * @param {string} reason Reason for success
 * @returns {object} Successful validation result
 */
export function createSuccessfulValidation(confidence, reason = 'Valid value') {
  return createValidationResult(true, confidence, reason);
}
