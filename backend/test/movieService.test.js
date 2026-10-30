const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  filterMovies,
  parseMinRating,
  parseSortBy,
  sortMovies,
  formatMovieScore,
  formatDateSpanish,
  calculateCatalogMetrics,
  validateMovie
} = require('../services/movieService');

// Datos de prueba controlados
const mockMovies = [
  {
    id: 1,
    title: 'Dune: Parte Dos',
    original_title: 'Dune: Part Two',
    overview: 'Viaje mítico de Paul Atreides en el desierto de Arrakis.',
    release_date: '2024-03-01',
    vote_average: 8.2,
    category: ['trending', 'popular', 'top_rated'],
    genres: ['Ciencia Ficción', 'Aventura']
  },
  {
    id: 2,
    title: 'Del Revés 2',
    original_title: 'Inside Out 2',
    overview: 'Nuevas emociones llegan a la mente de Riley.',
    release_date: '2024-06-14',
    vote_average: 7.6,
    category: ['trending', 'popular'],
    genres: ['Animación', 'Familia', 'Comedia']
  },
  {
    id: 3,
    title: 'Joker: Folie à Deux',
    original_title: 'Joker: Folie à Deux',
    overview: 'Arthur Fleck en el juicio por sus crímenes en Gotham.',
    release_date: '2024-10-04',
    vote_average: 5.6,
    category: ['popular'],
    genres: ['Drama', 'Crimen', 'Suspenso']
  },
  {
    id: 4,
    title: 'Película de Bajo Puntaje',
    original_title: 'Low Score Movie',
    overview: 'Una película experimental sin mucho éxito de taquilla.',
    release_date: '2023-01-10',
    vote_average: 4.2,
    category: ['upcoming'],
    genres: ['Drama']
  }
];

