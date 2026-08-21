# BG3 Inspired Hotbar — Tormenta20

Uma adaptação independente do **BG3 Inspired HUD** para o sistema **Tormenta20 1.5.015** no Foundry VTT 13.

O módulo mantém a proposta visual cinematográfica da obra original, mas substitui o núcleo de regras do D&D 5e por uma integração nativa com Tormenta20.

## Instalação

No Foundry VTT, abra **Módulos adicionais**, escolha **Instalar módulo** e cole:

```text
https://github.com/CalisteniaStudios/bg3-inspired-hotbar-tormenta20/releases/latest/download/module.json
```

Depois, ative o módulo no mundo que utiliza Tormenta20 1.5.015.

## Recursos

- Retrato com PV, PM, Defesa, nível e testes contra a morte.
- Três atalhos de arma, priorizando as armas equipadas.
- Hotbar com 18 espaços por página e categorias automáticas baseadas nos dados da ficha.
- Filtros para ação, movimento, ação completa, reação, ação livre, magias, poderes e itens.
- Área **Personalizado** para arrastar itens, armas, poderes, magias e macros diretamente da ficha ou do Foundry.
- Atalhos personalizados salvos separadamente para cada ator, com reorganização por arrastar.
- Uso nativo de armas, magias, poderes, consumíveis e equipamentos por `Item.roll()` do Tormenta20.
- Custo de PM, círculo da magia e quantidade exibidos diretamente nos ícones.
- Atributos e perícias em um painel próprio, usando `rollAtributo` e `rollPericia` do sistema.
- Descanso ruim, normal, confortável ou luxuoso pela função nativa `Actor.descanso()`.
- Edição direta de PV e PM: informe um valor exato ou use `+10` e `-5` para alterações relativas.
- Encerrar turno, descanso e ajustes em controles laterais redesenhados.
- Painel de personalização próprio com temas Tormenta, Divino, Arcano e Sombrio, além de cores livres, brilho e ornamentos.
- Opções de escala, opacidade, posição, origem do retrato, nomes nos atalhos e ocultação da hotbar padrão.
- Atalho **H** para mostrar ou ocultar a interface.

## Controles

- **Clique** em um item: usar normalmente, com a janela de configuração do Tormenta20.
- **Shift + clique**: uso rápido, sem a janela de configuração.
- **Botão direito**: abrir a ficha do item ou macro.
- **Arrastar na categoria Personalizado**: adicionar ou reorganizar um atalho.
- **Shift + botão direito no Personalizado**: remover apenas o atalho, sem apagar o item ou macro.
- **Clique no valor de PV ou PM**: editar usando valor exato, `+N` ou `-N`; Enter confirma e Esc cancela.
- **Clique no retrato**: abrir a ficha do ator.
- **Clique no d20**: abrir atributos e perícias.

## Compatibilidade

- Foundry VTT 13, verificado no build 351.
- Tormenta20 1.5.015.
- Não depende de libWrapper, Midi-QOL, D&D 5e ou módulos de pontos de magia.

## Créditos e licença

Este projeto deriva do [BG3 Inspired Hotbar](https://github.com/BragginRites/bg3-inspired-hotbar), criado por BragginRites e Dapoulp e distribuído sob a licença MIT. A adaptação para Tormenta20 é mantida pela Calistenia Studios.

Este projeto é uma criação independente, sem vínculo ou endosso da Jambô Editora, Larian Studios ou dos autores do sistema Tormenta20.
