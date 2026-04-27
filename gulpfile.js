const { src, dest, task } = require('gulp');

task('build:icons', () =>
  src('nodes/**/*.{svg,png}').pipe(dest('dist/nodes')),
);
