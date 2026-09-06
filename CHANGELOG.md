# Changelog

## [0.3.0] — 2026-09-06

- Preserva o visual anterior como tema Original.
- Adiciona os temas estruturais Relicário de Arton, Constelação Arcana, Aço & Brasa e Grimório Vivo.
- Cada tema reorganiza retrato, recursos, filtros, armas, grade, efeitos e ações com identidade própria.
- Amplia os cartões de seleção da Forja da HUD com prévia, ícone e descrição de cada tema.
- Mantém cores personalizadas, escala, opacidade, enquadramento e demais ajustes compatíveis com todos os temas.

## [0.2.3] — 2026-09-06

- Substitui Encerrar turno por Iniciativa enquanto o encontro ativo ainda não começou.
- Ao clicar em Iniciativa, adiciona o token selecionado ao encontro e realiza a rolagem automaticamente.
- Mantém Iniciativa visível, porém desabilitada, quando não existe encontro ativo na cena ou quando o token já rolou.
- Mantém Iniciativa disponível durante um combate em andamento para tokens que ainda não entraram no encontro ou ainda não rolaram.
- Restaura Encerrar turno durante o combate e o habilita somente para o personagem do turno atual.

## [0.2.2] — 2026-09-05

- Adiciona compatibilidade declarada e validada com Foundry VTT 14 e Tormenta20 1.6.1.
- Corrige o uso de armas, magias, poderes e itens com a nova assinatura de rolagem do sistema.
- Atualiza a leitura de itens arrastados para a API de editor do Foundry VTT 14, preservando o comportamento do Foundry VTT 13.
- Adapta o botão dos controles de cena ao novo formato do Foundry VTT 14.
- Exibe e permite alternar efeitos transferidos por itens, além dos efeitos incorporados diretamente ao ator.
- Atualiza a HUD quando efeitos pertencentes a itens são criados, alterados ou removidos.

## [0.2.1] — 2026-08-21

- Adiciona uma ferramenta visual para enquadrar o retrato diretamente nos ajustes da HUD.
- Permite controlar zoom, posição horizontal e posição vertical com prévia em tempo real.
- Salva enquadramentos independentes para a imagem da ficha e a imagem do token em cada personagem.
- Compartilha o enquadramento salvo com todos que visualizam a HUD daquele personagem.

## [0.2.0] — 2026-08-21

- Substitui o filtro geral pelas categorias Itens e Personalizado.
- Corrige a classificação de equipamentos, que não são mais tratados como ações de movimento quando não possuem execução configurada.
- Adiciona atalhos personalizados por ator com suporte a itens, armas, poderes, magias e macros arrastados diretamente para a HUD.
- Permite reorganizar atalhos personalizados e removê-los com Shift + botão direito sem apagar o documento original.
- Adiciona edição direta de PV e PM por valor exato ou ajuste relativo, sem botões extras de incremento.
- Remove o comando Preencher e transforma Ajustes em um painel próprio da HUD.
- Adiciona temas Tormenta, Divino, Arcano e Sombrio, cores personalizadas, brilho, ornamentos, escala, opacidade, posição, retrato e opções de exibição.
- Reformula o acabamento visual com molduras, contraste e controles laterais inspirados em fantasia medieval.
- Corrige o espaçamento do painel de atributos para impedir que os valores invadam a lista de perícias.
- Mantém todos os controles e grades contidos em resoluções menores, sem rolagem horizontal.

## 0.1.1 — 2026-08-20

- Corrige os espaços da hotbar para permanecerem perfeitamente quadrados mesmo quando o Foundry define uma altura global para botões.
- Recalcula a largura da grade e centraliza os ícones sem criar rolagem horizontal.
- Mantém Encerrar turno, Descansar, Preencher e Ajustes totalmente dentro do painel da HUD.
- Melhora o encaixe responsivo em telas menores.

## 0.1.0 — 2026-08-20

- Primeira versão pública para Tormenta20 1.5.015.
- Núcleo de regras refeito para os documentos e APIs nativos do sistema.
- Hotbar paginada com filtros de ação, magias e poderes.
- PV, PM, Defesa, nível, armas equipadas e testes contra a morte.
- Rolagens de atributos, perícias, itens e descanso integradas à ficha.
- Reorganização por arrastar, preenchimento automático, efeitos e tooltips.
- Opções de escala, opacidade, posição, retrato e hotbar padrão.
