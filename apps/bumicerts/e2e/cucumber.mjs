export default {
  paths: ['e2e/features/**/*.feature'],
  import: ['e2e/.e2e-dist/step-definitions/**/*.js', 'e2e/.e2e-dist/support/**/*.js'],
  format: ['progress-bar', 'html:reports/e2e.html'],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  dryRun: false,
  failFast: false,
  strict: true,
}
