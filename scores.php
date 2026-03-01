<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const SCORE_FILE = __DIR__ . '/scores.json';
const MAX_NAME_LEN = 5;
const MAX_SCORES = 20;

function respond(int $status, array $payload): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  exit;
}

function normalizeName(string $raw): string
{
  $upper = strtoupper($raw);
  $filtered = preg_replace('/[^A-Z0-9]/', '', $upper);
  if ($filtered === null) {
    return '';
  }
  return substr($filtered, 0, MAX_NAME_LEN);
}

function sortScores(array &$scores): void
{
  usort($scores, static function (array $a, array $b): int {
    $scoreCmp = ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    if ($scoreCmp !== 0) {
      return $scoreCmp;
    }
    $aTs = (string)($a['createdAt'] ?? '');
    $bTs = (string)($b['createdAt'] ?? '');
    return strcmp($aTs, $bTs);
  });
}

function loadScoreData(): array
{
  if (!file_exists(SCORE_FILE)) {
    return ['scores' => []];
  }

  $raw = file_get_contents(SCORE_FILE);
  if ($raw === false || trim($raw) === '') {
    return ['scores' => []];
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded) || !isset($decoded['scores']) || !is_array($decoded['scores'])) {
    return ['scores' => []];
  }

  $scores = [];
  foreach ($decoded['scores'] as $row) {
    if (!is_array($row)) {
      continue;
    }
    $name = normalizeName((string)($row['name'] ?? ''));
    if ($name === '') {
      continue;
    }
    $score = (int)($row['score'] ?? 0);
    if ($score < 0) {
      $score = 0;
    }
    $createdAt = (string)($row['createdAt'] ?? '');
    if ($createdAt === '') {
      $createdAt = gmdate('c');
    }
    $scores[] = [
      'name' => $name,
      'score' => $score,
      'createdAt' => $createdAt,
    ];
  }

  sortScores($scores);
  if (count($scores) > MAX_SCORES) {
    $scores = array_slice($scores, 0, MAX_SCORES);
  }

  return ['scores' => $scores];
}

function saveScoreData(array $data): bool
{
  $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  if ($json === false) {
    return false;
  }
  return file_put_contents(SCORE_FILE, $json . PHP_EOL, LOCK_EX) !== false;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
  respond(200, loadScoreData());
}

if ($method !== 'POST') {
  respond(405, ['error' => 'Method not allowed']);
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody === false ? '' : $rawBody, true);
if (!is_array($input)) {
  respond(400, ['error' => 'Invalid JSON body']);
}

$name = normalizeName((string)($input['name'] ?? ''));
if ($name === '') {
  respond(400, ['error' => 'Name is required (letters/numbers, max 5 chars)']);
}

$score = filter_var(
  $input['score'] ?? null,
  FILTER_VALIDATE_INT,
  ['options' => ['min_range' => 0]],
);
if ($score === false) {
  respond(400, ['error' => 'Score must be an integer >= 0']);
}

$data = loadScoreData();
$data['scores'][] = [
  'name' => $name,
  'score' => (int)$score,
  'createdAt' => gmdate('c'),
];
sortScores($data['scores']);
if (count($data['scores']) > MAX_SCORES) {
  $data['scores'] = array_slice($data['scores'], 0, MAX_SCORES);
}

if (!saveScoreData($data)) {
  respond(500, ['error' => 'Failed to write scores file']);
}

respond(200, $data);
