# BG3 Inspired Hotbar — Tormenta20

Uma adaptação independente do **BG3 Inspired HUD** para o sistema **Tormenta20 1.5.015 e 1.6.1** no Foundry VTT 13 e 14.

O módulo mantém a proposta visual cinematográfica da obra original, mas substitui o núcleo de regras do D&D 5e por uma integração nativa com Tormenta20.

## Instalação

No Foundry VTT, abra **Módulos adicionais**, escolha **Instalar módulo** e cole:

```text
https://github.com/CalisteniaStudios/bg3-inspired-hotbar-tormenta20/releases/latest/download/module.json
```

Depois, ative o módulo no mundo que utiliza uma versão compatível do Tormenta20.

## Recursos

- Retrato com PV, PM, Defesa, nível e testes contra a morte.
- Três atalhos de arma, priorizando as armas equipadas.
- Hotbar com 18 espaços por página e categorias automáticas baseadas nos dados da ficha.
- Filtros para ação, movimento, ação completa, reação, ação livre, magias, poderes e itens.
- Área **Personalizado** para arrastar itens, armas, poderes, magias e macros diretamente da ficha ou do Foundry.
- Atalhos personalizados salvos separadamente para cada ator, com reorganização por arrastar.
- Uso nativo de armas, magias, poderes, consumíveis e equipamentos por `Item.roll()` do Tormenta20.
- Efeitos do ator e efeitos transferidos por itens exibidos corretamente no Foundry VTT 14.
- Custo de PM, círculo da magia e quantidade exibidos diretamente nos ícones.
- Atributos e perícias em um painel próprio, usando `rollAtributo` e `rollPericia` do sistema.
- Descanso ruim, normal, confortável ou luxuoso pela função nativa `Actor.descanso()`.
- Edição direta de PV e PM: informe um valor exato ou use `+10` e `-5` para alterações relativas.
- Encerrar turno, descanso e ajustes em controles laterais redesenhados.
- Botão **Guia** abaixo de Iniciativa/Encerrar turno, com consulta rápida de ações padrão, de movimento, completas, livres e manobras de combate.
- Painel de personalização com **Original**, **Relicário de Arton**, **Constelação Arcana**, **Aço & Brasa** e **Grimório Vivo**, além de cores livres, brilho e ornamentos.
- Saga usa a linguagem de quadrinhos da Ficha Heroica: papel claro, arte integrada e tinta escura com vermelho e azul-petróleo. Em **Personalizado**, as duas cores de destaque podem ser alteradas.
- Organizações **Lenda** e **Saga**, inspiradas nos estilos da Ficha Heroica, com estruturas próprias e seleção em **Ajustes → Organização da HUD**. A opção **Atual** preserva todos os temas anteriores.
- **Acompanhar Ficha Heroica** segue a preferência pessoal do personagem selecionado. A integração é opcional; os três estilos funcionam sem esse módulo.
- Categoria **Favoritos** nos novos estilos, usando os itens marcados como favoritos na ficha de Tormenta20.
- Opções de escala, opacidade, posição, origem do retrato, nomes nos atalhos e ocultação da hotbar padrão.
- Editor visual do retrato com zoom e posição horizontal e vertical, prévia em tempo real e ajustes separados para a imagem da ficha e do token.
- Enquadramento salvo por personagem e compartilhado com todos que visualizam sua HUD.
- Atalho **H** para mostrar ou ocultar a interface.

## Controles

- **Clique** em um item: usar normalmente, com a janela de configuração do Tormenta20.
- **Shift + clique**: uso rápido, sem a janela de configuração.
- **Botão direito**: abrir a ficha do item ou macro.
- **Arrastar na categoria Personalizado**: adicionar ou reorganizar um atalho.
- **Shift + botão direito no Personalizado**: remover apenas o atalho, sem apagar o item ou macro.
- **Clique no valor de PV ou PM**: editar usando valor exato, `+N` ou `-N`; Enter confirma e Esc cancela.
- **Clique no retrato**: abrir a ficha do ator.
- **Ajustes → Enquadramento do retrato**: reposicionar e ampliar a imagem; **Centralizar imagem** restaura o enquadramento padrão da origem selecionada.
- **Clique no d20**: abrir atributos e perícias.

## Compatibilidade

- Foundry VTT 13 e 14, verificado no build 14.367.
- Tormenta20 1.5.015 e 1.6.1.
- Não depende de libWrapper, Midi-QOL, D&D 5e ou módulos de pontos de magia.

## Créditos e licença

Este projeto deriva do [BG3 Inspired Hotbar](https://github.com/BragginRites/bg3-inspired-hotbar), criado por BragginRites e Dapoulp e distribuído sob a licença MIT. Os avisos do projeto original estão em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). A adaptação e os materiais da Calistenia Studios usam a [licença sem revenda](LICENSE.md).

Este projeto é uma criação independente, sem vínculo ou endosso da Jambô Editora, Larian Studios ou dos autores do sistema Tormenta20.
