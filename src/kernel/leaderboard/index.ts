/**
 * Leaderboard module — barrel export
 * @module kernel/leaderboard
 */

export {
  submitScore,
  getTopScores,
  getUserRank,
  subscribeToUpdates,
  type LeaderboardResult,
  type LeaderboardError,
} from './leaderboard-api';
