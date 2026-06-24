/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {T} data
 * @property {number} status
 * @property {string} [message] - Optional message property
 */

/**
 * @typedef {Object} Post
 * @property {number} id
 * @property {string} title
 * @property {string} content
 * @property {number} authorId
 */

// Since JSDoc lives purely in comments, we export an empty object 
// or utility constants if needed so the file counts as an ES Module.
export default {};