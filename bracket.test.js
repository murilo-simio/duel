const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createTournament,
  advance,
  nextMatch,
  prepareNextRound,
  standings,
} = require("./bracket.js");

test("quantidade personalizada encerra exatamente na rodada escolhida", () => {
  for (const limit of [1, 5, 100]) {
    const tournament = createTournament([{ id: "a" }, { id: "b" }], Math.random, limit);
    do {
      const next = nextMatch(tournament);
      advance(tournament, next.round, next.match, 0);
    } while (prepareNextRound(tournament));
    assert.equal(tournament.rounds.length, limit);
    assert.equal(standings(tournament)[0].wins + standings(tournament)[0].losses, limit);
  }
});

test("rodadas personalizadas inválidas são rejeitadas", () => {
  for (const limit of [0, -1, 1.5, 101, NaN, Infinity, "3"]) {
    assert.throws(() => createTournament([{ id: 1 }, { id: 2 }], Math.random, limit));
  }
});
test("2–64 imagens: rodadas limitadas, sem duplicação e todos os resultados contabilizados", () => {
  for (let count = 2; count <= 64; count++) {
    const entries = Array.from({ length: count }, (_, id) => ({ id }));
    const tournament = createTournament(entries);
    let played = 0;
    do {
      const round = tournament.rounds.at(-1);
      const ids = round
        .flatMap((match) => match.entries)
        .filter(Boolean)
        .map((entry) => entry.id);
      assert.equal(ids.length, count);
      assert.equal(new Set(ids).size, count);
      for (
        let next = nextMatch(tournament);
        next;
        next = nextMatch(tournament)
      ) {
        advance(
          tournament,
          next.round,
          next.match,
          played % 3 === 0 ? null : played % 2,
          [1, 1],
        );
        played++;
      }
    } while (prepareNextRound(tournament));
    assert.equal(tournament.rounds.length, Math.ceil(Math.log2(count)));
    assert.equal(played, Math.floor(count / 2) * tournament.roundLimit);
    standings(tournament).forEach((record) =>
      assert.equal(
        record.wins + record.ties + record.losses + record.byes,
        tournament.roundLimit,
      ),
    );
  }
});
test("grupos pares respeitam vitória × vitória, empate × empate e derrota × derrota", () => {
  const tournament = createTournament(
    Array.from({ length: 8 }, (_, id) => ({ id })),
    () => 0.5,
  );
  const winners = [],
    losers = [],
    tied = [];
  tournament.rounds[0].forEach((match, index) => {
    if (index < 2) {
      tied.push(...match.entries.map((entry) => entry.id));
      advance(tournament, 0, index, null, [1, 1]);
    } else {
      winners.push(match.entries[0].id);
      losers.push(match.entries[1].id);
      advance(tournament, 0, index, 0, [2, 0]);
    }
  });
  prepareNextRound(tournament);
  tournament.rounds[1].forEach((match) =>
    assert.ok(
      [winners, losers, tied].some((group) =>
        match.entries.every((entry) => group.includes(entry.id)),
      ),
    ),
  );
});
test("empate pontua ambas as imagens e não escolhe vencedor", () => {
  const tournament = createTournament([{ id: "a" }, { id: "b" }]);
  advance(tournament, 0, 0, null, [1, 1]);
  assert.equal(tournament.rounds[0][0].winner, null);
  assert.deepEqual(
    standings(tournament).map((entry) => entry.points),
    [1, 1],
  );
  assert.throws(() => advance(tournament, 0, 0, 0));
  assert.equal(prepareNextRound(tournament), false);
});
test("rejeita entradas e rodadas incompletas", () => {
  assert.throws(() => createTournament([]));
  assert.throws(() => createTournament(Array(65).fill({ id: 1 })));
  const tournament = createTournament([{ id: 1 }, { id: 2 }]);
  assert.throws(() => advance(tournament, 0, 0, 2));
  assert.throws(() => prepareNextRound(tournament));
});
