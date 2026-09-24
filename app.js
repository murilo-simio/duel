"use strict";
const MAX_IMAGES = 64;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const $ = (id) => document.getElementById(id);
let entries = [];
let voters = [];
let requestedRounds = null;
let endlessMode = false;
let tournament = null;
let activeMatch = null;
let votes = [];
let awaitingResult = false;
let tied = false;
let uploading = false;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function imageFor(entry, className) {
  const image = element("img", className);
  image.src = entry.url;
  image.alt = entry.name;
  return image;
}
function showScreen(screen) {
  for (const id of ["setup", "overview", "voting", "finish"])
    $(id).hidden = id !== screen;
  $("status").textContent = "";
}
async function addFiles(files) {
  if (uploading) return;
  uploading = true;
  $("generate").disabled = true;
  $("image-input").disabled = true;
  const errors = [];
  try {
    for (const file of files) {
      if (entries.length >= MAX_IMAGES) {
        errors.push("Limite de 64 imagens atingido.");
        break;
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: formato não suportado.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: excede 10 MB.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      const preview = new Image();
      preview.src = url;
      try {
        await preview.decode();
        entries.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          url,
        });
      } catch {
        URL.revokeObjectURL(url);
        errors.push(`${file.name}: não foi possível abrir a imagem.`);
      }
    }
  } finally {
    uploading = false;
    $("image-input").disabled = false;
    $("image-input").value = "";
    renderImages();
    $("status").textContent = errors.join("\n");
  }
}
function renderImages() {
  $("image-list").replaceChildren();
  entries.forEach((entry) => {
    const tile = element("figure", "image-tile");
    const remove = element("button", "remove-image", "×");
    remove.setAttribute("aria-label", `Remover ${entry.name}`);
    remove.onclick = () => {
      URL.revokeObjectURL(entry.url);
      entries = entries.filter((item) => item.id !== entry.id);
      renderImages();
    };
    tile.append(imageFor(entry), element("figcaption", "", entry.name), remove);
    $("image-list").append(tile);
  });
  $("image-count").textContent =
    `${entries.length} ${entries.length === 1 ? "imagem adicionada" : "imagens adicionadas"}`;
  $("generate").disabled = uploading || entries.length < 2;
}
function renderBracket(target) {
  $(target).replaceChildren();
  tournament.rounds.forEach((matches, roundIndex) => {
    const column = element("div", "bracket-round");
    column.append(
      element("h3", "round-heading", Bracket.roundName(tournament, roundIndex)),
    );
    const container = element("div", "round-matches");
    matches.forEach((match) => {
      const card = element("div", "bracket-match");
      match.entries.forEach((entry, side) => {
        const row = element(
          "div",
          `bracket-entry${entry && match.winner?.id === entry.id ? " winner" : ""}`,
        );
        if (entry) row.append(imageFor(entry));
        row.append(element("span", "", entry?.name || "Folga nesta rodada"));
        if (match.scores)
          row.append(element("b", "", String(match.scores[side])));
        else if (entry && match.winner?.id === entry.id)
          row.append(element("b", "", "✓"));
        card.append(row);
      });
      container.append(card);
    });
    column.append(container);
    $(target).append(column);
  });
}
function buildTournament() {
  tournament = Bracket.createTournament(entries, Math.random, requestedRounds, endlessMode);
  renderBracket("bracket");
  showScreen("overview");
  updateMode();
}
function updateMode() {
  const mode = voters.length
    ? `Modo em grupo · ${voters.length} ${voters.length === 1 ? "participante" : "participantes"}`
    : "Modo simples · um clique decide";
  const rounds = endlessMode ? "Endless · até não haver empates" : `${tournament.roundLimit} ${tournament.roundLimit === 1 ? "rodada" : "rodadas"}${requestedRounds === null ? " (automático)" : ""}`;
  $("mode-summary").textContent = `${mode} · ${rounds}`;
}
function updateRoundInput() {
  $("round-count").disabled = $("endless-mode").checked;
}
function saveRoundSettings() {
  const input = $("round-count");
  if (!input.reportValidity()) return false;
  const selectedRounds = $("endless-mode").checked ? requestedRounds : input.value === "" ? null : Number(input.value);
  tournament.roundLimit = Bracket.resolveRoundLimit(entries.length, selectedRounds);
  requestedRounds = selectedRounds;
  endlessMode = $("endless-mode").checked;
  tournament.endless = endlessMode;
  renderBracket("bracket");
  return true;
}
function renderVoterFields() {
  const count = Number($("voter-count").value);
  if (!Number.isInteger(count) || count < 1 || count > 20) return;
  const previous = Array.from(
    $("voter-fields").querySelectorAll("input"),
    (input) => input.value,
  );
  $("voter-fields").replaceChildren();
  for (let index = 0; index < count; index++) {
    const label = element("label", "field-label", `Participante ${index + 1}`);
    label.htmlFor = `voter-${index}`;
    const input = element("input");
    input.id = label.htmlFor;
    input.value = previous[index] ?? voters[index] ?? "";
    input.placeholder = `Nome da pessoa ${index + 1}`;
    input.required = true;
    input.maxLength = 40;
    $("voter-fields").append(label, input);
  }
}
function currentMatch() {
  return tournament.rounds[activeMatch.round][activeMatch.match];
}
function showMatch() {
  activeMatch = Bracket.nextMatch(tournament);
  if (!activeMatch && Bracket.prepareNextRound(tournament))
    activeMatch = Bracket.nextMatch(tournament);
  if (!activeMatch) {
    finishTournament();
    return;
  }
  votes = [];
  awaitingResult = false;
  tied = false;
  const match = currentMatch();
  $("round-label").textContent = Bracket.roundName(
    tournament,
    activeMatch.round,
  ).toUpperCase();
  $("vote-title").textContent = "Qual é o seu favorito?";
  const finished = tournament.rounds
    .flat()
    .filter((item) => item.completed && !item.automatic).length;
  const totalMatches = Math.floor(entries.length / 2) * tournament.roundLimit;
  $("match-progress").textContent =
    tournament.endless ? `Confronto ${finished + 1} · Endless` : `Confronto ${finished + 1} de ${totalMatches}`;
  const roundMatches = tournament.rounds[activeMatch.round].filter(item => !item.automatic);
  const progress = tournament.endless
    ? roundMatches.filter(item => item.completed).length / roundMatches.length
    : finished / totalMatches;
  $("progress-fill").style.width = `${progress * 100}%`;
  $("progress-fill").parentElement.setAttribute("aria-label", tournament.endless ? "Progresso da rodada atual" : "Progresso do campeonato");
  ["choose-left", "choose-right"].forEach((id, side) => {
    const button = $(id);
    button.disabled = false;
    button.classList.remove("selected");
    const caption = element("div", "contender-caption");
    caption.append(
      element("span", "", match.entries[side].name),
      element("small", "", "CLIQUE PARA VOTAR ↗"),
    );
    button.replaceChildren(imageFor(match.entries[side]), caption);
  });
  $("match-result").hidden = true;
  $("vote-feedback").textContent = "";
  showScreen("voting");
  renderVoterPrompt();
  renderBracket("live-bracket");
}
function renderVoterPrompt() {
  $("voter-prompt").replaceChildren();
  if (!voters.length) {
    $("voter-prompt").textContent = "Escolha uma imagem para avançar.";
    return;
  }
  $("voter-prompt").append(
    document.createTextNode(`Voto ${votes.length + 1} de ${voters.length} · `),
    element("strong", "", voters[votes.length]),
    document.createTextNode(", é a sua vez."),
  );
}
function castVote(side) {
  if (awaitingResult) return;
  votes.push(side);
  if (voters.length && votes.length < voters.length) {
    $("vote-feedback").textContent =
      `${votes.length} ${votes.length === 1 ? "voto registrado" : "votos registrados"}. Passe para a próxima pessoa.`;
    renderVoterPrompt();
    return;
  }
  awaitingResult = true;
  $("choose-left").disabled = true;
  $("choose-right").disabled = true;
  const scores = [
    votes.filter((vote) => vote === 0).length,
    votes.filter((vote) => vote === 1).length,
  ];
  tied = scores[0] === scores[1];
  $("match-result").hidden = false;
  $("vote-feedback").textContent = voters.length
    ? `Placar: ${scores[0]} × ${scores[1]}`
    : "";
  $("voter-prompt").textContent = tied
    ? "Empate registrado."
    : "Escolha feita!";
  if (tied) {
    Bracket.advance(
      tournament,
      activeMatch.round,
      activeMatch.match,
      null,
      scores,
    );
    $("result-text").textContent =
      "Um ponto para cada imagem. Na próxima rodada, empatadas jogam entre si.";
    $("next-match").textContent = "Continuar →";
    renderBracket("live-bracket");
    return;
  }
  const winningSide = scores[0] > scores[1] ? 0 : 1;
  Bracket.advance(
    tournament,
    activeMatch.round,
    activeMatch.match,
    winningSide,
    voters.length ? scores : null,
  );
  $(winningSide === 0 ? "choose-left" : "choose-right").classList.add(
    "selected",
  );
  $("result-text").textContent =
    `${currentMatch().winner.name} venceu o confronto! +3 pontos.`;
  $("next-match").textContent = "Continuar →";
  renderBracket("live-bracket");
  if (!voters.length) showMatch();
}
function finishTournament() {
  const ranked = Bracket.standings(tournament);
  $("champion").replaceChildren();
  let place = 0;
  ranked.forEach((entry, index) => {
    if (index === 0 || entry.points !== ranked[index - 1].points)
      place = index + 1;
    const row = element("div", "ranking-row");
    row.append(
      element("strong", "", `#${place}`),
      imageFor(entry),
      element("span", "ranking-name", entry.name),
      element(
        "span",
        "ranking-stats",
        `${entry.wins}V · ${entry.ties}E · ${entry.losses}D${entry.byes ? ` · ${entry.byes} folga(s)` : ""}`,
      ),
      element("strong", "", `${entry.points} pts`),
    );
    $("champion").append(row);
  });
  $("champion-summary").textContent =
    `${entries.length} imagens · ${tournament.rounds.length} rodadas${tournament.endless ? " · Endless concluído: classificação sem empates" : ""} · Vitória: 3 pts · Empate: 1 pt · Derrota e folga: 0 pts.${tournament.endless ? "" : " Pontuações iguais dividem a posição."}`;
  renderBracket("final-bracket");
  showScreen("finish");
}
$("image-input").addEventListener("change", (event) =>
  addFiles(Array.from(event.target.files)),
);
for (const eventName of ["dragenter", "dragover"])
  $("dropzone").addEventListener(eventName, (event) => {
    event.preventDefault();
    $("dropzone").classList.add("dragging");
  });
