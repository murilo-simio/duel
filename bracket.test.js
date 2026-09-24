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

test("Endless ultrapassa 100 rodadas empatadas e termina quando o ranking desempata", () => {
  const tournament = createTournament([{ id: "a" }, { id: "b" }], Math.random, 1, true);
  for (let round = 0; round < 101; round++) {
    advance(tournament, round, 0, null, [1, 1]);
    assert.equal(prepareNextRound(tournament), true);
  }
  advance(tournament, 101, 0, 0);
  assert.equal(prepareNextRound(tournament), false);
  assert.equal(tournament.rounds.length, 102);
});

test("Endless verifica empates abaixo da liderança e espera concluir a rodada", () => {
  const tournament = createTournament(Array.from({ length: 4 }, (_, id) => ({ id })), () => 0.5, 1, true);
  advance(tournament, 0, 0, 0);
  advance(tournament, 0, 1, null, [1, 1]);
  assert.deepEqual(standings(tournament).map(entry => entry.points), [3, 1, 1, 0]);
  assert.equal(prepareNextRound(tournament), true);
  assert.throws(() => prepareNextRound(tournament), /Conclua/);
  tournament.rounds[1].forEach((match, index) => advance(tournament, 1, index, 0));
  assert.equal(new Set(standings(tournament).map(entry => entry.points)).size, 4);
  assert.equal(prepareNextRound(tournament), false);
});

test("Endless pode terminar antes do limite configurado e contabiliza folgas", () => {
  const tournament = createTournament(Array.from({ length: 3 }, (_, id) => ({ id })), () => 0.5, 100, true);
  advance(tournament, 0, 0, null);
  assert.equal(prepareNextRound(tournament), true);
  advance(tournament, 1, 0, 0);
  const shouldContinue = new Set(standings(tournament).map(entry => entry.points)).size < 3;
  assert.equal(prepareNextRound(tournament), shouldContinue);
  assert.equal(standings(tournament).reduce((sum, entry) => sum + entry.byes, 0), 2);
  const pair = createTournament([{ id: "a" }, { id: "b" }], Math.random, 100, true);
  advance(pair, 0, 0, 0);
  assert.equal(prepareNextRound(pair), false);
  assert.equal(pair.rounds.length, 1);
});
