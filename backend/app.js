const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  filterMovies,
  parseMinRating,
  parseSortBy,
  sortMovies,
  calculateCatalogMetrics
} = require('./services/movieService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load catalog data (read-only fixture, see AGENTS.md)
const moviesPath = path.join(__dirname, 'data', 'movies.json');
let movies = [];

try {
  const fileData = fs.readFileSync(moviesPath, 'utf8');
  movies = JSON.parse(fileData);
  console.log(`[INFO] Cargadas ${movies.length} películas correctamente.`);
} catch (error) {
  console.error('[ERROR] Error cargando backend/data/movies.json:', error.message);
}

// REST API Endpoints

// 1. Obtener todas las películas o filtrar por categoría, búsqueda, género o calificación mínima, con orden opcional (sort_by)
app.get('/api/movies', (req, res) => {
  const { category, search, genre } = req.query;

  const minRating = parseMinRating(req.query.min_rating);
  if (!minRating.valid) {
    return res.status(400).json({ error: minRating.error });
  }

  const sortBy = parseSortBy(req.query.sort_by);
  if (!sortBy.valid) {
    return res.status(400).json({ error: sortBy.error });
  }

  const filtered = filterMovies(movies, {
    category,
    search,
    genre,
    minRating: minRating.value ?? undefined
  });
  const results = sortMovies(filtered, sortBy.value);

  res.json({
    total_results: results.length,
    results
  });
});

// 2. Obtener detalle de una película por ID
app.get('/api/movies/:id', (req, res) => {
  const movieId = parseInt(req.params.id, 10);
  const movie = movies.find(m => m.id === movieId);

  if (!movie) {
    return res.status(404).json({ error: 'Película no encontrada' });
  }

  res.json(movie);
});

// 3. Obtener lista de categorías disponibles
app.get('/api/categories', (req, res) => {
  res.json([
    { id: 'trending', name: 'Tendencias (Hoy y Esta semana)' },
    { id: 'popular', name: 'Lo más popular' },
    { id: 'top_rated', name: 'Mejor valoradas' },
    { id: 'upcoming', name: 'Próximos estrenos' }
  ]);
});

// 4. Obtener todos los géneros únicos
app.get('/api/genres', (req, res) => {
  const genreSet = new Set();
  movies.forEach(movie => {
    if (movie.genres) {
      movie.genres.forEach(g => genreSet.add(g));
    }
  });
  res.json(Array.from(genreSet).sort());
});

// 5. Métricas y estadísticas del catálogo
app.get('/api/metrics', (req, res) => {
  const metrics = calculateCatalogMetrics(movies);
  res.json(metrics);
});

// 6. Endpoint de salud / estado
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TMDB Clone API', time: new Date().toISOString() });
});

// Servir frontend estático directamente
const frontendPath = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

module.exports = app;
