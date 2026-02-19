const { getPrimaryCategory } = require('./category-rules');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
}

function runTests() {

  // Sculpture cannot become Works on Paper
  assert(
    getPrimaryCategory({ objectType: 'sculpture' }) !== 'Works on Paper',
    'Sculpture misclassified as Works on Paper'
  );

  // Dress cannot become Decorative Arts
  assert(
    getPrimaryCategory({ objectType: 'dress' }) === 'Costume & Textiles',
    'Dress misclassified'
  );

  // Architectural drawing cannot become Drawing
  assert(
    getPrimaryCategory({ classification: 'architectural drawing' }) === 'Architecture',
    'Architectural drawing misclassified'
  );

  // Poster cannot become Photography
  assert(
    getPrimaryCategory({ classification: 'poster' }) === 'Works on Paper',
    'Poster misclassified'
  );

  // Photograph cannot become Print
  assert(
    getPrimaryCategory({ objectType: 'photograph' }) === 'Photography',
    'Photograph misclassified'
  );

  console.log('✅ ALL TESTS PASSED');
}

runTests();
