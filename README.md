# Duelo

App em HTML, CSS e JavaScript para classificar imagens por confrontos. Abra `index.html` em um navegador moderno. Não requer instalação ou servidor.

1. Adicione de 2 a 64 imagens, até 10 MB cada, e monte o bracket.
2. Comece no modo simples (cada clique decide e abre o próximo confronto) ou configure de 1 a 20 participantes no mesmo dispositivo.
3. No grupo, todos votam uma vez por confronto. O placar aparece após o último voto. Empates são resultados válidos.
4. Após concluir a rodada, sorteiam-se confrontos entre imagens com o mesmo resultado anterior: vitória × vitória, empate × empate e derrota × derrota. Uma imagem aleatória de cada grupo ímpar vai para um sorteio complementar entre as sobras.
5. Por padrão, o campeonato tem `ceil(log2(n))` rodadas: 4 imagens → 2; 8 → 3; 16 → 4. Nas configurações, escolha de 1 a 100 rodadas ou deixe o campo vazio para manter o automático. A escolha vale para votação em grupo e para o botão “Usar modo simples”, sem alterar o sorteio inicial. Todas continuam participando.
6. Com total ímpar, uma imagem recebe folga, sem pontos; na próxima rodada entra no grupo de empates. Confrontos podem se repetir.
7. O ranking soma 3 pontos por vitória, 1 por empate e 0 por derrota ou folga. Pontuações iguais compartilham posição. Essa pontuação é uma decisão inicial de produto.

As próximas rodadas dependem dos resultados, então a prévia inicial mostra apenas os confrontos já sorteados. O histórico completo fica disponível ao final.

Imagens ficam em URLs locais temporárias, sem envio a servidor. Recarregar apaga a sessão. Google Fonts é uma dependência visual opcional; fontes do sistema funcionam offline. A votação é presencial, sem autenticação ou sincronização remota.

## Arquivos

- `bracket.js`: sorteio, grupos, pontuação e rodadas.
- `app.js`: upload, configurações e interface.
- `styles.css` e `STYLE.md`: regras visuais.

## Verificação

`node --test bracket.test.js` cobre todas as quantidades de 2 a 64, conservação de participantes, limite de rodadas, agrupamentos, empates e validação de resultados. `node --check app.js` verifica sintaxe.
