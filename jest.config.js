module.exports = {
  "testEnvironment": "node",
  testRegex: './test/.+\\.js$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/fixtures/',
  ],
  testURL: 'http://localhost/'
}