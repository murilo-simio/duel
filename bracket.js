(function (root) {
  "use strict";
  const MAX_ROUNDS = 100;
  function resolveRoundLimit(entryCount, requestedRounds = null) {
    if (requestedRounds === null) return Math.ceil(Math.log2(entryCount));
    if (!Number.isInteger(requestedRounds) || requestedRounds < 1 || requestedRounds > MAX_ROUNDS)
      throw new Error(`Use de 1 a ${MAX_ROUNDS} rodadas.`);
    return requestedRounds;
  }
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }
  function makeRound(entries, random) {
    const pool = shuffle(entries, random),
      matches = [];
    for (let index = 0; index < pool.length; index += 2)
      matches.push({
        entries: [pool[index], pool[index + 1] || null],
        winner: null,
        completed: !pool[index + 1],
        automatic: !pool[index + 1],
        scores: null,
      });
    return matches;
  }
  function createTournament(entries, random = Math.random, requestedRounds = null, endless = false) {
    if (entries.length < 2 || entries.length > 64)
      throw new Error("Use de 2 a 64 imagens.");
    return {
      rounds: [makeRound(entries, random)],
      entries: [...entries],
      count: entries.length,
      endless,
      roundLimit: resolveRoundLimit(entries.length, requestedRounds),
      random,
      records: Object.fromEntries(
        entries.map((entry) => [
          entry.id,
          { points: 0, wins: 0, ties: 0, losses: 0, byes: 0 },
        ]),
      ),
    };
  }
  function advance(tournament, roundIndex, matchIndex, side, scores = null) {
    const match = tournament.rounds[roundIndex]?.[matchIndex];
    if (
      !match ||
      match.completed ||
      ![0, 1, null].includes(side) ||
      !match.entries[0] ||
      !match.entries[1]
    )
      throw new Error("Confronto ou resultado inválido.");
    match.winner = side === null ? null : match.entries[side];
    match.completed = true;
    match.scores = scores;
    match.entries.forEach((entry, index) => {
      const record = tournament.records[entry.id];
      if (side === null) {
        record.ties++;
        record.points++;
      } else if (side === index) {
        record.wins++;
        record.points += 3;
      } else record.losses++;
    });
  }
  function prepareNextRound(tournament) {
    const previous = tournament.rounds.at(-1);
    if (previous.some((match) => !match.completed))
      throw new Error("Conclua a rodada atual.");
    if (!previous.accounted) {
      previous
        .filter((match) => match.automatic)
        .forEach((match) => tournament.records[match.entries[0].id].byes++);
      previous.accounted = true;
    }
    if (tournament.endless) {
      const points = tournament.entries.map(entry => tournament.records[entry.id].points);
      if (new Set(points).size === points.length) return false;
    } else if (tournament.rounds.length >= tournament.roundLimit) return false;
    const groups = { win: [], tie: [], loss: [] };
    previous.forEach((match) => {
      if (match.automatic) {
        groups.tie.push(match.entries[0]);
        return;
      }
      match.entries.forEach((entry) =>
        groups[
          match.winner ? (entry.id === match.winner.id ? "win" : "loss") : "tie"
        ].push(entry),
      );
    });
    const matches = [],
      leftovers = [];
    Object.values(groups).forEach((group) => {
      const pool = shuffle(group, tournament.random);
      if (pool.length % 2) leftovers.push(pool.pop());
      while (pool.length)
        matches.push({
          entries: [pool.pop(), pool.pop()],
          winner: null,
          completed: false,
          automatic: false,
          scores: null,
        });
    });
    matches.push(...makeRound(leftovers, tournament.random));
    tournament.rounds.push(matches);
    return true;
  }
  function nextMatch(tournament) {
    for (let round = 0; round < tournament.rounds.length; round++) {
      const match = tournament.rounds[round].findIndex(
        (item) => !item.completed,
      );
      if (match !== -1) return { round, match };
    }
    return null;
  }
  function standings(tournament) {
    return tournament.entries
      .map((entry) => ({ ...entry, ...tournament.records[entry.id] }))
      .sort((left, right) => right.points - left.points);
  }
  function roundName(tournament, round) {
    if (tournament.endless) return `Rodada ${round + 1} · Endless`;
    return `Rodada ${round + 1} de ${tournament.roundLimit}`;
  }
  const api = {
    MAX_ROUNDS,
    resolveRoundLimit,
    shuffle,
    createTournament,
    advance,
    nextMatch,
    prepareNextRound,
    standings,
    roundName,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Bracket = api;
})(globalThis);
