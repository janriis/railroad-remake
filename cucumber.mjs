const common = {
  import: ['features/support/**/*.ts', 'features/steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  strict: true,
};

export default {
  ...common,
  tags: 'not @wip',
  format: ['progress-bar', 'html:reports/cucumber.html', 'summary'],
};

// Backlog: scenarios specified but not yet implemented.
export const wip = {
  ...common,
  tags: '@wip',
  format: ['progress'],
};