describe('Pruebas Unitarias: movieService', () => {

  describe('filterMovies()', () => {
    it('debe devolver todas las películas si no se aplican filtros', () => {
      const results = filterMovies(mockMovies);
      assert.equal(results.length, 4);
    });

    it('debe filtrar correctamente por categoría (ej. trending)', () => {
      const results = filterMovies(mockMovies, { category: 'trending' });
      assert.equal(results.length, 2);
      assert.ok(results.some(m => m.id === 1));
      assert.ok(results.some(m => m.id === 2));
    });

    it('debe filtrar correctamente por género (insensible a mayúsculas/minúsculas)', () => {
      const results = filterMovies(mockMovies, { genre: 'animación' });
      assert.equal(results.length, 1);
      assert.equal(results[0].title, 'Del Revés 2');
    });

    it('debe devolver todas las películas si el género es "all"', () => {
      const results = filterMovies(mockMovies, { genre: 'all' });
      assert.equal(results.length, 4);
    });

    it('debe buscar por coincidencia en título o sinopsis', () => {
      const byTitle = filterMovies(mockMovies, { search: 'Dune' });
      assert.equal(byTitle.length, 1);
      assert.equal(byTitle[0].id, 1);

      const byOverview = filterMovies(mockMovies, { search: 'Arrakis' });
      assert.equal(byOverview.length, 1);
      assert.equal(byOverview[0].id, 1);
    });

    it('debe combinar múltiples filtros (categoría + género + búsqueda)', () => {
      const results = filterMovies(mockMovies, {
        category: 'popular',
        genre: 'Drama',
        search: 'Arthur'
      });
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 3);
    });

    it('debe manejar entradas vacías o inválidas sin lanzar error', () => {
      assert.deepEqual(filterMovies(null), []);
      assert.deepEqual(filterMovies(undefined), []);
      assert.deepEqual(filterMovies('no-es-arreglo'), []);
    });

    it('AC-06.1 filtra por calificación mínima (vote_average >= minRating, inclusivo)', () => {
      const results = filterMovies(mockMovies, { minRating: 7.6 });
      assert.deepEqual(results.map(m => m.id), [1, 2]);

      assert.equal(filterMovies(mockMovies, { minRating: 0 }).length, 4);
      assert.equal(filterMovies(mockMovies, { minRating: 10 }).length, 0);
    });

    it('AC-06.2 combina minRating con categoría, género y búsqueda (AND)', () => {
      assert.deepEqual(
        filterMovies(mockMovies, { category: 'popular', minRating: 7 }).map(m => m.id),
        [1, 2]
      );
      assert.deepEqual(
        filterMovies(mockMovies, { genre: 'Drama', minRating: 5 }).map(m => m.id),
        [3]
      );
      assert.deepEqual(
        filterMovies(mockMovies, { search: 'Arthur', minRating: 6 }),
        []
      );
      assert.deepEqual(
        filterMovies(mockMovies, {
          category: 'trending', genre: 'Aventura', search: 'Dune', minRating: 8
        }).map(m => m.id),
        [1]
      );
    });

    it('AC-06.4 sin minRating el resultado es idéntico al de FR-01', () => {
      assert.deepEqual(filterMovies(mockMovies, {}), mockMovies);
      assert.deepEqual(
        filterMovies(mockMovies, { category: 'popular', minRating: undefined }),
        filterMovies(mockMovies, { category: 'popular' })
      );
    });

    it('NFR-02 filtrar por minRating no muta el catálogo de entrada', () => {
      const snapshot = JSON.parse(JSON.stringify(mockMovies));
      filterMovies(mockMovies, { minRating: 8 });
      assert.deepEqual(mockMovies, snapshot);
    });
  });

  describe('parseMinRating()', () => {
    it('AC-06.4 parámetro ausente es válido y sin efecto', () => {
      assert.deepEqual(parseMinRating(undefined), { valid: true, value: null, error: null });
    });

    it('AC-06.1 acepta notación decimal simple dentro de 0–10', () => {
      for (const [raw, expected] of [['0', 0], ['7', 7], ['7.5', 7.5], ['10', 10], ['10.0', 10]]) {
        const parsed = parseMinRating(raw);
        assert.equal(parsed.valid, true, `"${raw}" debería ser válido`);
        assert.equal(parsed.value, expected);
        assert.equal(parsed.error, null);
      }
    });

    it('AC-06.3 rechaza valores no numéricos, fuera de rango o repetidos', () => {
      const invalidInputs = [
        'abc', '7a', '1e1', '0x5', 'Infinity', '', ' ', '-1', '10.1', '11', 'NaN',
        ' 7', '+7', ['7', '8'], { a: '1' }, null
      ];
      for (const raw of invalidInputs) {
        const parsed = parseMinRating(raw);
        assert.equal(parsed.valid, false, `${JSON.stringify(raw)} debería ser inválido`);
        assert.equal(parsed.value, null);
        assert.equal(typeof parsed.error, 'string');
        assert.ok(parsed.error.length > 0);
      }
    });
  });

  describe('sortMovies()', () => {
    // Catálogo con empates en vote_average y release_date para verificar estabilidad
    const tieMovies = [
      { id: 10, vote_average: 7.0, release_date: '2020-01-01' },
      { id: 11, vote_average: 8.5, release_date: '2022-05-05' },
      { id: 12, vote_average: 7.0, release_date: '2024-02-02' },
      { id: 13, vote_average: 8.5, release_date: '2020-01-01' },
      { id: 14, vote_average: 9.1, release_date: '2022-05-05' }
    ];

    it('AC-07.1 ordena por vote_average descendente con sortBy="rating"', () => {
      assert.deepEqual(sortMovies(mockMovies, 'rating').map(m => m.id), [1, 2, 3, 4]);
      const scores = sortMovies(tieMovies, 'rating').map(m => m.vote_average);
      assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    });

    it('AC-07.2 ordena por release_date descendente (más reciente primero) con sortBy="release_date"', () => {
      assert.deepEqual(sortMovies(mockMovies, 'release_date').map(m => m.id), [3, 2, 1, 4]);
    });

    it('AC-07.3 los empates conservan el orden original (orden estable)', () => {
      assert.deepEqual(sortMovies(tieMovies, 'rating').map(m => m.id), [14, 11, 13, 10, 12]);
      assert.deepEqual(sortMovies(tieMovies, 'release_date').map(m => m.id), [12, 11, 14, 10, 13]);
    });

    it('AC-07.5 sin sortBy se conserva el orden original', () => {
      assert.deepEqual(sortMovies(mockMovies), mockMovies);
      assert.deepEqual(sortMovies(mockMovies, null), mockMovies);
      assert.deepEqual(sortMovies(mockMovies, undefined), mockMovies);
    });

    it('AC-07.6 se aplica después de filtrar (combina con categoría, género, búsqueda y minRating)', () => {
      const filtered = filterMovies(mockMovies, { category: 'popular', minRating: 5 });
      assert.deepEqual(sortMovies(filtered, 'rating').map(m => m.id), [1, 2, 3]);
      assert.deepEqual(sortMovies(filtered, 'release_date').map(m => m.id), [3, 2, 1]);
      assert.deepEqual(
        sortMovies(filterMovies(mockMovies, { genre: 'Drama' }), 'release_date').map(m => m.id),
        [3, 4]
      );
      assert.deepEqual(
        sortMovies(filterMovies(mockMovies, { search: 'zzz-sin-coincidencias' }), 'rating'),
        []
      );
    });

    it('películas sin valor de orden válido quedan al final en su orden original', () => {
      const partial = [
        { id: 1, vote_average: null, release_date: '' },
        { id: 2, vote_average: 6, release_date: '2021-01-01' },
        { id: 3 },
        { id: 4, vote_average: 9, release_date: '2023-01-01' }
      ];
      assert.deepEqual(sortMovies(partial, 'rating').map(m => m.id), [4, 2, 1, 3]);
      assert.deepEqual(sortMovies(partial, 'release_date').map(m => m.id), [4, 2, 1, 3]);
    });

    it('debe manejar entradas inválidas sin lanzar error', () => {
      assert.deepEqual(sortMovies(null, 'rating'), []);
      assert.deepEqual(sortMovies('no-es-arreglo', 'rating'), []);
    });

    it('NFR-02 ordenar no muta el arreglo de entrada y devuelve una copia', () => {
      const snapshot = JSON.parse(JSON.stringify(tieMovies));
      const sorted = sortMovies(tieMovies, 'rating');
      assert.notEqual(sorted, tieMovies);
      assert.deepEqual(tieMovies, snapshot);
      assert.notEqual(sortMovies(tieMovies), tieMovies);
    });
  });

  describe('parseSortBy()', () => {
    it('AC-07.5 parámetro ausente es válido y sin efecto', () => {
      assert.deepEqual(parseSortBy(undefined), { valid: true, value: null, error: null });
    });

    it('AC-07.1 / AC-07.2 acepta "rating" y "release_date"', () => {
      assert.deepEqual(parseSortBy('rating'), { valid: true, value: 'rating', error: null });
      assert.deepEqual(parseSortBy('release_date'), { valid: true, value: 'release_date', error: null });
    });

    it('AC-07.4 rechaza cualquier otro valor', () => {
      const invalidInputs = [
        'title', '', ' ', 'RATING', 'Rating', ' rating', 'rating ', 'release-date',
        'vote_average', 'toString', '__proto__', ['rating', 'release_date'], { a: '1' }, null, 7
      ];
      for (const raw of invalidInputs) {
        const parsed = parseSortBy(raw);
        assert.equal(parsed.valid, false, `${JSON.stringify(raw)} debería ser inválido`);
        assert.equal(parsed.value, null);
        assert.equal(typeof parsed.error, 'string');
        assert.ok(parsed.error.length > 0);
      }
    });
  });

  describe('formatMovieScore()', () => {
    it('debe convertir calificación alta (>= 7.0) a porcentaje verde', () => {
      const score = formatMovieScore(8.2);
      assert.equal(score.percentage, 82);
      assert.equal(score.ratingLevel, 'high');
      assert.equal(score.color, '#21d07a');
    });

    it('debe convertir calificación media (5.0 a 6.9) a porcentaje amarillo', () => {
      const score = formatMovieScore(5.6);
      assert.equal(score.percentage, 56);
      assert.equal(score.ratingLevel, 'medium');
      assert.equal(score.color, '#d2d531');
    });

    it('debe convertir calificación baja (< 5.0) a porcentaje rojo', () => {
      const score = formatMovieScore(4.2);
      assert.equal(score.percentage, 42);
      assert.equal(score.ratingLevel, 'low');
      assert.equal(score.color, '#db2360');
    });

    it('debe manejar valores nulos, negativos o fuera de rango', () => {
      const invalid = formatMovieScore(null);
      assert.equal(invalid.percentage, 0);
      assert.equal(invalid.ratingLevel, 'low');

      const negative = formatMovieScore(-5);
      assert.equal(negative.percentage, 0);

      const overLimit = formatMovieScore(12);
      assert.equal(overLimit.percentage, 100);
    });
  });

  describe('formatDateSpanish()', () => {
    it('debe formatear fechas ISO correctamente al español', () => {
      assert.equal(formatDateSpanish('2024-03-01'), '1 mar 2024');
      assert.equal(formatDateSpanish('2024-10-04'), '4 oct 2024');
      assert.equal(formatDateSpanish('2024-06-14'), '14 jun 2024');
    });

    it('debe devolver la cadena original si el formato es inválido', () => {
      assert.equal(formatDateSpanish('fecha-invalida'), 'fecha-invalida');
      assert.equal(formatDateSpanish(''), '');
      assert.equal(formatDateSpanish(null), '');
    });
  });

  describe('calculateCatalogMetrics()', () => {
    it('debe calcular métricas del catálogo agregadas con precisión', () => {
      const metrics = calculateCatalogMetrics(mockMovies);
      assert.equal(metrics.total, 4);
      assert.equal(metrics.averageScore, 6.4); // (8.2 + 7.6 + 5.6 + 4.2) / 4 = 6.4
      assert.equal(metrics.topRated.id, 1);
      assert.equal(metrics.genresCount, 8); // Ciencia Ficción, Aventura, Animación, Familia, Comedia, Drama, Crimen, Suspenso
      assert.equal(metrics.genreDistribution['Drama'], 2);
    });

    it('debe devolver estructura segura para catálogo vacío', () => {
      const metrics = calculateCatalogMetrics([]);
      assert.equal(metrics.total, 0);
      assert.equal(metrics.averageScore, 0);
      assert.equal(metrics.topRated, null);
    });
  });

  describe('validateMovie()', () => {
    it('debe validar exitosamente una película con estructura correcta', () => {
      const validMovie = mockMovies[0];
      const result = validateMovie(validMovie);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('debe detectar errores cuando faltan campos requeridos o son inválidos', () => {
      const invalidMovie = {
        id: -1,
        title: '',
        release_date: '01/03/2024',
        vote_average: 15,
        genres: []
      };
      const result = validateMovie(invalidMovie);
      assert.equal(result.valid, false);
      assert.ok(result.errors.length >= 4);
      assert.ok(result.errors.some(e => e.includes('id')));
      assert.ok(result.errors.some(e => e.includes('title')));
      assert.ok(result.errors.some(e => e.includes('release_date')));
      assert.ok(result.errors.some(e => e.includes('vote_average')));
    });
  });

});