for (const eventName of ["dragleave", "drop"])
  $("dropzone").addEventListener(eventName, (event) => {
    event.preventDefault();
    $("dropzone").classList.remove("dragging");
  });
$("dropzone").addEventListener("drop", (event) =>
  addFiles(Array.from(event.dataTransfer.files)),
);
$("generate").onclick = buildTournament;
$("shuffle").onclick = buildTournament;
$("edit-images").onclick = () => showScreen("setup");
$("start").onclick = showMatch;
$("configure").onclick = () => {
  $("endless-mode").checked = endlessMode;
  updateRoundInput();
  $("round-count").max = Bracket.MAX_ROUNDS;
  $("round-count").value = requestedRounds ?? "";
  $("round-count").placeholder = `Automático: ${Bracket.resolveRoundLimit(entries.length)}`;
  $("round-help").textContent = `De 1 a ${Bracket.MAX_ROUNDS} rodadas. Em branco: automático (${Bracket.resolveRoundLimit(entries.length)} para ${entries.length} imagens).`;
  $("voter-fields").replaceChildren();
  $("voter-count").value = voters.length || 2;
  renderVoterFields();
  $("settings").showModal();
};
$("voter-count").addEventListener("input", renderVoterFields);
$("endless-mode").addEventListener("change", updateRoundInput);
$("close-settings").onclick = () => $("settings").close();
$("settings-form").onsubmit = (event) => {
  event.preventDefault();
  const fields = Array.from($("voter-fields").querySelectorAll("input"));
  for (const field of fields) {
    field.setCustomValidity(field.value.trim() ? "" : "Informe um nome.");
    if (!field.reportValidity()) return;
  }
  if (!saveRoundSettings()) return;
  voters = fields.map((input) => input.value.trim());
  updateMode();
  $("settings").close();
};
$("voter-fields").addEventListener("input", (event) =>
  event.target.setCustomValidity(""),
);
$("simple-mode").onclick = () => {
  if (!saveRoundSettings()) return;
  voters = [];
  updateMode();
  $("settings").close();
};
$("choose-left").onclick = () => castVote(0);
$("choose-right").onclick = () => castVote(1);
$("next-match").onclick = showMatch;
$("replay").onclick = buildTournament;
$("new-tournament").onclick = () => {
  entries.forEach((entry) => URL.revokeObjectURL(entry.url));
  entries = [];
  tournament = null;
  voters = [];
  renderImages();
  requestedRounds = null;
  endlessMode = false;
  showScreen("setup");
};
