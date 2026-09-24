# Roadmap

## Repositório

- [x] Projeto publicado em `https://github.com/murilo-simio/duel`, branch `main`, com testes, documentação e código do app.

## MVP implementado

- [x] Correção da logo: elemento sem navegação; clicar não abre o diretório nem reinicia a sessão.

- [x] Upload múltiplo e arrastar/soltar. Aceite: 2–64 imagens, limite de 10 MB, prévias, remoção e mensagens de falha.
- [x] Sorteio e visão inicial. Aceite: cada imagem aparece uma vez na rodada; botão começar e configuração abaixo.
- [x] Votação simples. Aceite: clique registra vitória e segue para o próximo confronto.
- [x] Votação presencial com participantes. Aceite: 1–20 nomes obrigatórios; um voto por turno; placar após todos votarem.
- [x] Empates preservados. Aceite: não há desempate forçado; ambas as imagens recebem 1 ponto.
- [x] Agrupamento por resultado anterior. Aceite: vitória × vitória, empate × empate, derrota × derrota; sobras ímpares sorteadas entre si.
- [x] Rodadas automáticas. Aceite: ceil(log2(n)) rodadas; todos os duelos terminam antes da próxima rodada.
- [x] Rodadas configuráveis. Aceite: campo opcional de 1–100 rodadas; vazio mantém automático; salvar aplica sem refazer o sorteio, inclusive no modo simples; cancelar descarta alterações e replay preserva a escolha.
- [x] Ranking final. Aceite: 3/1/0 pontos, posições compartilhadas, replay e histórico completo.
- [x] Testes do motor para 2–64 imagens e documentação visual.

## Decisões e limitações

- Pontuação inicial: vitória 3, empate 1, derrota e folga 0.
- Total ímpar exige uma folga por rodada; imagem com folga entra no grupo de empates na rodada seguinte.
- Próximas rodadas só podem ser sorteadas após os resultados da anterior.
- [ ] Melhorar equilíbrio das folgas: evitar folgas repetidas e avaliar normalização da pontuação para totais ímpares.
- [ ] Evitar confrontos repetidos quando houver alternativas no mesmo grupo.
- [ ] Persistir sessão localmente para sobreviver a recarregamento.
- [ ] Exportar classificação como imagem.
- [ ] Empacotar fontes locais; Google Fonts é dependência opcional atual.
- [ ] Votação remota depende de backend, identificação e sincronização.
